'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {investigate,correlate,reportText}=require('../functions/investigator/engine');
const {alerts,events}=require('../functions/investigator/fixtures/scenarios');

test('account compromise investigation cites related evidence in order',()=>{
  const r=investigate('ALT-1001');
  assert.equal(r.severity,'Critical');
  assert.deepEqual(r.timeline.map(t=>t.eventId),['E-106','E-101','E-102','E-103','E-104','E-105']);
  assert.ok(r.findings.some(f=>f.id==='F-EXPORT'));
  assert.ok(r.findings.every(f=>f.eventIds.every(id=>r.evidence.some(e=>e.id===id))));
  assert.ok(!r.evidence.some(e=>e.actor==='arun.shah@northstar.example'));
});
test('approved device change is low severity with mitigation',()=>{
  const r=investigate('ALT-1002');
  assert.equal(r.severity,'Low');
  assert.ok(r.findings.some(f=>f.kind==='mitigation'));
  assert.equal(r.findings.some(f=>f.id==='F-EXPORT'),false);
});
test('OAuth case does not assert transfer without evidence',()=>{
  const r=investigate('ALT-1003');
  assert.ok(r.findings.some(f=>f.id==='F-CONSENT'));
  assert.ok(!reportText(r).includes('external transfer is confirmed'));
});
test('KEV lookup requires an exact CVE and never claims exploitation',()=>{
  const r=investigate('ALT-1005');
  assert.equal(r.intelligence[0].cve,'CVE-2023-23397');
  assert.equal(r.intelligence[0].matched,true);
  assert.ok(r.findings.some(f=>f.id==='F-KEV-CVE-2023-23397'));
  assert.match(reportText(r),/does not prove exploitation/);
});
test('an unrelated event in the same time window stays out of the case',()=>{
  const extra={...events[0],id:'E-999',actor:'outsider@northstar.example',asset:'Other',ip:'192.0.2.99'};
  const related=correlate(alerts[0],[...events,extra]);
  assert.ok(!related.some(e=>e.id==='E-999'));
});
test('a missing seed event fails closed',()=>{
  assert.throws(()=>correlate({...alerts[0],seedEventId:'missing'}),/Seed event missing/);
  assert.equal(investigate('ALT-9999'),null);
});
test('all case reports use existing evidence references',()=>{
  for(const alert of alerts){
    const r=investigate(alert.id);
    const ids=new Set(r.evidence.map(e=>e.id));
    for(const f of r.findings) assert.ok(f.eventIds.every(id=>ids.has(id)));
    assert.ok(reportText(r).includes('HUMAN APPROVAL REQUIRED'));
  }
});
