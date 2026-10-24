'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {investigate,reportText}=require('../functions/investigator/engine');

test('Slate build runs the same synthetic investigations in the browser',async()=>{
  const root=path.resolve(__dirname,'..');
  execFileSync(process.execPath,['scripts/build-slate.js'],{cwd:root});
  const dist=path.join(root,'dist');
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
  assert.match(html,/investigator\.browser\.js/);
  assert.ok(fs.existsSync(path.join(dist,'main.css')));
  assert.ok(fs.existsSync(path.join(dist,'main.js')));
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(dist,'investigator.browser.js'),'utf8'),context);
  const demo=context.window.SignalDeskDemo;
  const queue=await demo.api('/api/alerts');
  assert.equal(queue.count,5);
  assert.equal(queue.alerts[0].seedEventId,undefined);
  for(const alert of queue.alerts){
    const result=await demo.api('/api/investigations',{method:'POST',body:JSON.stringify({alertId:alert.id})});
    assert.equal(JSON.stringify(result),JSON.stringify(investigate(alert.id)));
    assert.equal(demo.reportText(result),reportText(result));
  }
  await assert.rejects(demo.api('/api/investigations',{method:'POST',body:'{"alertId":"../../bad"}'}),/valid alertId/);
});
