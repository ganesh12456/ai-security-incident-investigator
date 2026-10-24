'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {handler}=require('../functions/investigator/index');
test('stateless function accepts imported records and has no bundled alert queue',async()=>{
  const server=http.createServer(handler).listen(0);
  await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try{
    const health=await (await fetch(origin+'/api/health')).json();
    assert.equal(health.storage,'stateless');
    assert.equal((await fetch(origin+'/api/alerts')).status,404);
    const records=[{time:'2026-10-24T04:00:00Z',actor:'account-a',action:'login_failed',message:'Failed sign-in'},
      {time:'2026-10-24T04:03:00Z',actor:'account-a',action:'login_success',message:'Successful sign-in'}];
    const response=await fetch(origin+'/api/investigations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seedId:'ROW-00001',records})});
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).findings[0].eventIds,['ROW-00001','ROW-00002']);
    const bad=await fetch(origin+'/api/investigations',{method:'POST',body:JSON.stringify({seedId:'ROW-00001',records:[{message:'missing time'}]})});
    assert.equal(bad.status,400);
  }finally{server.close();}
});
