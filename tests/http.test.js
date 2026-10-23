'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {handler}=require('../functions/investigator/index');
test('HTTP routes return safe demo data and reject invalid input',async()=>{
  const server=http.createServer(handler).listen(0);
  await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const alerts=await (await fetch(base+'/api/alerts')).json();
    assert.equal(alerts.count,5);
    assert.equal(alerts.alerts[0].seedEventId,undefined);
    const result=await fetch(base+'/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alertId:'ALT-1001'})});
    assert.equal(result.status,200);
    assert.equal((await result.json()).severity,'Critical');
    const bad=await fetch(base+'/api/investigations',{method:'POST',body:JSON.stringify({alertId:'../../bad'})});
    assert.equal(bad.status,400);
    const missing=await fetch(base+'/../../etc/passwd');
    assert.equal(missing.status,404);
    const report=await fetch(base+'/api/investigations/INV-ALT-1001/report');
    assert.match(await report.text(),/Evidence: E-101, E-102/);
  }finally{server.close();}
});
