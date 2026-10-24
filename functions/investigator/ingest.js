'use strict';
const MAX_BYTES=5*1024*1024,MAX_ROWS=2000;
function value(record,keys){
  for(const key of keys){
    let found=record[key];
    if(found===undefined&&key.includes('.')) found=key.split('.').reduce((item,part)=>item&&item[part],record);
    if(typeof found==='string'&&found.trim()) return found.trim();
    if(typeof found==='number'&&Number.isFinite(found)) return String(found);
  }
  return '';
}
function timestamp(input){
  if(!input)return null;
  if(/^\d{10,13}$/.test(input)){
    const number=Number(input),date=new Date(input.length===10?number*1000:number);
    return Number.isNaN(date.getTime())?null:date.toISOString();
  }
  if(!/(?:Z|[+-]\d\d:?\d\d)$/i.test(input))return null;
  const date=new Date(input);return Number.isNaN(date.getTime())?null:date.toISOString();
}
function actionFor(action,summary){
  const text=(action+' '+summary).toLowerCase();
  if(new Set(['login_failed','login_success','role_granted','export_created','download_completed','oauth_consent','token_used','file_read','malware_alert','process_alert','approved_change','mfa_success']).has(action.toLowerCase()))return action.toLowerCase();
  if(/(?:login|logon|sign.?in|authenticat).*(?:fail|denied|invalid|reject)|(?:fail|denied).*(?:login|logon|sign.?in)/.test(text))return 'login_failed';
  if(/(?:login|logon|sign.?in|authenticat).*(?:success|succeed|accepted|completed)/.test(text))return 'login_success';
  if(/(?:role|privileg|permission).*(?:grant|assign|elevat)/.test(text))return 'role_granted';
  if(/(?:export|extract).*(?:creat|start|generat|complet)/.test(text))return 'export_created';
  if(/download/.test(text))return 'download_completed';
  if(/(?:oauth|consent).*(?:grant|approv|authoriz)/.test(text))return 'oauth_consent';
  if(/(?:token).*(?:use|access|invok)/.test(text))return 'token_used';
  if(/(?:file|document).*(?:read|access|open)/.test(text))return 'file_read';
  if(/(?:malware|virus|ransomware).*(?:detect|alert|block)/.test(text))return 'malware_alert';
  if(/(?:process|command|script).*(?:alert|detect|suspicious)/.test(text))return 'process_alert';
  if(/(?:change|ticket).*(?:approv|authoriz)/.test(text))return 'approved_change';
  if(/mfa.*(?:success|pass)/.test(text))return 'mfa_success';
  return 'other';
}
function csvRows(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(char===','&&!quoted){row.push(field);field='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      if(char==='\r'&&text[i+1]==='\n')i++;
      row.push(field);field='';if(row.some(cell=>cell.trim()))rows.push(row);row=[];
    }else field+=char;
  }
  if(quoted)throw new Error('CSV has an unclosed quoted field');
  row.push(field);if(row.some(cell=>cell.trim()))rows.push(row);
  if(rows.length<2)throw new Error('CSV must have a header and at least one record');
  const headers=rows.shift().map((h,i)=>i===0?h.replace(/^\uFEFF/,'').trim():h.trim());
  if(!headers.every(Boolean)||new Set(headers).size!==headers.length)throw new Error('CSV headers must be unique and non-empty');
  return rows.map((cells,i)=>{
    if(cells.length!==headers.length)throw new Error('CSV row '+(i+2)+' has '+cells.length+' columns; expected '+headers.length);
    return Object.fromEntries(headers.map((key,j)=>[key,cells[j]]));
  });
}
function parseRecords(text,filename='records.json'){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw new Error('File exceeds the 5 MB limit');
  let records;
  if(/\.csv$/i.test(filename))records=csvRows(text);
  else if(/\.(ndjson|jsonl)$/i.test(filename))records=text.split(/\r?\n/).filter(Boolean).map((line,i)=>{try{return JSON.parse(line);}catch{throw new Error('Invalid JSON on line '+(i+1));}});
  else{
    let doc;try{doc=JSON.parse(text);}catch{throw new Error('Invalid JSON file');}
    records=Array.isArray(doc)?doc:Array.isArray(doc?.events)?doc.events:doc?.hits?.hits?.map(hit=>hit._source||hit);
  }
  if(!Array.isArray(records)||!records.length)throw new Error('File must contain a non-empty array of records');
  if(records.length>MAX_ROWS)throw new Error('Import at most '+MAX_ROWS+' records at a time');
  const rejected=[],events=records.flatMap((record,i)=>{
    if(!record||typeof record!=='object'||Array.isArray(record)){rejected.push('Row '+(i+1)+': expected an object');return [];}
    const time=timestamp(value(record,['@timestamp','timestamp','time','event.created','eventTime','created_at','TimeGenerated']));
    const actor=value(record,['user.name','user.email','actor','principal','username','user','account']);
    const asset=value(record,['host.name','asset','device.name','device','resource.name','resource','hostname']);
    const ip=value(record,['source.ip','src_ip','client.ip','ip','ip_address','SourceIP']);
    const action=value(record,['event.action','action','operation','activity','event.type','type']);
    const summary=value(record,['message','summary','description','event.original','details'])||action;
    if(!time||(!actor&&!asset&&!ip)||!summary){rejected.push('Row '+(i+1)+': requires timestamp with timezone, identity/asset/address, and message/action');return [];}
    const source=value(record,['event.provider','data_stream.dataset','source','product','vendor'])||'Imported record';
    const originalId=value(record,['event.id','event_id','eventId','id','_id']);
    const kind=actionFor(action,summary);
    return [{id:'ROW-'+String(i+1).padStart(5,'0'),originalId,time,source,actor,asset,ip,action:kind,
      summary:summary.slice(0,500),details:value(record,['details','event.original','description','message']).slice(0,1500),
      baseline:['malware_alert','role_granted','export_created'].includes(kind)?'High':kind==='other'?'Low':'Medium',raw:record}];
  });
  if(!events.length)throw new Error('No valid records. '+rejected.slice(0,2).join('; '));
  return {events,rejected,total:records.length};
}
module.exports={parseRecords,actionFor,MAX_BYTES,MAX_ROWS};
