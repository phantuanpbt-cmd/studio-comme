(function(){
  var DB = "https://comme-studio-default-rtdb.asia-southeast1.firebasedatabase.app";
  var ROWS = [];               // moi phan tu: ban ghi + __key
  var loaded = false, loading = false;
  var sortKey = "edit", sortDir = -1;

  var pad = function(n){ return String(n).padStart(2,"0"); };
  var fmt = function(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
  var todayStr = function(){ return fmt(new Date()); };
  var validDate = function(s){ return typeof s==="string" && /^20\d\d-\d\d-\d\d$/.test(s); };
  var inRange = function(d,a,b){ if(!validDate(d))return false; if(a&&d<a)return false; if(b&&d>b)return false; return true; };
  var esc = function(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); };
  var ddmm = function(iso){ var p=iso.split("-"); return p[2]+"/"+p[1]; };

  var CSS = ""
    + ".cmx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:none}"
    + ".cmx-modal{position:fixed;inset:20px;z-index:99999;background:#0f1115;color:#e6e9ef;border:1px solid #2a2f3a;border-radius:14px;display:none;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;overflow:hidden}"
    + ".cmx-modal *{box-sizing:border-box}"
    + ".cmx-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #2a2f3a;flex-wrap:wrap}"
    + ".cmx-head h2{margin:0;font-size:16px;font-weight:700}"
    + ".cmx-sub{font-size:12px;color:#9aa3b2}"
    + ".cmx-x{background:#1e222b;border:1px solid #2a2f3a;color:#e6e9ef;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:14px}"
    + ".cmx-body{padding:16px 18px;overflow:auto}"
    + ".cmx-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px}"
    + ".cmx-f{display:flex;flex-direction:column;gap:5px}"
    + ".cmx-f label{font-size:12px;color:#9aa3b2}"
    + ".cmx-f input,.cmx-f select{background:#1e222b;border:1px solid #2a2f3a;color:#e6e9ef;border-radius:8px;padding:7px 9px;font-size:13px;color-scheme:dark}"
    + ".cmx-presets{display:flex;gap:6px;flex-wrap:wrap}"
    + ".cmx-presets button,.cmx-btn{background:#1e222b;border:1px solid #2a2f3a;color:#e6e9ef;border-radius:8px;padding:7px 11px;cursor:pointer;font-size:13px}"
    + ".cmx-presets button.active{background:#6ea8fe;color:#0b0d10;border-color:#6ea8fe;font-weight:600}"
    + ".cmx-btn.primary{background:#34d399;color:#06281d;border-color:#34d399;font-weight:700}"
    + ".cmx-btn:disabled{opacity:.4;cursor:not-allowed}"
    + ".cmx-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:14px}"
    + ".cmx-card{background:#1e222b;border:1px solid #2a2f3a;border-radius:10px;padding:12px}"
    + ".cmx-card .l{font-size:12px;color:#9aa3b2}.cmx-card .n{font-size:24px;font-weight:700;margin-top:3px}"
    + ".cmx-card.s .n{color:#f0b429}.cmx-card.e .n{color:#34d399}"
    + ".cmx-table{width:100%;border-collapse:collapse;font-size:13px}"
    + ".cmx-table th,.cmx-table td{padding:9px 12px;text-align:left;border-bottom:1px solid #2a2f3a}"
    + ".cmx-table th{color:#9aa3b2;font-size:12px;cursor:pointer;user-select:none}"
    + ".cmx-table th.n,.cmx-table td.n{text-align:right;font-variant-numeric:tabular-nums}"
    + ".cmx-s{color:#f0b429}.cmx-e{color:#34d399}.cmx-m{color:#9aa3b2}"
    + ".cmx-table tfoot td{font-weight:700;border-top:2px solid #2a2f3a;border-bottom:none}"
    + ".cmx-note{font-size:12px;color:#9aa3b2;margin-top:8px}"
    + ".cmx-seg{display:inline-flex;border:1px solid #2a2f3a;border-radius:8px;overflow:hidden;margin-bottom:14px}"
    + ".cmx-seg button{background:#1e222b;color:#e6e9ef;border:0;padding:8px 14px;cursor:pointer;font-size:13px}"
    + ".cmx-seg button.active{background:#6ea8fe;color:#0b0d10;font-weight:600}"
    + ".cmx-list{border:1px solid #2a2f3a;border-radius:10px;max-height:46vh;overflow:auto}"
    + ".cmx-li{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #20242d;font-size:13px}"
    + ".cmx-li:hover{background:#171a21}"
    + ".cmx-li input[type=checkbox]{width:16px;height:16px}"
    + ".cmx-li .pill{background:#2a2f3a;border-radius:6px;padding:1px 7px;font-size:11px;color:#cdd3df}"
    + ".cmx-li .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"
    + ".cmx-li input[type=date]{background:#1e222b;border:1px solid #2a2f3a;color:#e6e9ef;border-radius:6px;padding:4px 6px;font-size:12px;color-scheme:dark}"
    + ".cmx-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}"
    + ".cmx-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e222b;border:1px solid #34d399;color:#e6e9ef;padding:10px 16px;border-radius:10px;z-index:100000;font-size:13px;display:none}"
    + ".cmx-chart{margin-top:8px;background:#141821;border:1px solid #2a2f3a;border-radius:10px;padding:10px}";

  function el(html){ var d=document.createElement("div"); d.innerHTML=html.trim(); return d.firstChild; }
  function ensureCSS(){ if(document.getElementById("cmx-css"))return; var s=document.createElement("style"); s.id="cmx-css"; s.textContent=CSS; document.head.appendChild(s); }
  function toast(msg){ var t=document.getElementById("cmx-toast"); if(!t){t=el('<div id="cmx-toast" class="cmx-toast"></div>'); document.body.appendChild(t);} t.textContent=msg; t.style.display="block"; clearTimeout(t._h); t._h=setTimeout(function(){t.style.display="none";},3500); }

  // ---------- data ----------
  function loadData(cb){
    loading=true;
    fetch(DB+"/plan.json",{cache:"no-store"}).then(function(r){ if(!r.ok)throw new Error("HTTP "+r.status); return r.json(); })
    .then(function(data){ ROWS=Object.keys(data||{}).map(function(k){ var o=data[k]||{}; o.__key=k; return o; }); loaded=true; loading=false; if(cb)cb(); })
    .catch(function(e){ loading=false; toast("Loi tai du lieu: "+e.message); });
  }
  function patch(key,obj){ return fetch(DB+"/plan/"+key+".json",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)}); }
  var EXCLUDE_KOC = {"Đỗ Công":1}; // KOC da nghi - loai khoi bao cao + dropdown
  function kocList(){ var s={}; ROWS.forEach(function(r){ if(r.koc&&!EXCLUDE_KOC[r.koc])s[r.koc]=1; }); return Object.keys(s).sort(function(a,b){return a.localeCompare(b,"vi");}); }

  // ---------- nhan su (content/editor) ----------
  var CONTENTS = ["Hạnh","Tú Anh","Nhung","Quỳnh"];
  var EDITORS  = ["Huy","Hiệu","Hành","Tài"];
  var KOC_STAFF = {
    "U An":        {content:"Hạnh",   editor:"Huy"},
    "Việt Cường":  {content:"Hạnh",   editor:"Huy"},
    "Kiều Trinh":  {content:"Tú Anh", editor:"Hiệu"},
    "Mai Thùy":    {content:"Tú Anh", editor:"Hiệu"},
    "Thùy Linh":   {content:"Nhung",  editor:"Hành"},
    "Hảo Thỏ":     {content:"Nhung",  editor:"Hành"},
    "Adam":        {content:"Quỳnh",  editor:"Tài"},
    "Eva":         {content:"Quỳnh",  editor:"Tài"},
    "Menly":       {content:"Quỳnh",  editor:"Tài"}
  };
  var STAFF_FROM = "2026-06-01"; // bao cao nhan su tinh tu thang 6 (co cau moi)
  function contentOf(r){ return r.content || (KOC_STAFF[r.koc]||{}).content || null; }
  function editorOf(r){ return r.editor || (KOC_STAFF[r.koc]||{}).editor || null; }

  /* ===================== BAO CAO MODAL ===================== */
  function buildReport(){
    ensureCSS();
    var ov=el('<div id="rpt-ov" class="cmx-overlay"></div>');
    var m=el(''
      +'<div id="rpt-modal" class="cmx-modal">'
      +'<div class="cmx-head"><div><h2>Bao cao san luong KOC</h2><div class="cmx-sub" id="rpt-status">Dang tai...</div></div><button class="cmx-x" id="rpt-x">Dong</button></div>'
      +'<div class="cmx-body">'
      +'<div class="cmx-row">'
      +'<div class="cmx-f"><label>Tu ngay</label><input type="date" id="rpt-from"></div>'
      +'<div class="cmx-f"><label>Den ngay</label><input type="date" id="rpt-to"></div>'
      +'<div class="cmx-f"><label>KOC</label><select id="rpt-koc"><option value="">Tat ca KOC</option></select></div>'
      +'<div class="cmx-f" style="flex:1"><label>Khoang nhanh</label><div class="cmx-presets" id="rpt-presets">'
      +'<button data-p="today">Hom nay</button><button data-p="week">Tuan nay</button><button data-p="month">Thang nay</button><button data-p="last7">7 ngay</button><button data-p="last30">30 ngay</button><button data-p="all">Tat ca</button>'
      +'</div></div>'
      +'<div class="cmx-f"><label>&nbsp;</label><button class="cmx-btn" id="rpt-reload">Tai lai</button></div>'
      +'</div>'
      +'<div class="cmx-cards" id="rpt-cards"></div>'
      +'<div class="cmx-chart" id="rpt-chart"></div>'
      +'<div style="height:12px"></div>'
      +'<table class="cmx-table"><thead><tr>'
      +'<th data-s="koc">KOC</th><th class="n" data-s="shot">Da quay (khoang)</th><th class="n" data-s="edit">Da dung (khoang)</th><th class="n" data-s="mShot">Quay (luy ke thang)</th><th class="n" data-s="mEdit">Dung (luy ke thang)</th>'
      +'</tr></thead><tbody id="rpt-tbody"></tbody><tfoot id="rpt-tfoot"></tfoot></table>'
      +'<div class="cmx-note" id="rpt-range"></div>'
      +'</div></div>');
    document.body.appendChild(ov); document.body.appendChild(m);
    ov.onclick=closeReport; m.querySelector("#rpt-x").onclick=closeReport;
    m.querySelector("#rpt-reload").onclick=function(){ loaded=false; loadData(function(){ initRptKoc(); setPreset("month"); }); };
    m.querySelector("#rpt-presets").addEventListener("click",function(e){ if(e.target.dataset.p) setPreset(e.target.dataset.p); });
    ["rpt-from","rpt-to","rpt-koc"].forEach(function(id){ document.getElementById(id).addEventListener("change",function(){ [].forEach.call(document.querySelectorAll("#rpt-presets button"),function(b){b.classList.remove("active");}); renderReport(); }); });
    [].forEach.call(m.querySelectorAll("th[data-s]"),function(th){ th.addEventListener("click",function(){ var k=th.dataset.s; if(sortKey===k)sortDir*=-1; else{sortKey=k;sortDir=(k==="koc")?1:-1;} renderReport(); }); });
    document.addEventListener("keydown",function(e){ if(e.key==="Escape"){closeReport();closeQE();} });
  }
  function initRptKoc(){ var sel=document.getElementById("rpt-koc"); if(!sel||sel.options.length>1)return; kocList().forEach(function(k){ var o=document.createElement("option"); o.value=k; o.textContent=k; sel.appendChild(o); }); }
  function computeReport(){
    var from=document.getElementById("rpt-from").value, to=document.getElementById("rpt-to").value, kf=document.getElementById("rpt-koc").value;
    var ref=to?new Date(to+"T00:00:00"):new Date();
    var mStart=ref.getFullYear()+"-"+pad(ref.getMonth()+1)+"-01", mEnd=to||todayStr();
    var map={};
    ROWS.forEach(function(r){ var koc=r.koc||"(Khong ro)"; if(EXCLUDE_KOC[koc])return; if(kf&&koc!==kf)return;
      var x=map[koc]||(map[koc]={koc:koc,shot:0,edit:0,mShot:0,mEdit:0});
      if(r.shootStatus==="done"&&inRange(r.shootDate,from,to))x.shot++;
      if(r.editStatus==="done"&&inRange(r.editDate,from,to))x.edit++;
      if(r.shootStatus==="done"&&inRange(r.shootDate,mStart,mEnd))x.mShot++;
      if(r.editStatus==="done"&&inRange(r.editDate,mStart,mEnd))x.mEdit++;
    });
    return {rows:Object.keys(map).map(function(k){return map[k];}),mStart:mStart,mEnd:mEnd,from:from,to:to};
  }
  function renderReport(){
    if(!loaded)return;
    var r=computeReport(), rows=r.rows;
    rows.sort(function(a,b){ return sortKey==="koc"? a.koc.localeCompare(b.koc,"vi")*sortDir : (a[sortKey]-b[sortKey])*sortDir; });
    var t={shot:0,edit:0,mShot:0,mEdit:0}; rows.forEach(function(x){t.shot+=x.shot;t.edit+=x.edit;t.mShot+=x.mShot;t.mEdit+=x.mEdit;});
    var card=function(l,n,c){return '<div class="cmx-card '+c+'"><div class="l">'+l+'</div><div class="n">'+n+'</div></div>';};
    document.getElementById("rpt-cards").innerHTML=card("Tong da quay (khoang)",t.shot,"s")+card("Tong da dung (khoang)",t.edit,"e")+card("Quay luy ke thang",t.mShot,"s")+card("Dung luy ke thang",t.mEdit,"e");
    document.getElementById("rpt-tbody").innerHTML=rows.map(function(x){ return '<tr><td>'+esc(x.koc)+'</td><td class="n cmx-s">'+x.shot+'</td><td class="n cmx-e">'+x.edit+'</td><td class="n cmx-m">'+x.mShot+'</td><td class="n cmx-m">'+x.mEdit+'</td></tr>'; }).join("")||'<tr><td colspan="5" class="cmx-m">Khong co du lieu trong khoang da chon.</td></tr>';
    document.getElementById("rpt-tfoot").innerHTML='<tr><td>TONG</td><td class="n cmx-s">'+t.shot+'</td><td class="n cmx-e">'+t.edit+'</td><td class="n">'+t.mShot+'</td><td class="n">'+t.mEdit+'</td></tr>';
    document.getElementById("rpt-range").textContent="Khoang loc: "+(r.from||"dau")+" -> "+(r.to||"nay")+"  |  Luy ke thang: "+r.mStart+" -> "+r.mEnd;
    renderChart(r.from,r.to,document.getElementById("rpt-koc").value);
  }
  function renderChart(from,to,kf){
    var box=document.getElementById("rpt-chart");
    var f=from||"2026-01-01", tt=to||todayStr();
    // build day buckets
    var days=[]; var d0=new Date(f+"T00:00:00"), d1=new Date(tt+"T00:00:00");
    var spanDays=Math.round((d1-d0)/86400000)+1;
    var weekly=spanDays>45;
    var bucket={};
    function keyOf(iso){ if(!weekly)return iso; var d=new Date(iso+"T00:00:00"); var dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return fmt(d); }
    ROWS.forEach(function(r){ if(EXCLUDE_KOC[r.koc])return; if(kf&&(r.koc||"")!==kf)return;
      if(r.shootStatus==="done"&&inRange(r.shootDate,f,tt)){ var k=keyOf(r.shootDate); (bucket[k]||(bucket[k]={s:0,e:0})).s++; }
      if(r.editStatus==="done"&&inRange(r.editDate,f,tt)){ var k2=keyOf(r.editDate); (bucket[k2]||(bucket[k2]={s:0,e:0})).e++; }
    });
    var keys=Object.keys(bucket).sort();
    if(!keys.length){ box.innerHTML='<div class="cmx-sub">Bieu do: chua co du lieu trong khoang.</div>'; return; }
    var max=1; keys.forEach(function(k){ max=Math.max(max,bucket[k].s,bucket[k].e); });
    var W=Math.max(keys.length*26+40, 320), H=160, padB=24, padL=26, padT=10;
    var bw=Math.min(10,(W-padL-10)/keys.length/2-1);
    var svg='<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" preserveAspectRatio="xMinYMid meet">';
    // gridlines
    [0,0.5,1].forEach(function(g){ var y=padT+(H-padT-padB)*(1-g); svg+='<line x1="'+padL+'" y1="'+y+'" x2="'+W+'" y2="'+y+'" stroke="#2a2f3a" stroke-width="1"/>'; svg+='<text x="2" y="'+(y+3)+'" fill="#9aa3b2" font-size="9">'+Math.round(max*g)+'</text>'; });
    keys.forEach(function(k,i){
      var x=padL+i*((W-padL-10)/keys.length);
      var hs=(H-padT-padB)*(bucket[k].s/max), he=(H-padT-padB)*(bucket[k].e/max);
      svg+='<rect x="'+(x).toFixed(1)+'" y="'+(H-padB-hs).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hs.toFixed(1)+'" fill="#f0b429"><title>'+ddmm(k)+' quay: '+bucket[k].s+'</title></rect>';
      svg+='<rect x="'+(x+bw+1).toFixed(1)+'" y="'+(H-padB-he).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+he.toFixed(1)+'" fill="#34d399"><title>'+ddmm(k)+' dung: '+bucket[k].e+'</title></rect>';
      if(i%Math.ceil(keys.length/12||1)===0) svg+='<text x="'+(x).toFixed(1)+'" y="'+(H-padB+12)+'" fill="#9aa3b2" font-size="8">'+ddmm(k)+'</text>';
    });
    svg+='</svg>';
    box.innerHTML='<div class="cmx-sub" style="margin-bottom:6px"><span class="cmx-s">&#9632; Quay</span> &nbsp; <span class="cmx-e">&#9632; Dung</span> &nbsp; ('+(weekly?"theo tuan":"theo ngay")+')</div>'+svg;
  }
  function setPreset(p){
    var td=new Date(), f=document.getElementById("rpt-from"), tt=document.getElementById("rpt-to");
    var S=function(a,b){f.value=a;tt.value=b;};
    if(p==="today")S(fmt(td),fmt(td));
    else if(p==="week"){var d=new Date(td);var dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);S(fmt(d),fmt(td));}
    else if(p==="month")S(fmt(new Date(td.getFullYear(),td.getMonth(),1)),fmt(td));
    else if(p==="last7"){var d7=new Date(td);d7.setDate(d7.getDate()-6);S(fmt(d7),fmt(td));}
    else if(p==="last30"){var d30=new Date(td);d30.setDate(d30.getDate()-29);S(fmt(d30),fmt(td));}
    else if(p==="all")S("","");
    [].forEach.call(document.querySelectorAll("#rpt-presets button"),function(b){b.classList.toggle("active",b.dataset.p===p);});
    renderReport();
  }
  function openReport(){ if(!document.getElementById("rpt-modal"))buildReport(); document.getElementById("rpt-ov").style.display="block"; document.getElementById("rpt-modal").style.display="flex"; var s=document.getElementById("rpt-status"); if(!loaded){ s.textContent="Dang tai du lieu..."; loadData(function(){ s.textContent="Da tai "+ROWS.length+" ban ghi - "+new Date().toLocaleString("vi-VN"); initRptKoc(); setPreset("month"); }); } else { s.textContent="Da tai "+ROWS.length+" ban ghi"; renderReport(); } }
  function closeReport(){ var o=document.getElementById("rpt-ov"),m=document.getElementById("rpt-modal"); if(o)o.style.display="none"; if(m)m.style.display="none"; }

  /* ===================== NHAP NHANH MODAL ===================== */
  var qeMode="mark";
  function buildQE(){
    var ov=el('<div id="qe-ov" class="cmx-overlay"></div>');
    var m=el(''
      +'<div id="qe-modal" class="cmx-modal">'
      +'<div class="cmx-head"><div><h2>Nhap nhanh san luong</h2><div class="cmx-sub" id="qe-status">Dang tai...</div></div><button class="cmx-x" id="qe-x">Dong</button></div>'
      +'<div class="cmx-body">'
      +'<div class="cmx-seg" id="qe-seg"><button data-m="mark" class="active">Danh dau hoan thanh</button><button data-m="fix">Sua video thieu ngay</button></div>'
      +'<div id="qe-mark">'
      +'<div class="cmx-row">'
      +'<div class="cmx-f"><label>KOC</label><select id="qe-koc"></select></div>'
      +'<div class="cmx-f"><label>Loai</label><select id="qe-type"><option value="edit">Da dung</option><option value="shoot">Da quay</option></select></div>'
      +'<div class="cmx-f"><label>Nguoi thuc hien</label><select id="qe-staff"></select></div>'
      +'<div class="cmx-f"><label>Ngay (bat buoc)</label><input type="date" id="qe-date"></div>'
      +'<div class="cmx-f" style="flex:1"><label>Tim san pham / kich ban</label><input type="text" id="qe-search" placeholder="Loc theo ma SP, kich ban..."></div>'
      +'</div>'
      +'<div class="cmx-sub" id="qe-count" style="margin-bottom:6px"></div>'
      +'<div class="cmx-list" id="qe-list"></div>'
      +'<div class="cmx-bar"><label style="font-size:13px;color:#9aa3b2"><input type="checkbox" id="qe-all"> Chon tat ca dang hien</label>'
      +'<button class="cmx-btn primary" id="qe-save" disabled>Luu</button></div>'
      +'</div>'
      +'<div id="qe-fix" style="display:none">'
      +'<div class="cmx-row"><div class="cmx-f"><label>KOC</label><select id="qe-fkoc"><option value="">Tat ca KOC</option></select></div>'
      +'<div class="cmx-f"><label>Loai</label><select id="qe-ftype"><option value="edit">Da dung thieu ngay</option><option value="shoot">Da quay thieu ngay</option></select></div></div>'
      +'<div class="cmx-sub" id="qe-fcount" style="margin-bottom:6px"></div>'
      +'<div class="cmx-list" id="qe-flist"></div>'
      +'<div class="cmx-bar"><div class="cmx-sub">Dien ngay cho tung dong roi bam Luu.</div><button class="cmx-btn primary" id="qe-fsave">Luu ngay da dien</button></div>'
      +'</div>'
      +'</div></div>');
    document.body.appendChild(ov); document.body.appendChild(m);
    ov.onclick=closeQE; m.querySelector("#qe-x").onclick=closeQE;
    m.querySelector("#qe-seg").addEventListener("click",function(e){ if(!e.target.dataset.m)return; qeMode=e.target.dataset.m; [].forEach.call(m.querySelectorAll("#qe-seg button"),function(b){b.classList.toggle("active",b.dataset.m===qeMode);}); document.getElementById("qe-mark").style.display=qeMode==="mark"?"block":"none"; document.getElementById("qe-fix").style.display=qeMode==="fix"?"block":"none"; if(qeMode==="fix")renderFix(); else renderMark(); });
    ["qe-koc","qe-type","qe-search"].forEach(function(id){ m.querySelector("#"+id).addEventListener("input",renderMark); });
    m.querySelector("#qe-all").addEventListener("change",function(e){ [].forEach.call(document.querySelectorAll("#qe-list input[type=checkbox]"),function(c){c.checked=e.target.checked;}); updateSaveBtn(); });
    m.querySelector("#qe-save").addEventListener("click",saveMarks);
    ["qe-fkoc","qe-ftype"].forEach(function(id){ m.querySelector("#"+id).addEventListener("change",renderFix); });
    m.querySelector("#qe-fsave").addEventListener("click",saveFix);
  }
  function fillKocSelects(){
    var ks=kocList();
    var s1=document.getElementById("qe-koc"); if(s1&&!s1.options.length){ ks.forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=k;s1.appendChild(o);}); }
    var s2=document.getElementById("qe-fkoc"); if(s2&&s2.options.length<=1){ ks.forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=k;s2.appendChild(o);}); }
    var dt=document.getElementById("qe-date"); if(dt&&!dt.value)dt.value=todayStr();
  }
  function markCandidates(){
    var koc=document.getElementById("qe-koc").value, type=document.getElementById("qe-type").value;
    var q=(document.getElementById("qe-search").value||"").toLowerCase().trim();
    var statusField=type==="shoot"?"shootStatus":"editStatus";
    return ROWS.filter(function(r){ if((r.koc||"")!==koc)return false; if(r[statusField]==="done")return false;
      if(q){ var hay=((r.product||"")+" "+(r.productFullName||"")+" "+(r.script||"")+" "+(r.concept||"")).toLowerCase(); if(hay.indexOf(q)<0)return false; }
      return true; });
  }
  var lastStaffKey="";
  function updateStaffSelect(){
    var sel=document.getElementById("qe-staff"); if(!sel)return;
    var type=document.getElementById("qe-type").value, koc=document.getElementById("qe-koc").value;
    var key=koc+"|"+type;
    if(key===lastStaffKey && sel.options.length) return; // giu lua chon khi chi go tim kiem
    lastStaffKey=key;
    var list=type==="shoot"?CONTENTS:EDITORS;
    var def=type==="shoot"?(KOC_STAFF[koc]||{}).content:(KOC_STAFF[koc]||{}).editor;
    sel.innerHTML=list.map(function(n){return '<option'+(n===def?' selected':'')+'>'+esc(n)+'</option>';}).join("");
  }
  function renderMark(){
    if(!loaded)return; fillKocSelects(); updateStaffSelect();
    var list=markCandidates(), type=document.getElementById("qe-type").value;
    document.getElementById("qe-count").textContent=list.length+" video chua "+(type==="shoot"?"quay":"dung")+" (cua KOC nay)";
    document.getElementById("qe-list").innerHTML=list.map(function(r){ return '<label class="cmx-li"><input type="checkbox" value="'+r.__key+'"><span class="pill">'+esc(r.product||"")+'</span><span class="grow">'+esc(r.productFullName||"")+' - '+esc(r.script||"")+' ['+esc(r.concept||"")+']</span></label>'; }).join("")||'<div class="cmx-li cmx-m">Khong con video nao chua '+(type==="shoot"?"quay":"dung")+'.</div>';
    document.getElementById("qe-all").checked=false;
    [].forEach.call(document.querySelectorAll("#qe-list input[type=checkbox]"),function(c){ c.addEventListener("change",updateSaveBtn); });
    updateSaveBtn();
  }
  function selectedKeys(){ return [].slice.call(document.querySelectorAll("#qe-list input[type=checkbox]:checked")).map(function(c){return c.value;}); }
  function updateSaveBtn(){ var n=selectedKeys().length, type=document.getElementById("qe-type").value; var b=document.getElementById("qe-save"); b.disabled=n===0||!document.getElementById("qe-date").value; b.textContent=n?("Luu "+n+" video da "+(type==="shoot"?"quay":"dung")):"Luu"; }
  function saveMarks(){
    var keys=selectedKeys(), type=document.getElementById("qe-type").value, date=document.getElementById("qe-date").value;
    if(!keys.length||!date)return;
    if(!validDate(date)){ toast("Ngay khong hop le"); return; }
    var sf=type==="shoot"?"shootStatus":"editStatus", df=type==="shoot"?"shootDate":"editDate";
    var staff=(document.getElementById("qe-staff")||{}).value||"", stf=type==="shoot"?"content":"editor";
    if(!confirm("Danh dau "+keys.length+" video la "+(type==="shoot"?"DA QUAY":"DA DUNG")+(staff?(" - "+(type==="shoot"?"Content":"Editor")+": "+staff):"")+" ngay "+ddmm(date)+"/"+date.slice(0,4)+"?\\nThao tac ghi truc tiep vao he thong."))return;
    var b=document.getElementById("qe-save"); b.disabled=true; b.textContent="Dang luu...";
    var patches=keys.map(function(k){ var o={}; o[sf]="done"; o[df]=date; if(staff)o[stf]=staff; return patch(k,o); });
    Promise.all(patches).then(function(res){ var ok=res.filter(function(r){return r.ok;}).length;
      // cap nhat ROWS cuc bo
      keys.forEach(function(k){ var r=ROWS.filter(function(x){return x.__key===k;})[0]; if(r){r[sf]="done";r[df]=date;if(staff)r[stf]=staff;} });
      toast("Da luu "+ok+"/"+keys.length+" video.");
      renderMark();
    }).catch(function(e){ toast("Loi ghi: "+e.message); b.disabled=false; });
  }
  function fixCandidates(){
    var koc=document.getElementById("qe-fkoc").value, type=document.getElementById("qe-ftype").value;
    var sf=type==="shoot"?"shootStatus":"editStatus", df=type==="shoot"?"shootDate":"editDate";
    return ROWS.filter(function(r){ if(koc&&(r.koc||"")!==koc)return false; return r[sf]==="done"&&!validDate(r[df]); });
  }
  function renderFix(){
    if(!loaded)return; fillKocSelects();
    var list=fixCandidates(), type=document.getElementById("qe-ftype").value;
    document.getElementById("qe-fcount").textContent=list.length+" video da "+(type==="shoot"?"quay":"dung")+" nhung thieu ngay";
    document.getElementById("qe-flist").innerHTML=list.map(function(r){ return '<div class="cmx-li" data-k="'+r.__key+'"><span class="pill">'+esc(r.koc||"")+'</span><span class="pill">'+esc(r.product||"")+'</span><span class="grow">'+esc(r.productFullName||"")+' - '+esc(r.script||"")+'</span><input type="date" value="'+todayStr()+'"></div>'; }).join("")||'<div class="cmx-li cmx-m">Khong co video thieu ngay.</div>';
  }
  function saveFix(){
    var type=document.getElementById("qe-ftype").value, df=type==="shoot"?"shootDate":"editDate";
    var items=[].slice.call(document.querySelectorAll("#qe-flist .cmx-li[data-k]"));
    var jobs=[]; items.forEach(function(li){ var k=li.getAttribute("data-k"); var v=li.querySelector("input[type=date]").value; if(validDate(v)){ var o={}; o[df]=v; jobs.push({k:k,o:o,v:v}); } });
    if(!jobs.length){ toast("Chua co dong nao co ngay hop le."); return; }
    if(!confirm("Cap nhat ngay cho "+jobs.length+" video?"))return;
    Promise.all(jobs.map(function(j){return patch(j.k,j.o);})).then(function(res){ var ok=res.filter(function(r){return r.ok;}).length;
      jobs.forEach(function(j){ var r=ROWS.filter(function(x){return x.__key===j.k;})[0]; if(r)r[df]=j.v; });
      toast("Da cap nhat ngay cho "+ok+"/"+jobs.length+" video."); renderFix();
    }).catch(function(e){ toast("Loi ghi: "+e.message); });
  }
  function openQE(){ if(!document.getElementById("qe-modal"))buildQE(); document.getElementById("qe-ov").style.display="block"; document.getElementById("qe-modal").style.display="flex"; var s=document.getElementById("qe-status"); if(!loaded){ s.textContent="Dang tai du lieu..."; loadData(function(){ s.textContent="Da tai "+ROWS.length+" ban ghi"; fillKocSelects(); (qeMode==="fix"?renderFix:renderMark)(); }); } else { s.textContent="Da tai "+ROWS.length+" ban ghi"; fillKocSelects(); (qeMode==="fix"?renderFix:renderMark)(); } }
  function closeQE(){ var o=document.getElementById("qe-ov"),m=document.getElementById("qe-modal"); if(o)o.style.display="none"; if(m)m.style.display="none"; }

  /* ===================== BAO CAO NHAN SU MODAL ===================== */
  function buildStaff(){
    var ov=el('<div id="st-ov" class="cmx-overlay"></div>');
    var m=el(''
      +'<div id="st-modal" class="cmx-modal">'
      +'<div class="cmx-head"><div><h2>Bao cao nhan su</h2><div class="cmx-sub" id="st-status">Dang tai...</div></div><button class="cmx-x" id="st-x">Dong</button></div>'
      +'<div class="cmx-body">'
      +'<div class="cmx-row">'
      +'<div class="cmx-f"><label>Tu ngay</label><input type="date" id="st-from"></div>'
      +'<div class="cmx-f"><label>Den ngay</label><input type="date" id="st-to"></div>'
      +'<div class="cmx-f" style="flex:1"><label>Khoang nhanh</label><div class="cmx-presets" id="st-presets">'
      +'<button data-p="today">Hom nay</button><button data-p="week">Tuan nay</button><button data-p="month">Thang nay</button><button data-p="last7">7 ngay</button><button data-p="last30">30 ngay</button></div></div>'
      +'<div class="cmx-f"><label>&nbsp;</label><button class="cmx-btn" id="st-reload">Tai lai</button></div>'
      +'</div>'
      +'<div class="cmx-sub" style="margin-bottom:6px;color:#f0b429;font-weight:700">CONTENT - san luong quay</div>'
      +'<table class="cmx-table"><thead><tr><th>Content</th><th class="n">Quay (khoang)</th><th class="n">Quay (luy ke thang)</th></tr></thead><tbody id="st-content"></tbody><tfoot id="st-cfoot"></tfoot></table>'
      +'<div class="cmx-sub" style="margin:16px 0 6px;color:#34d399;font-weight:700">EDITOR - video hoan thanh (dung)</div>'
      +'<table class="cmx-table"><thead><tr><th>Editor</th><th class="n">Dung (khoang)</th><th class="n">Dung (luy ke thang)</th></tr></thead><tbody id="st-editor"></tbody><tfoot id="st-efoot"></tfoot></table>'
      +'<div class="cmx-note" id="st-range"></div>'
      +'<div class="cmx-note">* Phan cong tinh tu '+STAFF_FROM+' (co cau nhan su moi). Du lieu truoc do khong tinh vao bao cao nhan su.</div>'
      +'</div></div>');
    document.body.appendChild(ov); document.body.appendChild(m);
    ov.onclick=closeStaff; m.querySelector("#st-x").onclick=closeStaff;
    m.querySelector("#st-reload").onclick=function(){ loaded=false; loadData(function(){ stPreset("month"); }); };
    m.querySelector("#st-presets").addEventListener("click",function(e){ if(e.target.dataset.p) stPreset(e.target.dataset.p); });
    ["st-from","st-to"].forEach(function(id){ document.getElementById(id).addEventListener("change",function(){ [].forEach.call(document.querySelectorAll("#st-presets button"),function(b){b.classList.remove("active");}); renderStaff(); }); });
  }
  function clampFrom(d){ return (d&&d<STAFF_FROM)?STAFF_FROM:d; }
  function computeStaff(){
    var from=clampFrom(document.getElementById("st-from").value), to=document.getElementById("st-to").value;
    var ref=to?new Date(to+"T00:00:00"):new Date();
    var mStart=clampFrom(ref.getFullYear()+"-"+pad(ref.getMonth()+1)+"-01"), mEnd=to||todayStr();
    var cMap={}, eMap={};
    CONTENTS.forEach(function(n){cMap[n]={name:n,r:0,m:0};});
    EDITORS.forEach(function(n){eMap[n]={name:n,r:0,m:0};});
    ROWS.forEach(function(r){
      if(r.shootStatus==="done"){ var c=contentOf(r); if(c&&cMap[c]){ if(inRange(r.shootDate,from,to))cMap[c].r++; if(inRange(r.shootDate,mStart,mEnd))cMap[c].m++; } }
      if(r.editStatus==="done"){ var e=editorOf(r); if(e&&eMap[e]){ if(inRange(r.editDate,from,to))eMap[e].r++; if(inRange(r.editDate,mStart,mEnd))eMap[e].m++; } }
    });
    return {content:CONTENTS.map(function(n){return cMap[n];}),editor:EDITORS.map(function(n){return eMap[n];}),from:from,to:to,mStart:mStart,mEnd:mEnd};
  }
  function renderStaff(){
    if(!loaded)return;
    var d=computeStaff();
    var ct={r:0,m:0}; d.content.forEach(function(x){ct.r+=x.r;ct.m+=x.m;});
    var et={r:0,m:0}; d.editor.forEach(function(x){et.r+=x.r;et.m+=x.m;});
    document.getElementById("st-content").innerHTML=d.content.slice().sort(function(a,b){return b.r-a.r;}).map(function(x){return '<tr><td>'+esc(x.name)+'</td><td class="n cmx-s">'+x.r+'</td><td class="n cmx-m">'+x.m+'</td></tr>';}).join("");
    document.getElementById("st-cfoot").innerHTML='<tr><td>TONG</td><td class="n cmx-s">'+ct.r+'</td><td class="n">'+ct.m+'</td></tr>';
    document.getElementById("st-editor").innerHTML=d.editor.slice().sort(function(a,b){return b.r-a.r;}).map(function(x){return '<tr><td>'+esc(x.name)+'</td><td class="n cmx-e">'+x.r+'</td><td class="n cmx-m">'+x.m+'</td></tr>';}).join("");
    document.getElementById("st-efoot").innerHTML='<tr><td>TONG</td><td class="n cmx-e">'+et.r+'</td><td class="n">'+et.m+'</td></tr>';
    document.getElementById("st-range").textContent="Khoang loc: "+(d.from||STAFF_FROM)+" -> "+(d.to||"nay")+"  |  Luy ke thang: "+d.mStart+" -> "+d.mEnd;
  }
  function stPreset(p){
    var td=new Date(), f=document.getElementById("st-from"), tt=document.getElementById("st-to");
    var S=function(a,b){f.value=a;tt.value=b;};
    if(p==="today")S(fmt(td),fmt(td));
    else if(p==="week"){var d=new Date(td);var dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);S(fmt(d),fmt(td));}
    else if(p==="month")S(fmt(new Date(td.getFullYear(),td.getMonth(),1)),fmt(td));
    else if(p==="last7"){var d7=new Date(td);d7.setDate(d7.getDate()-6);S(fmt(d7),fmt(td));}
    else if(p==="last30"){var d30=new Date(td);d30.setDate(d30.getDate()-29);S(fmt(d30),fmt(td));}
    [].forEach.call(document.querySelectorAll("#st-presets button"),function(b){b.classList.toggle("active",b.dataset.p===p);});
    renderStaff();
  }
  function openStaff(){ if(!document.getElementById("st-modal"))buildStaff(); document.getElementById("st-ov").style.display="block"; document.getElementById("st-modal").style.display="flex"; var s=document.getElementById("st-status"); if(!loaded){ s.textContent="Dang tai du lieu..."; loadData(function(){ s.textContent="Da tai "+ROWS.length+" ban ghi"; stPreset("month"); }); } else { s.textContent="Da tai "+ROWS.length+" ban ghi"; stPreset("month"); } }
  function closeStaff(){ var o=document.getElementById("st-ov"),m=document.getElementById("st-modal"); if(o)o.style.display="none"; if(m)m.style.display="none"; }

  /* ===================== LAUNCHER (thanh noi - luon bam duoc) ===================== */
  function buildLauncher(){
    if(document.getElementById("cmx-launcher")||!document.body)return;
    ensureCSS();
    var st=document.createElement("style");
    st.textContent=".cmx-launcher{position:fixed;right:14px;bottom:14px;z-index:99990;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:92vw}"
      +".cmx-launcher button{background:#6ea8fe;color:#0b0d10;border:0;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}"
      +".cmx-launcher button:hover{filter:brightness(1.08)}"
      +".cmx-launcher button.rpt{background:#6ea8fe}.cmx-launcher button.qe{background:#34d399}.cmx-launcher button.st{background:#f0b429}";
    document.head.appendChild(st);
    var bar=document.createElement("div"); bar.id="cmx-launcher"; bar.className="cmx-launcher";
    function mk(cls,label,fn){ var b=document.createElement("button"); b.className=cls; b.textContent=label; b.addEventListener("click",function(e){ e.preventDefault(); e.stopPropagation(); fn(); }); return b; }
    bar.appendChild(mk("rpt","📊 Báo cáo",openReport));
    bar.appendChild(mk("qe","✍️ Nhập nhanh",openQE));
    bar.appendChild(mk("st","👥 Nhân sự",openStaff));
    document.body.appendChild(bar);
  }
  function start(){
    buildLauncher();
    setInterval(function(){ buildLauncher(); },2000); // tu them lai neu bi xoa boi re-render
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start); else start();
})();
