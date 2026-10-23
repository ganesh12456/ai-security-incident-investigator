'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {alerts}=require('./fixtures/scenarios');
const {investigate,reportText}=require('./engine');

const clientDir=path.resolve(__dirname,'../../client');
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
    if(raw.length>8192) {const error=new Error('Request too large');error.status=413;throw error;}
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
      return respond(res,200,{status:'ok',version:'0.1.0',dataset:'synthetic',storage:'bundled examples'});
    if(req.method==='GET'&&route==='/api/alerts')
      return respond(res,200,{alerts:alerts.map(({seedEventId,...publicAlert})=>publicAlert),count:alerts.length});
    const alertRoute=route.match(/^\/api\/alerts\/(ALT-\d{4})$/);
    if(req.method==='GET'&&alertRoute){
      const alert=alerts.find(a=>a.id===alertRoute[1]);
      return respond(res,alert?200:404,alert||{error:'Alert not found'});
    }
    if(req.method==='POST'&&route==='/api/investigations'){
      const input=await readJson(req);
      if(typeof input.alertId!=='string'||!/^ALT-\d{4}$/.test(input.alertId))
        return respond(res,400,{error:'Provide a valid alertId'});
      const result=investigate(input.alertId);
      return respond(res,result?200:404,result||{error:'Alert not found'});
    }
    const invRoute=route.match(/^\/api\/investigations\/(INV-ALT-\d{4})(\/report)?$/);
    if(req.method==='GET'&&invRoute){
      const result=investigate(invRoute[1].replace(/^INV-/,''));
      if(!result) return respond(res,404,{error:'Investigation not found'});
      if(invRoute[2]) return respond(res,200,reportText(result),'text/plain; charset=utf-8',{
        'Content-Disposition':'attachment; filename="'+result.id+'.txt"'
      });
      return respond(res,200,result);
    }
    if(req.method==='GET'&&process.env.CATALYST_RUNTIME!=='true'){
      const name=route==='/'?'index.html':route.slice(1);
      const full=path.resolve(clientDir,name);
      if(full.startsWith(clientDir+path.sep)&&fs.existsSync(full)&&fs.statSync(full).isFile())
        return respond(res,200,fs.readFileSync(full),mime[path.extname(full)]||'application/octet-stream',{'Cache-Control':'public, max-age=120'});
    }
    return respond(res,404,{error:'Not found'});
  }catch(error){
    if(error.status) return respond(res,error.status,{error:error.message});
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
