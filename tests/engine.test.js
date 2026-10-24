'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {parseRecords}=require('../functions/investigator/ingest');
const {investigate,reportText}=require('../functions/investigator/engine');
function sample(){
  return parseRecords(JSON.stringify([
    {timestamp:'2026-10-24T04:00:00Z',actor:'account-a',action:'login_failed',message:'Failed sign-in',source:'Identity'},
    {timestamp:'2026-10-24T04:03:00Z',actor:'account-a',action:'login_success',message:'Successful sign-in',source:'Identity'},
    {timestamp:'2026-10-24T04:05:00Z',actor:'account-b',action:'role_granted',message:'Role granted to another account',source:'Admin'},
    {timestamp:'2026-10-24T04:07:00Z',actor:'account-a',action:'role_granted',message:'Role granted',source:'Admin'},
    {timestamp:'2026-10-24T04:10:00Z',actor:'account-a',action:'export_created',message:'Export created',source:'Data'},
    {timestamp:'2026-10-24T04:15:00Z',actor:'account-a',action:'download_completed',message:'Download completed',source:'Data'},
    {timestamp:'2026-10-24T09:00:00Z',actor:'account-a',action:'malware_alert',message:'Malware alert outside window',source:'EDR'}
  ])).events;
}
test('investigation cites actual related rows and excludes other accounts and times',()=>{
  const result=investigate('ROW-00002',{events:sample()});
  assert.equal(result.evidence.length,5);
  assert.equal(result.severity,'Critical');
  assert.deepEqual(result.findings.find(f=>f.id==='F-AUTH').eventIds,['ROW-00001','ROW-00002']);
  assert.deepEqual(result.findings.find(f=>f.id==='F-EXPORT').eventIds,['ROW-00005','ROW-00006']);
  const ids=new Set(result.evidence.map(e=>e.id));
  assert.ok(result.findings.every(f=>f.eventIds.every(id=>ids.has(id))));
  assert.match(reportText(result),/Evidence: ROW-00001, ROW-00002/);
});
test('single unrecognized record stays reviewable without a false compromise finding',()=>{
  const events=parseRecords('[{"timestamp":"2026-10-24T04:00:00Z","asset":"host-a","message":"Service started"}]').events;
  const result=investigate(events[0].id,{events});
  assert.equal(result.findings[0].id,'F-OBSERVED');
  assert.equal(result.severity,'Low');
  assert.equal(investigate('missing',{events}),null);
});
