'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {parseRecords}=require('./ingest');
const {investigate}=require('./engine');

const clientDir=path.resolve(__dirname,'../../dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const headers={
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'"
};
function respond(res,status,body,type='application/json; charset=utf-8',additional={}){
  res.writeHead(status,{...headers,'Content-Type':type,'Cache-Control':'no-store',...additional});
  res.end(type.startsWith('application/json')?JSON.stringify(body):body);
}
async function readJson(req){
  let raw='';
  for await(const chunk of req){
    raw+=chunk;
    if(raw.length>6*1024*1024) {const error=new Error('Request too large');error.status=413;throw error;}
  }
  try{return JSON.parse(raw||'{}');}
  catch {const error=new Error('Invalid JSON');error.status=400;throw error;}
}
async function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  // Catalyst strips /server/investigator; the extra form also supports local testing.
  const route=url.pathname.replace(/^\/server\/investigator(?=\/|$)/,'')||'/';
  try{
    if(req.method==='GET'&&route==='/api/health')
      return respond(res,200,{status:'ok',version:'1.0.0',dataset:'none bundled',storage:'stateless'});
    if(req.method==='POST'&&route==='/api/investigations'){
      const input=await readJson(req);
      if(!Array.isArray(input.records)||typeof input.seedId!=='string')
        return respond(res,400,{error:'Provide records and a seedId'});
      const parsed=parseRecords(JSON.stringify(input.records),'records.json');
      const result=investigate(input.seedId,{events:parsed.events});
      return respond(res,result?200:404,result||{error:'Seed record not found'});
    }
    if(req.method==='GET'&&process.env.CATALYST_RUNTIME!=='true'){
      const name=route==='/'?'index.html':route.slice(1);
      const full=path.resolve(clientDir,name);
      if(full.startsWith(clientDir+path.sep)&&fs.existsSync(full)&&fs.statSync(full).isFile())
        return respond(res,200,fs.readFileSync(full),mime[path.extname(full)]||'application/octet-stream',{'Cache-Control':'public, max-age=120'});
    }
    return respond(res,404,{error:'Not found'});
  }catch(error){
    if(error.status||/^(File exceeds|Import at most|No valid records|File must|Invalid JSON)/.test(error.message))
      return respond(res,error.status||400,{error:error.message});
    console.error('Investigator request error:',error);
    return respond(res,500,{error:'Internal error'});
  }
}
if(require.main===module){
  const port=Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT||process.env.PORT||9000);
  http.createServer(handler).listen(port,()=>console.log('Investigator listening on '+port));
}
// Catalyst invokes the exported request listener; the local process above
// starts an HTTP server for development.
module.exports=handler;
module.exports.handler=handler;
