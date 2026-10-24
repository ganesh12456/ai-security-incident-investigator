(() => {
  'use strict';
  const engine=window.SignalDeskApp;
  const root=document.getElementById('view-root');
  const navCount=document.getElementById('nav-count');
  const state={events:[],selected:null,result:null,activeEvent:null,search:'',filter:'All',file:'',importedAt:'',rejected:[],storage:'local',message:''};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false}).format(new Date(value))+' UTC';
  const severity=label=>'<span class="severity '+esc(label)+'">'+esc(label)+'</span>';
  const title=(name,description)=>{
    document.getElementById('page-title').innerHTML=esc(name)+'<span class="period">.</span>';
    document.getElementById('page-subtitle').textContent=description;
    document.getElementById('breadcrumb-current').textContent=name;
    document.getElementById('nav-alerts').classList.toggle('selected',name==='Record queue');
    document.getElementById('nav-about').classList.toggle('selected',name==='How it works');
  };
  function database(){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.open('signaldesk-records',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('workspace',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function readSaved(){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const request=db.transaction('workspace').objectStore('workspace').get('current');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }
  async function saveSaved(value){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction('workspace','readwrite');
      if(value)transaction.objectStore('workspace').put({id:'current',...value});
      else transaction.objectStore('workspace').delete('current');
      transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);
    });
  }
  function queue(){
    state.selected=null;state.result=null;state.activeEvent=null;
    title('Record queue','Import security logs, investigate a record, and inspect the source evidence.');
    navCount.textContent=state.events.length;
    const visible=state.events.filter(e=>{
      const text=[e.id,e.originalId,e.summary,e.actor,e.asset,e.source].join(' ').toLowerCase();
      return text.includes(state.search.toLowerCase())&&(state.filter==='All'||e.baseline===state.filter);
    });
    const counts=Object.fromEntries(['High','Medium','Low'].map(key=>[key,state.events.filter(e=>e.baseline===key).length]));
    root.innerHTML=`
      <section class="intake">
        <div><span class="eyebrow">DATA INTAKE</span><h2>Import security records</h2>
          <p>CSV, JSON, or NDJSON · up to 5 MB and 2,000 records. Timestamp with timezone plus an identity, asset, or address is required.
          Analysis runs on this device. Imported records are stored in this browser until you clear them.</p></div>
        <label class="primary upload-button">Choose log file<input id="log-file" type="file" accept=".csv,.json,.jsonl,.ndjson,text/csv,application/json" hidden></label>
      </section>
      ${state.message?'<div class="feedback" role="status">'+esc(state.message)+'</div>':''}
      ${state.events.length?`
        <div class="workspace-bar"><span><strong>${esc(state.file)}</strong> · ${state.events.length} accepted records · ${state.rejected.length} rejected · imported ${esc(date(state.importedAt))}</span>
          <button class="outline" data-action="clear" type="button">Clear local records</button></div>
        ${state.rejected.length?'<div class="feedback warning">Rejected rows: '+esc(state.rejected.slice(0,3).join('; '))+(state.rejected.length>3?' …':'')+'</div>':''}
        <section class="metrics" aria-label="Record overview">
          <div class="metric"><div class="metric-label">IMPORTED RECORDS</div><div class="metric-value">${state.events.length}</div></div>
          ${['High','Medium','Low'].map(level=>'<div class="metric"><div class="metric-label">'+level.toUpperCase()+' INITIAL SIGNALS</div><div class="metric-value">'+counts[level]+'</div><div class="metric-note">Heuristic label; review required</div></div>').join('')}
        </section>
        <div class="section-heading"><div><h2>Imported signals</h2><p>Choose any record as the investigation starting point.</p></div><span class="subtle">TIMES IN UTC</span></div>
        <section class="queue-card">
          <div class="toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="alert-search" class="search" type="search" placeholder="Search records, identities, assets…" aria-label="Search records" value="${esc(state.search)}"></label>
            ${['All','High','Medium','Low'].map(level=>'<button type="button" class="filter-button '+(state.filter===level?'active':'')+'" data-filter="'+level+'">'+level+'</button>').join('')}</div>
          <div class="table-wrap"><table><thead><tr><th>RECORD / SOURCE</th><th>INITIAL SIGNAL</th><th>IDENTITY / ASSET</th><th>TIME</th><th></th></tr></thead><tbody>
            ${visible.slice(0,100).map(e=>'<tr class="case-row" data-event-id="'+esc(e.id)+'" tabindex="0"><td><span class="table-title">'+esc(e.summary)+'</span><span class="table-sub">'+esc(e.id)+' · '+esc(e.source)+'</span></td><td>'+severity(e.baseline)+'</td><td>'+esc(e.actor||e.asset||e.ip)+'</td><td>'+esc(date(e.time))+'</td><td class="row-arrow">↗</td></tr>').join('')||'<tr><td colspan="5">No records match this filter.</td></tr>'}
          </tbody></table></div><div class="queue-foot">Showing ${Math.min(visible.length,100)} of ${visible.length} matching records · ${state.storage==='local'?'Saved on this device':'Session only'}</div>
        </section>`:`
        <section class="empty-state"><span class="empty-icon">◇</span><h2>No records imported</h2>
          <p>Export authorized security events from your log source, then upload a CSV, JSON array, JSON <code>{"events":[...]}</code>, or NDJSON file. Nothing is preloaded.</p>
          <p>Recognized fields include <code>@timestamp</code>, <code>event.action</code>, <code>user.name</code>, <code>host.name</code>, <code>source.ip</code>, and <code>message</code>. Use ISO timestamps with a timezone or Unix seconds/milliseconds.</p></section>`}`;
  }
  function detail(event){
    if(!event)return '<p class="detail-summary">Select a timeline item to inspect the imported source record.</p>';
    const pairs=[['Internal row',event.id],['Original ID',event.originalId||'Not supplied'],['Time',date(event.time)],['Source',event.source],['Actor',event.actor||'Not supplied'],['Asset',event.asset||'Not supplied'],['Address',event.ip||'Not supplied'],['Action',event.action]];
    return '<dl class="detail-list">'+pairs.map(([key,val])=>'<dt>'+esc(key)+'</dt><dd>'+esc(val)+'</dd>').join('')+'</dl><div class="subtle raw-label">ORIGINAL IMPORTED RECORD</div><pre class="raw-record">'+esc(JSON.stringify(event.raw,null,2).slice(0,10000))+'</pre>';
  }
  function caseView(){
    const seed=state.events.find(e=>e.id===state.selected),result=state.result;
    if(!seed){queue();return;}
    title('Investigation','Review linked records and verify every conclusion.');
    const selected=state.activeEvent||result?.evidence[0];
    root.innerHTML=`
      <button class="back" data-action="queue" type="button">← Back to record queue</button>
      <section class="case-head"><div class="case-head-top"><div><span class="id">${esc(seed.id)} · ${esc(seed.source)}</span><h2>${esc(seed.summary)}</h2>
        <p>${esc(seed.actor||seed.asset||seed.ip)} · ${esc(date(seed.time))}</p></div>
        <button id="run-investigation" class="primary" type="button">${result?'↻ Re-run investigation':'▶ Run investigation'}</button></div>
        <div class="case-meta"><span>INITIAL SIGNAL <b>${esc(seed.baseline)}</b></span><span>ORIGINAL ID <b>${esc(seed.originalId||'Not supplied')}</b></span><span>IMPORT <b>${esc(state.file)}</b></span></div></section>
      ${result?`
        <section class="metrics" aria-label="Investigation results">
          <div class="metric"><div class="metric-label">ASSESSED SEVERITY</div><div class="metric-value">${esc(result.severity)}</div><div class="metric-note">Heuristic score ${result.risk}/100</div></div>
          <div class="metric"><div class="metric-label">CORRELATED RECORDS</div><div class="metric-value">${result.evidence.length}</div><div class="metric-note">Bounded two-hour window</div></div>
          <div class="metric"><div class="metric-label">EVIDENCE FINDINGS</div><div class="metric-value">${result.findings.length}</div><div class="metric-note">Each links to source rows</div></div>
          <div class="metric"><div class="metric-label">MODEL SUGGESTION</div><div class="metric-value model-label">${esc(result.category.label)}</div><div class="metric-note">Uncalibrated score ${Math.round(result.category.confidence*100)}%</div></div>
        </section>
        <div class="grid"><div>
          <section class="content-card card-pad"><div class="card-top"><h3 class="block-title">Event timeline</h3><span class="subtle">${result.timeline.length} records · UTC</span></div>
            <div class="timeline">${result.timeline.map(item=>'<button type="button" class="timeline-item '+(selected?.id===item.eventId?'selected':'')+'" data-evidence="'+esc(item.eventId)+'"><time>'+esc(date(item.time))+' · '+esc(item.source)+'</time><strong>'+esc(item.action)+'</strong><span>'+esc(item.summary)+' <span class="event-ref">'+esc(item.eventId)+'</span></span></button>').join('')}</div></section>
          <section class="content-card card-pad gap-top"><div class="card-top"><h3 class="block-title">Findings</h3><span class="subtle">SOURCE LINKED</span></div>
            ${result.findings.map(f=>'<article class="finding '+esc(f.kind)+'"><h4><span class="dot"></span>'+esc(f.title)+'</h4><p>'+esc(f.detail)+'</p><div class="evidence-links">'+f.eventIds.map(id=>'<button class="evidence-link" data-evidence="'+esc(id)+'" type="button">'+esc(id)+' ↗</button>').join('')+'</div></article>').join('')}</section>
        </div><div><section class="content-card card-pad"><div class="card-top"><h3 class="block-title">Source evidence</h3><span class="subtle">IMPORTED RECORD</span></div><div id="source-evidence">${detail(selected)}</div></section>
          <section class="content-card card-pad gap-top"><div class="card-top"><h3 class="block-title">Assessment</h3>${severity(result.severity)}</div>
            <div class="score-box"><span class="score-ring">${result.risk}</span><span><strong>${esc(result.verdict)}</strong><p>Heuristic evidence score; analyst review required.</p></span></div>
            <ol class="recommendations">${result.recommendations.map(x=>'<li>'+esc(x)+'</li>').join('')}</ol>
            <p class="notice">CVE text is only a mention. No external intelligence lookup or response action occurs.</p></section>
          <section class="content-card card-pad gap-top"><div class="card-top"><h3 class="block-title">Case report</h3><span class="subtle">${esc(result.id)}</span></div>
            <div class="report-actions"><button class="outline" data-action="export" type="button">↓ Export report</button><button class="outline" data-action="copy" type="button">Copy case ID</button></div>
            <p class="notice">Contains imported event details; handle the download as sensitive data.</p></section></div></div>`:
        '<div class="callout"><span class="callout-icon">◎</span><div><strong>Ready to investigate</strong><p>Correlation, classification, findings, and timeline run when you choose.</p></div></div>'}`;
  }
  function about(){
    title('How it works','An evidence-first workflow for records you are authorized to inspect.');
    root.innerHTML='<div class="about-list">'+[
      ['01','Import records','Select CSV, JSON, or NDJSON. Valid rows are normalized and stored in this browser.'],
      ['02','Pick a seed','Any imported record can start an investigation. Initial labels are heuristic.'],
      ['03','Correlate','Match identity or asset plus address within a two-hour window. Up to 250 linked records are shown.'],
      ['04','Review findings','A small text classifier suggests a category; rules cite specific source rows.'],
      ['05','Export or erase','Download a report and clear local records when finished. No SIEM or paid AI API is connected.']
    ].map(([n,head,description])=>'<article class="about-step"><span class="step-number">'+n+'</span><h3>'+head+'</h3><p>'+description+'</p></article>').join('')+'</div>';
  }
  function exportReport(){
    const text=engine.reportText(state.result);
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=state.result.id+'.txt';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  root.addEventListener('change',async e=>{
    if(e.target.id!=='log-file'||!e.target.files?.length)return;
    const file=e.target.files[0];e.target.value='';
    if(state.events.length&&!confirm('Replace the imported records stored in this browser?'))return;
    try{
      if(file.size>engine.MAX_BYTES)throw new Error('File exceeds the 5 MB limit');
      const parsed=engine.parseRecords(await file.text(),file.name);
      const next={events:parsed.events,file:file.name,rejected:parsed.rejected,importedAt:new Date().toISOString()};
      try{await saveSaved(next);state.storage='local';}
      catch{
        if(state.storage==='local'&&state.events.length)throw new Error('Could not replace stored records. Clear browser space and retry.');
        state.storage='session';
      }
      Object.assign(state,next,{search:'',filter:'All',message:parsed.events.length+' records imported. '+parsed.rejected.length+' rejected.'});
      queue();
    }catch(error){state.message=error.message;queue();}
  });
  root.addEventListener('input',e=>{
    if(e.target.id!=='alert-search')return;
    const position=e.target.selectionStart;state.search=e.target.value;queue();
    const search=document.getElementById('alert-search');search.focus();search.setSelectionRange(position,position);
  });
  root.addEventListener('click',async e=>{
    const target=e.target.closest('[data-event-id],[data-evidence],[data-action],[data-filter]');
    if(!target)return;
    if(target.dataset.eventId){state.selected=target.dataset.eventId;state.result=null;caseView();document.getElementById('main-content').focus();}
    else if(target.dataset.evidence&&state.result){state.activeEvent=state.result.evidence.find(item=>item.id===target.dataset.evidence);caseView();document.getElementById('source-evidence')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
    else if(target.dataset.filter){state.filter=target.dataset.filter;queue();}
    else if(target.dataset.action==='queue')queue();
    else if(target.dataset.action==='export'&&state.result)exportReport();
    else if(target.dataset.action==='copy'&&state.result){await navigator.clipboard?.writeText(state.result.id);target.textContent='Copied';}
    else if(target.dataset.action==='clear'){
      if(!confirm('Delete the imported records from this browser?'))return;
      if(state.storage==='local'){
        try{await saveSaved(null);}catch{state.message='Could not clear browser storage. Check site data settings.';queue();return;}
      }
      Object.assign(state,{events:[],selected:null,result:null,file:'',rejected:[],importedAt:'',message:'Local records cleared.'});queue();
    }
  });
  root.addEventListener('click',e=>{
    if(e.target.id!=='run-investigation')return;
    try{state.result=engine.investigate(state.selected,{events:state.events});state.activeEvent=state.result?.evidence[0];caseView();}
    catch(error){state.message=error.message;queue();}
  });
  root.addEventListener('keydown',e=>{
    if(e.target.matches('tr[data-event-id]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}
  });
  document.getElementById('nav-alerts').addEventListener('click',queue);
  document.getElementById('nav-about').addEventListener('click',about);
  if(!engine){root.innerHTML='<div class="error">The investigation engine did not load. Redeploy the latest Slate build.</div>';return;}
  readSaved().then(saved=>{if(saved?.events?.length)Object.assign(state,saved);queue();})
    .catch(()=>{state.storage='session';queue();});
})();
