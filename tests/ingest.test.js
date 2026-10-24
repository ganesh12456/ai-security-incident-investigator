'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseRecords}=require('../functions/investigator/ingest');
test('CSV with quoted commas and timezone is normalized without inventing evidence',()=>{
  const csv='@timestamp,user.name,event.action,message,source.ip\n2026-10-24T04:00:00Z,analyst,login_failed,"Sign-in failed, password rejected",192.0.2.10\n';
  const {events,rejected}=parseRecords(csv,'export.csv');
  assert.equal(events[0].id,'ROW-00001');
  assert.equal(events[0].action,'login_failed');
  assert.equal(events[0].summary,'Sign-in failed, password rejected');
  assert.equal(events[0].raw['source.ip'],'192.0.2.10');
  assert.equal(rejected.length,0);
});
test('ECS JSON and NDJSON accept source fields and report invalid rows',()=>{
  const data=[
    {'@timestamp':'2026-10-24T04:00:00+05:30',user:{name:'analyst'},event:{action:'login_success',id:'src-1'},message:'Successful sign-in'},
    {time:'2026-10-24T04:00:00',actor:'analyst',action:'login_failed'}
  ];
  const json=parseRecords(JSON.stringify({events:data}));
  assert.equal(json.events.length,1);
  assert.equal(json.events[0].originalId,'src-1');
  assert.equal(json.rejected.length,1);
  assert.equal(parseRecords(data.map(x=>JSON.stringify(x)).join('\n'),'log.ndjson').events.length,1);
});
test('unusable data, oversized files and malformed CSV fail clearly',()=>{
  assert.throws(()=>parseRecords('[]'),/non-empty/);
  assert.throws(()=>parseRecords('a,b\n1','events.csv'),/columns/);
  assert.throws(()=>parseRecords('x'.repeat(5*1024*1024+1)),/5 MB/);
});
