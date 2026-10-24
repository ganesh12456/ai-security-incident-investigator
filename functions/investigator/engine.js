'use strict';
const {classify}=require('./model');
const hour=3600000;
const labels={credential_access:'Credential access',data_access:'Data access',oauth_abuse:'OAuth consent abuse',benign:'Likely routine activity'};
const actionNames={login_failed:'Failed sign-in',login_success:'Successful sign-in',role_granted:'Privilege change',export_created:'Export created',download_completed:'Download',oauth_consent:'OAuth consent',token_used:'Token use',file_read:'File access',process_alert:'Process alert',approved_change:'Approved change',malware_alert:'Malware detection',other:'Other activity'};
function correlate(seed,events){
  const center=Date.parse(seed.time);
  const candidates=events.filter(e=>{
    if(Math.abs(Date.parse(e.time)-center)>2*hour) return false;
    if(e.id===seed.id) return true;
    return !!((seed.actor&&e.actor&&seed.actor===e.actor)||
      (seed.asset&&e.asset&&seed.asset===e.asset&&seed.ip&&e.ip&&seed.ip===e.ip));
  }).filter(e=>e.id!==seed.id).sort((a,b)=>
    Math.abs(Date.parse(a.time)-center)-Math.abs(Date.parse(b.time)-center)||a.id.localeCompare(b.id)).slice(0,249);
  return [seed,...candidates].sort((a,b)=>a.time.localeCompare(b.time)||a.id.localeCompare(b.id));
}
const finding=(id,title,detail,events,weight,kind='risk')=>({id,title,detail,eventIds:events.map(e=>e.id),weight,kind});
function investigate(seedId,{events}={}){
  if(!Array.isArray(events)||!events.length) throw new Error('Import security records first');
  const seed=events.find(e=>e.id===seedId);if(!seed)return null;
  const related=correlate(seed,events),byAction=action=>related.filter(e=>e.action===action);
  const findings=[],firstLater=(items,after)=>items.find(e=>e.time>=after.time);
  for(const failed of byAction('login_failed')){
    const success=firstLater(byAction('login_success'),failed);
    if(success){findings.push(finding('F-AUTH','Failed sign-in followed by success','A failed authentication event precedes a successful one for the correlated identity.',[failed,success],22));break;}
  }
  const roles=byAction('role_granted'),exports=byAction('export_created'),downloads=byAction('download_completed');
  if(roles.length) findings.push(finding('F-ROLE','Privilege change recorded','The linked records contain a role or permission grant. Check who approved it.',[roles[0]],18));
  if(exports.length){
    const download=firstLater(downloads,exports[0]);
    findings.push(download?finding('F-EXPORT','Export followed by download','An export and a later download are recorded. The destination and intent require review.',[exports[0],download],25):
      finding('F-EXPORT','Export recorded','An export was recorded. These records do not confirm a download.',[exports[0]],12));
  }else if(downloads.length) findings.push(finding('F-DOWNLOAD','Download recorded','A download was recorded. An earlier export is not established by these records.',[downloads[0]],12));
  const oauth=byAction('oauth_consent');
  if(oauth.length) findings.push(finding('F-OAUTH','OAuth consent recorded','Application authorization was observed. Review the scopes and owner intent.',[oauth[0]],18));
  const tokens=byAction('token_used'),reads=byAction('file_read');
  if(tokens.length&&reads.length){const read=firstLater(reads,tokens[0]);if(read) findings.push(finding('F-TOKEN','Token use followed by file access','A token was used before linked file access. External transfer is not established.',[tokens[0],read],18));}
  const malware=byAction('malware_alert'),processes=byAction('process_alert'),approvals=byAction('approved_change');
  if(malware.length) findings.push(finding('F-MALWARE','Malware alert recorded','A security product reported a detection. Validate it before assuming compromise.',[malware[0]],24));
  if(processes.length) findings.push(finding('F-PROCESS','Process alert recorded','An endpoint or process alert was recorded. Review the command and authorization.',[processes[0]],14));
  if(approvals.length) findings.push(finding('F-CHANGE','Approval record present','A related change record exists; verify that its scope and time cover the activity.',[approvals[0]],-8,'context'));
  if(!findings.length) findings.push(finding('F-OBSERVED','Event requires review','No corroborating rule matched. This does not establish that the activity is safe.',[seed],0,'context'));
  const ids=new Set(related.map(e=>e.id));
  if(findings.some(f=>f.eventIds.some(id=>!ids.has(id)))) throw new Error('Evidence integrity check failed');
  const risk=Math.max(0,Math.min(100,10+findings.reduce((n,f)=>n+f.weight,0)));
  const severity=risk>=75?'Critical':risk>=50?'High':risk>=30?'Medium':'Low';
  const categories=classify(related.map(e=>e.action+' '+e.summary).join(' '));
  const cves=[...new Set(related.flatMap(e=>String(e.summary+' '+e.details).match(/CVE-\d{4}-\d{4,}/gi)||[]))];
  return {
    id:'INV-'+seed.id,
    alert:{id:seed.id,title:seed.summary,source:seed.source,actor:seed.actor||'Unknown',asset:seed.asset||'',time:seed.time,signal:seed.summary,baseline:seed.baseline||'Low',scenario:'Imported record'},
    category:{label:labels[categories[0].label],confidence:Number(categories[0].confidence.toFixed(3)),alternatives:categories.slice(1,3)},
    severity,risk,verdict:risk>=50?'Prioritize analyst review':'Review linked evidence',
    findings,timeline:related.map(e=>({eventId:e.id,time:e.time,action:actionNames[e.action]||e.action,summary:e.summary,source:e.source})),evidence:related,
    intelligence:cves.map(cve=>({cve:cve.toUpperCase(),status:'Mentioned in imported records; no external lookup performed'})),
    recommendations:['Verify the event and source system with an authorized analyst.','Preserve the original records and confirm whether this activity was approved.','Review surrounding identity, endpoint, and data access logs before taking action.'],
    limitations:['Only imported records within a two-hour window and matching identity or asset and address were considered.','The classifier score is not a calibrated probability. Rules and CVE mentions do not prove compromise.','No live threat intelligence, SIEM connector, or automated containment is enabled.'],
    evaluatedAt:new Date().toISOString(),engineVersion:'1.0.0'
  };
}
function reportText(result){
  if(!result)throw new Error('Report requires an investigation');
  return ['SIGNALDESK — INCIDENT INVESTIGATION','Case: '+result.id+' | Seed record: '+result.alert.id,
    'Assessed severity: '+result.severity+' | Heuristic score: '+result.risk+'/100',
    'Model category: '+result.category.label+' (uncalibrated score '+Math.round(result.category.confidence*100)+'%)',
    'Evaluated: '+result.evaluatedAt,'','FINDINGS',
    ...result.findings.map(f=>'- '+f.title+': '+f.detail+' [Evidence: '+f.eventIds.join(', ')+']'),'','TIMELINE',
    ...result.timeline.map(t=>'- '+t.time+' | '+t.summary+' ['+t.eventId+']'),'',
    'RECOMMENDED REVIEW — HUMAN APPROVAL REQUIRED',...result.recommendations.map((x,i)=>(i+1)+'. '+x),'','LIMITATIONS',
    ...result.limitations.map(l=>'- '+l)].join('\n');
}
module.exports={correlate,investigate,reportText};
