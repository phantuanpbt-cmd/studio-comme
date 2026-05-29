#!/usr/bin/env node
/**
 * Tổng hợp sản lượng KOC từ Firebase và gửi thông báo lên Lark.
 *
 * Dùng:
 *   node aggregate.js daily      # tổng kết hôm nay  (+ lũy kế tháng)
 *   node aggregate.js weekly     # tổng kết tuần này (+ lũy kế tháng)
 *   node aggregate.js monthly    # tổng kết cả tháng (ngày 1-2: tháng trước; còn lại: tháng này tới nay)
 *
 * Biến môi trường:
 *   LARK_WEBHOOK   (bắt buộc)  URL webhook của Custom Bot trong nhóm Lark
 *   DB_URL         (tùy chọn)  ghi đè databaseURL Firebase
 *   DRY_RUN=1      (tùy chọn)  chỉ in ra console, không gửi Lark
 *
 * Yêu cầu Node >= 18 (có sẵn fetch).
 */

const DB_URL = process.env.DB_URL ||
  "https://comme-studio-default-rtdb.asia-southeast1.firebasedatabase.app";
const WEBHOOK = process.env.LARK_WEBHOOK || "";
const MODE = (process.argv[2] || "daily").toLowerCase();
const TZ = "Asia/Ho_Chi_Minh";

// ---- tiện ích ngày (theo giờ Việt Nam) ----
function vnParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, weekday: o.weekday, iso: `${o.year}-${o.month}-${o.day}` };
}
const pad = (n) => String(n).padStart(2, "0");
const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const ddmm = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}`; };
function addDaysISO(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}
// thứ Hai của tuần chứa iso (ISO week, Mon=1)
function mondayOfISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = Monday
  return addDaysISO(iso, -dow);
}
const validDate = (s) => typeof s === "string" && /^20\d\d-\d\d-\d\d$/.test(s);

// ---- xác định khoảng theo mode ----
function resolveRange(mode, today) {
  const t = vnParts(today);
  const todayISO = t.iso;
  if (mode === "daily") {
    return { from: todayISO, to: todayISO, title: `📅 Tổng kết NGÀY ${ddmm(todayISO)}/${t.y}` };
  }
  if (mode === "weekly") {
    const mon = mondayOfISO(todayISO);
    return { from: mon, to: todayISO, title: `📆 Tổng kết TUẦN (${ddmm(mon)} → ${ddmm(todayISO)})` };
  }
  if (mode === "monthly") {
    // ngày 1-2 trong tháng => báo cáo tháng vừa kết thúc; còn lại => tháng hiện tại tới nay
    if (t.d <= 2) {
      const prevLastISO = ymd(t.y, t.m, 1); // ngày 1 tháng này
      const lastDayPrev = addDaysISO(prevLastISO, -1); // ngày cuối tháng trước
      const lp = lastDayPrev.split("-");
      const from = ymd(+lp[0], +lp[1], 1);
      return { from, to: lastDayPrev, title: `🗓️ Tổng kết THÁNG ${lp[1]}/${lp[0]}` };
    }
    const from = ymd(t.y, t.m, 1);
    return { from, to: todayISO, title: `🗓️ Tổng kết THÁNG ${pad(t.m)}/${t.y} (tới ${ddmm(todayISO)})` };
  }
  throw new Error("Mode không hợp lệ: " + mode + " (dùng daily|weekly|monthly)");
}

function inRange(d, from, to) {
  return validDate(d) && d >= from && d <= to;
}

async function fetchPlan() {
  const res = await fetch(DB_URL + "/plan.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Firebase HTTP " + res.status);
  const data = await res.json();
  return Object.values(data || {});
}

function aggregate(rows, range, mStart, mEnd) {
  const map = {};
  const get = (k) => (map[k] = map[k] || { koc: k, shot: 0, edit: 0, mShot: 0, mEdit: 0 });
  for (const r of rows) {
    const koc = r.koc || "(Không rõ)";
    const m = get(koc);
    if (r.shootStatus === "done" && inRange(r.shootDate, range.from, range.to)) m.shot++;
    if (r.editStatus === "done" && inRange(r.editDate, range.from, range.to)) m.edit++;
    if (r.shootStatus === "done" && inRange(r.shootDate, mStart, mEnd)) m.mShot++;
    if (r.editStatus === "done" && inRange(r.editDate, mStart, mEnd)) m.mEdit++;
  }
  return Object.values(map).sort((a, b) => (b.edit - a.edit) || (b.shot - a.shot));
}

function buildContent(mode, range, list, mLabel) {
  const tot = list.reduce((t, r) => ({
    shot: t.shot + r.shot, edit: t.edit + r.edit, mShot: t.mShot + r.mShot, mEdit: t.mEdit + r.mEdit,
  }), { shot: 0, edit: 0, mShot: 0, mEdit: 0 });

  const lines = [];
  for (const r of list) {
    if (mode === "monthly") {
      lines.push(`• **${r.koc}**: 🎬 ${r.shot} quay · ✅ ${r.edit} dựng`);
    } else {
      lines.push(`• **${r.koc}**: 🎬 ${r.shot} quay / ✅ ${r.edit} dựng (lũy kế tháng: ${r.mShot} quay / ${r.mEdit} dựng)`);
    }
  }
  let content = lines.join("\n");
  content += `\n\n**TỔNG**: 🎬 ${tot.shot} quay · ✅ ${tot.edit} dựng`;
  if (mode !== "monthly") {
    content += `\n**Lũy kế ${mLabel}**: 🎬 ${tot.mShot} quay · ✅ ${tot.mEdit} dựng`;
  }
  return { content, tot };
}

function buildCard(title, content) {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: { template: "blue", title: { tag: "plain_text", content: title } },
      elements: [
        { tag: "div", text: { tag: "lark_md", content } },
        { tag: "hr" },
        { tag: "note", elements: [{ tag: "lark_md", content: `Nguồn: Comme Studio Rotation Planner · cập nhật ${new Date().toLocaleString("vi-VN", { timeZone: TZ })}` }] },
      ],
    },
  };
}

async function sendLark(payload) {
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error("Lark HTTP " + res.status + " " + txt);
  let j; try { j = JSON.parse(txt); } catch { j = {}; }
  if (j.code && j.code !== 0) throw new Error("Lark lỗi: " + txt);
  return txt;
}

(async () => {
  const now = new Date();
  const t = vnParts(now);
  const range = resolveRange(MODE, now);
  const mStart = ymd(t.y, t.m, 1);
  const mEnd = t.iso;
  const mLabel = `tháng ${pad(t.m)}/${t.y}`;

  const rows = await fetchPlan();
  const list = aggregate(rows, range, mStart, mEnd);
  const { content } = buildContent(MODE, range, list, mLabel);
  const card = buildCard(range.title, content);

  console.log("=== " + range.title + " ===");
  console.log(content);

  if (process.env.DRY_RUN === "1") { console.log("\n[DRY_RUN] Không gửi Lark."); return; }
  if (!WEBHOOK) throw new Error("Thiếu biến môi trường LARK_WEBHOOK");
  const r = await sendLark(card);
  console.log("\nĐã gửi Lark:", r);
})().catch((e) => { console.error("LỖI:", e.message); process.exit(1); });
