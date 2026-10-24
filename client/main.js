(() => {
  'use strict';
  const base=location.hostname==='localhost'||location.hostname==='127.0.0.1'?'':'/server/investigator';
  const root=document.getElementById('view-root');
  const title=document.getElementById('page-title');
  const subtitle=document.getElementById('page-subtitle');
  const crumb=document.getElementById('breadcrumb-current');
  const navAlerts=document.getElementById('nav-alerts');
  const navAbout=document.getElementById('nav-about');
  const state={alerts:[],selected:null,result:null,activeEvent:null,search:'',filter:'All'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timestamp=value=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC',hour12:false}).format(new Date(value))+' UTC';
  async function api(path, options){
    // Slate serves the same synthetic investigation engine in the browser.
    // Catalyst Web Client Hosting continues to call its Advanced I/O function.
    if(window.SignalDeskDemo) return window.SignalDeskDemo.api(path,options);
    const response=await fetch(base+path,options);
    let data;
    try{data=await response.json();}catch{throw new Error('The API returned an unreadable response.');}
    if(!response.ok) throw new Error(data.error||'The request failed.');
    return data;
  }
  function setHead(current,description){
    title.innerHTML=esc(current)+'<span class="period">.</span>';
    subtitle.textContent=description;
    crumb.textContent=current;
    navAlerts.classList.toggle('selected',current==='Alert queue');
    navAbout.classList.toggle('selected',current==='How it works');
  }
  function severity(label){return '<span class="severity '+esc(label)+'">'+esc(label)+'</span>';}
  function error(message){root.innerHTML='<div class="error">'+esc(message)+' <button type="button" class="link-button" data-action="queue">Back to alerts</button></div>';}
  function queue(){
    state.selected=null;state.result=null;state.activeEvent=null;
    setHead('Alert queue','Turn scattered signals into a case you can verify.');
    const visible=state.alerts.filter(alert=>{
      const text=[alert.id,alert.title,alert.actor,alert.source].join(' ').toLowerCase();
      return text.includes(state.search.toLowerCase())&&(state.filter==='All'||state.filter===alert.baseline);
    });
    const counts={High:state.alerts.filter(a=>a.baseline==='High').length,Medium:state.alerts.filter(a=>a.baseline==='Medium').length,Low:state.alerts.filter(a=>a.baseline==='Low').length};
    root.innerHTML=`
      <section class="metrics" aria-label="Queue metrics">
        <div class="metric"><div class="metric-label">TOTAL ALERTS <span class="metric-icon">◫</span></div><div class="metric-value">${state.alerts.length.toString().padStart(2,'0')}</div><div class="metric-note">In this synthetic workspace</div></div>
        <div class="metric"><div class="metric-label">HIGH PRIORITY <span class="metric-icon">↗</span></div><div class="metric-value">${String(counts.High).padStart(2,'0')}</div><div class="metric-note">Awaiting review</div></div>
        <div class="metric"><div class="metric-label">MEDIUM PRIORITY <span class="metric-icon">◇</span></div><div class="metric-value">${String(counts.Medium).padStart(2,'0')}</div><div class="metric-note">Needs investigation</div></div>
        <div class="metric"><div class="metric-label">SCENARIOS <span class="metric-icon">◎</span></div><div class="metric-value">${String(state.alerts.length).padStart(2,'0')}</div><div class="metric-note">Synthetic cases to explore</div></div>
      </section>
      <div class="section-heading"><div><h2>Active signals</h2><p>Review the evidence behind each alert.</p></div><span class="subtle">OCTOBER 22, 2026 · UTC</span></div>
      <section class="queue-card" aria-label="Alert queue">
        <div class="toolbar">
          <label class="search-wrap"><span aria-hidden="true">⌕</span><input class="search" type="search" id="alert-search" placeholder="Search alerts, accounts, sources…" aria-label="Search alerts" value="${esc(state.search)}"></label>
          ${['All','High','Medium','Low'].map(item=>'<button class="filter-button '+(state.filter===item?'active':'')+'" data-filter="'+item+'" type="button">'+item+'</button>').join('')}
        </div>
        <div class="table-wrap"><table><thead><tr><th>ALERT / SIGNAL</th><th>PRIORITY</th><th>ACCOUNT</th><th>DETECTED</th><th></th></tr></thead>
          <tbody>${visible.length?visible.map(alert=>`<tr class="case-row" data-alert="${esc(alert.id)}" tabindex="0" aria-label="Open ${esc(alert.title)}">
            <td><span class="table-title">${esc(alert.title)}</span><span class="table-sub">${esc(alert.id)} · ${esc(alert.source)}</span></td><td>${severity(alert.baseline)}</td>
            <td>${esc(alert.actor)}</td><td>${esc(timestamp(alert.time))}</td><td class="row-arrow">↗</td></tr>`).join(''):'<tr><td colspan="5">No alerts match this filter.</td></tr>'}</tbody></table></div>
        <div class="queue-foot"><span>Showing ${visible.length} of ${state.alerts.length} synthetic alerts</span><span>Click any alert to investigate ↗</span></div>
      </section>
      <div class="callout"><span class="callout-icon">◇</span><div><strong>See the full investigation flow</strong><p>Trace an unfamiliar sign-in through a privilege change and a data export, with each finding linked to original evidence.</p></div><a href="#" data-alert="ALT-1001">Explore case →</a></div>`;
    document.getElementById('alert-search').addEventListener('input',e=>{
      const position=e.target.selectionStart;state.search=e.target.value;queue();
      const search=document.getElementById('alert-search');search.focus();search.setSelectionRange(position,position);
    });
  }
  function eventDetail(event){
    if(!event)return '<p class="detail-summary">Run an investigation, then select a timeline item or an evidence reference to inspect its source event.</p>';
    return '<div class="subtle">SOURCE EVENT · '+esc(event.id)+'</div><p class="detail-summary">'+esc(event.summary)+'</p><dl class="detail-list">'+
      [['Time',timestamp(event.time)],['Source',event.source],['Actor',event.actor],['Asset',event.asset],['Action',event.action],['Sample IP',event.ip],['Raw detail',event.details]]
      .map(([key,value])=>'<dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd>').join('')+'</dl>';
  }
  function caseView(){
    const alert=state.selected,result=state.result;
    if(!alert) return queue();
    setHead('Investigation','Follow the chain of evidence. Confirm before you act.');
    const selected=state.activeEvent||result?.evidence[0];
    root.innerHTML=`
      <button class="back" type="button" data-action="queue">← Back to alert queue</button>
      <section class="case-head">
        <div class="case-head-top"><div><span class="id">${esc(alert.id)} / ${esc(alert.scenario).toUpperCase()}</span><h2>${esc(alert.title)}</h2><p>${esc(alert.signal)}</p></div>
          <button type="button" id="run-investigation" class="primary">${result?'↻ Re-run investigation':'▶ Run investigation'}</button></div>
        <div class="case-meta"><span>INITIAL PRIORITY <b>${esc(alert.baseline)}</b></span><span>ACCOUNT <b>${esc(alert.actor)}</b></span><span>DETECTED <b>${esc(timestamp(alert.time))}</b></span></div>
      </section>
      ${result?`
      <section class="metrics" aria-label="Investigation results">
        <div class="metric"><div class="metric-label">ASSESSED SEVERITY <span class="metric-icon">◇</span></div><div class="metric-value">${esc(result.severity)}</div><div class="metric-note">Evidence score ${esc(result.risk)} / 100</div></div>
        <div class="metric"><div class="metric-label">CORRELATED EVENTS <span class="metric-icon">⌁</span></div><div class="metric-value">${String(result.evidence.length).padStart(2,'0')}</div><div class="metric-note">Within a bounded time window</div></div>
        <div class="metric"><div class="metric-label">EVIDENCE FINDINGS <span class="metric-icon">◫</span></div><div class="metric-value">${String(result.findings.length).padStart(2,'0')}</div><div class="metric-note">Each linked to a source event</div></div>
        <div class="metric"><div class="metric-label">MODEL SUGGESTION <span class="metric-icon">✧</span></div><div class="metric-value" style="font-size:16px;margin-top:21px">${esc(result.category.label)}</div><div class="metric-note">Uncalibrated score: ${Math.round(result.category.confidence*100)}%</div></div>
      </section>
      <div class="grid">
        <div><section class="content-card card-pad"><div class="card-top"><h3 class="block-title">Attack timeline</h3><span class="subtle">${result.timeline.length} events · UTC</span></div>
          <div class="timeline">${result.timeline.map(item=>`<button type="button" class="timeline-item ${selected?.id===item.eventId?'selected':''}" data-event="${esc(item.eventId)}"><time>${esc(timestamp(item.time))} · ${esc(item.source)}</time><strong>${esc(item.action)}</strong><span>${esc(item.summary)} <span class="event-ref">${esc(item.eventId)}</span></span></button>`).join('')}</div></section>
          <section class="content-card card-pad" style="margin-top:17px"><div class="card-top"><h3 class="block-title">Investigation findings</h3><span class="subtle">Evidence-backed</span></div>
            ${result.findings.map(f=>`<article class="finding ${esc(f.kind)}"><h4><span class="dot"></span>${esc(f.title)}</h4><p>${esc(f.detail)}</p><div class="evidence-links">${f.eventIds.map(id=>'<button class="evidence-link" type="button" data-event="'+esc(id)+'">'+esc(id)+' ↗</button>').join('')}</div></article>`).join('')}
          </section></div>
        <div><section class="content-card card-pad"><div class="card-top"><h3 class="block-title">Source evidence</h3><span class="subtle">VERIFIABLE RECORD</span></div><div id="source-evidence">${eventDetail(selected)}</div></section>
          <section class="content-card card-pad" style="margin-top:17px"><div class="card-top"><h3 class="block-title">Assessment</h3>${severity(result.severity)}</div>
            <div class="score-box"><span class="score-ring">${esc(result.risk)}</span><span><strong>${esc(result.verdict)}</strong><p>Rule-based score from the evidence shown. Requires analyst confirmation.</p></span></div>
            <div class="subtle" style="margin-bottom:10px">RECOMMENDED NEXT STEPS</div><ol class="recommendations">${result.recommendations.map(x=>'<li>'+esc(x)+'</li>').join('')}</ol><p class="notice">No accounts are disabled and no external actions are taken. This workspace contains synthetic data.</p>
          </section>
          <section class="content-card card-pad" style="margin-top:17px"><div class="card-top"><h3 class="block-title">Case report</h3><span class="subtle">${esc(result.id)}</span></div>
            <div class="report-actions"><button class="outline" type="button" data-action="export">↓ Export report</button><button class="outline" type="button" data-action="copy">Copy case ID</button></div>
            <p class="notice">Model output is a suggestion. No live threat feed or production telemetry is connected.</p>
          </section></div>
      </div>`:`
      <div class="callout"><span class="callout-icon">◎</span><div><strong>Ready to investigate this signal</strong><p>The engine will correlate identity, admin, and data events; score supported findings; and assemble a traceable report.</p></div></div>`}
    `;
    document.getElementById('run-investigation').addEventListener('click',run);
  }
  async function run(){
    const button=document.getElementById('run-investigation');
    button.disabled=true;button.textContent='Investigating…';
    try{
      state.result=await api('/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alertId:state.selected.id})});
      state.activeEvent=state.result.evidence[0];
      caseView();
    }catch(e){button.disabled=false;button.textContent='▶ Run investigation';error(e.message);}
  }
  function about(){
    setHead('How it works','A bounded workflow designed to keep every claim auditable.');
    root.innerHTML='<div class="about-list">'+[
      ['01','Select an alert','Choose a synthetic alert in the queue. The starting event anchors the investigation.'],
      ['02','Correlate events','The coordinator searches a two-hour window and follows shared account, asset, and address links.'],
      ['03','Review model and rules','A small trained text classifier suggests a category; explicit evidence rules assess severity. Model scores are not probabilities of compromise.'],
      ['04','Inspect every claim','Timeline events and findings link to raw source records. Missing evidence blocks a finding.'],
      ['05','Make the final call','The report lists uncertainty and possible next steps. A human analyst decides whether to act.'],
      ['06','Reproduce the results','The sample data, model examples, tests, and benchmark script are included with the project.']
    ].map(([n,head,description])=>'<article class="about-step"><span class="step-number">'+n+'</span><h3>'+head+'</h3><p>'+description+'</p></article>').join('')+'</div><div class="callout"><span class="callout-icon">◫</span><div><strong>Start with a real investigation flow</strong><p>Follow an alert from the queue to a report with cited evidence.</p></div><a href="#" data-alert="ALT-1001">Open case →</a></div>';
  }
  root.addEventListener('click',e=>{
    const target=e.target.closest('[data-alert],[data-action],[data-event],[data-filter]');
    if(!target)return;
    if(target.tagName==='A')e.preventDefault();
    if(target.dataset.alert){
      state.selected=state.alerts.find(a=>a.id===target.dataset.alert);
      state.result=null;state.activeEvent=null;caseView();document.getElementById('main-content').focus();
    }else if(target.dataset.event&&state.result){
      state.activeEvent=state.result.evidence.find(event=>event.id===target.dataset.event);
      caseView();document.getElementById('source-evidence')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }else if(target.dataset.filter){state.filter=target.dataset.filter;queue();}
    else if(target.dataset.action==='queue'){queue();}
    else if(target.dataset.action==='export'&&state.result){
      if(window.SignalDeskDemo){
        const report=window.SignalDeskDemo.reportText(state.result);
        const url=URL.createObjectURL(new Blob([report],{type:'text/plain;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download=state.result.id+'.txt';link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else location.href=base+'/api/investigations/'+encodeURIComponent(state.result.id)+'/report';
    }
    else if(target.dataset.action==='copy'&&state.result){navigator.clipboard?.writeText(state.result.id);target.textContent='Copied';}
  });
  root.addEventListener('keydown',e=>{
    const row=e.target.closest('tr[data-alert]');
    if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();row.click();}
  });
  navAlerts.addEventListener('click',queue);
  navAbout.addEventListener('click',about);
  api('/api/alerts').then(data=>{state.alerts=data.alerts;document.getElementById('nav-count').textContent=data.count;queue();})
    .catch(e=>error('Could not load alerts: '+e.message));
})();
