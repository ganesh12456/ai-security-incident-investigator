'use strict';
const {classify}=require('./model');
const {alerts:defaultAlerts,events:defaultEvents}=require('./fixtures/scenarios');
const kev=require('./fixtures/kev-snapshot.json');

const hour=3600000;
const displayNames={login_failed:'Failed sign-in',login_success:'Successful sign-in',role_granted:'Privilege change',export_created:'Data export',download_completed:'Export download',mfa_success:'MFA success',device_enrolled:'Device enrollment',oauth_consent:'OAuth consent',token_used:'Token use',file_read:'File access',process_alert:'Process alert',approved_change:'Approved change',exploit_alert:'Mail rule alert',mail_open:'Message opened'};
const formatCategory={credential_access:'Credential access',data_access:'Data access',oauth_abuse:'OAuth consent abuse',benign:'Likely benign'};

function correlate(alert, events=defaultEvents){
  const seed=events.find(e=>e.id===alert.seedEventId);
  if(!seed) throw new Error('Seed event missing');
  const center=new Date(alert.time).getTime();
  // Restrict scope before graph expansion, preventing cross-case leakage.
  const candidates=events.filter(e=>Math.abs(new Date(e.time).getTime()-center)<=2*hour);
  const selected=new Map([[seed.id,seed]]);
  for(let pass=0;pass<2;pass++){
    for(const event of candidates){
      if(selected.has(event.id)) continue;
      if([...selected.values()].some(link=>link.actor===event.actor ||
        (link.asset===event.asset && link.ip===event.ip))) selected.set(event.id,event);
    }
  }
  return [...selected.values()].sort((a,b)=>a.time.localeCompare(b.time));
}
function finding(id,title,detail,eventIds,weight,kind='risk'){
  return {id,title,detail,eventIds,weight,kind};
}
function investigate(id, {alerts=defaultAlerts,events=defaultEvents}={}){
  const alert=alerts.find(a=>a.id===id);
  if(!alert) return null;
  const related=correlate(alert,events);
  const byAction=(action)=>related.filter(e=>e.action===action);
  const findings=[];
  const failures=byAction('login_failed'), signins=byAction('login_success');
  const unusual=signins.filter(e=>e.newDevice);
  const roles=byAction('role_granted'),exports=byAction('export_created');
  const downloads=byAction('download_completed');
  const oauth=byAction('oauth_consent'),tokens=byAction('token_used');
  const reads=byAction('file_read'),mfa=byAction('mfa_success');
  const enrollment=byAction('device_enrolled'),changes=byAction('approved_change');
  if(failures.length && unusual.length)
    findings.push(finding('F-LOGIN','Failed attempts preceded a new session','Authentication failed before a successful sign-in from the same sample address.',[failures[0].id,unusual[0].id],24));
  else if(unusual.length)
    findings.push(finding('F-DEVICE','New device observed','The account used a newly observed device; this alone does not establish compromise.',[unusual[0].id],7));
  if(roles.length) findings.push(finding('F-ROLE','Privilege was increased','An export role was granted after the sign-in.',[roles[0].id],20));
  if(exports.length && downloads.length) findings.push(finding('F-EXPORT','Export was created and downloaded','The records show a large export and a completed download; activity after download is unknown.',[exports[0].id,downloads[0].id],29));
  else if(exports.length) findings.push(finding('F-EXPORT','Export was created','An export was created; no download is established by these events.',[exports[0].id],15));
  if(oauth.length) findings.push(finding('F-CONSENT','Broad access was granted','A new app received read scopes. The record does not establish whether the user intended this grant.',[oauth[0].id],23));
  if(tokens.length && reads.length) findings.push(finding('F-TOKEN','Token accessed files','A token was used from another sample address and subsequently read files. External transfer is not evidenced.',[tokens[0].id,reads[0].id],22));
  if(enrollment.length && mfa.length) findings.push(finding('F-ENROLL','Device change was approved','The help-desk record and MFA success support an authorized device change.',[enrollment[0].id,mfa[0].id],-17,'mitigation'));
  if(changes.length) findings.push(finding('F-CHANGE','Activity matches an approved change','A change record supports the scheduled build task.',[changes[0].id,...byAction('process_alert').map(e=>e.id)],-15,'mitigation'));
  const mailAlerts=byAction('exploit_alert'),mailOpens=byAction('mail_open');
  if(mailAlerts.length) findings.push(finding('F-MAIL','Mail detection rule triggered','The message matched a rule. The record does not establish whether the referenced vulnerability was exploited.',[mailAlerts[0].id,...mailOpens.map(e=>e.id)],19));
  const cves=[...new Set(related.flatMap(e=>e.cves||[]))];
  const intelligence=cves.map(cve=>{
    const match=kev.vulnerabilities.find(v=>v.cveID===cve);
    return {cve,matched:!!match,name:match?.vulnerabilityName||null,source:kev.source,snapshotDate:kev.snapshotDate};
  });
  for(const hit of intelligence.filter(x=>x.matched)){
    const supporting=related.filter(e=>(e.cves||[]).includes(hit.cve)).map(e=>e.id);
    findings.push(finding('F-KEV-'+hit.cve,'CVE appears in the KEV snapshot','The catalog lists this CVE; the event alone does not prove exploitation.',supporting,8));
  }
  const categories=classify(alert.signal+' '+related.map(e=>e.summary).join(' '));
  const risk=Math.max(0,Math.min(100,18+findings.reduce((n,f)=>n+f.weight,0)));
  const severity=risk>=75?'Critical':risk>=50?'High':risk>=30?'Medium':'Low';
  const verdict=risk>=50?'Needs urgent analyst review':risk>=30?'Investigate further':'Likely expected activity';
  const evidenceIds=new Set(related.map(e=>e.id));
  for(const item of findings) if(!item.eventIds.length||item.eventIds.some(e=>!evidenceIds.has(e)))
    throw new Error('Evidence integrity check failed');
  const actions=risk>=50?[
    'Confirm the account owner and preserve identity and data-audit logs.',
    'Review active sessions and privileges with an authorized responder.',
    'Assess the exported or accessed data before considering containment.'
  ]:risk>=30?[
    'Confirm whether the activity was approved by the account owner.',
    'Review application permissions and follow-on activity.'
  ]:[
    'Confirm the linked approval record with the responsible team.',
    'Close as expected activity only after analyst review.'
  ];
  const timeline=related.map(event=>({eventId:event.id,time:event.time,action:displayNames[event.action]||event.action,summary:event.summary,source:event.source}));
  return {
    id:'INV-'+alert.id,alert,category:{label:formatCategory[categories[0].label],confidence:Number(categories[0].confidence.toFixed(3)),alternatives:categories.slice(1,3)},
    severity,risk,verdict,findings,timeline,evidence:related,intelligence,
    recommendations:actions,limitations:[
      'This is a synthetic demonstration. Model confidence is not a calibrated probability of compromise.',
      'Correlation shows related records; it does not prove intent or activity outside these records.'
    ],
    evaluatedAt:'2026-10-23T00:00:00Z',engineVersion:'0.1.0'
  };
}
function reportText(result){
  if(!result) throw new Error('Report requires an investigation');
  return [
    'AI SECURITY INCIDENT INVESTIGATOR — SYNTHETIC DEMO',
    'Case: '+result.id+' | Alert: '+result.alert.id,
    'Verdict: '+result.verdict+' | Severity: '+result.severity+' | Score: '+result.risk+'/100',
    'Model suggestion: '+result.category.label+' ('+Math.round(result.category.confidence*100)+'% score; not calibrated)',
    '',
    'FINDINGS',
    ...result.findings.map(f=>'- '+f.title+': '+f.detail+' [Evidence: '+f.eventIds.join(', ')+']'),
    '',
    'TIMELINE',
    ...result.timeline.map(t=>'- '+t.time+' | '+t.summary+' ['+t.eventId+']'),
    '',
    'SUGGESTED RESPONSE — HUMAN APPROVAL REQUIRED',
    ...result.recommendations.map((action,n)=>(n+1)+'. '+action),
    '',
    'LIMITATIONS',
    ...result.limitations.map(l=>'- '+l)
  ].join('\n');
}
module.exports={correlate,investigate,reportText};
