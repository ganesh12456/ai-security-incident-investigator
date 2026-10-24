'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
const client=path.join(root,'client');
const investigator=path.join(root,'functions','investigator');
const sourceFiles=[
  'fixtures/scenarios.js',
  'fixtures/model-training.js',
  'fixtures/kev-snapshot.json',
  'model.js',
  'engine.js'
];

// Bundle only the dependency-free, fictional data and the shared investigation
// engine. Slate serves static files; it does not deploy the Catalyst function.
function buildBrowserEngine(){
  const modules=sourceFiles.map(name=>{
    const source=fs.readFileSync(path.join(investigator,name),'utf8');
    const body=name.endsWith('.json')?'module.exports='+JSON.stringify(JSON.parse(source))+';':source;
    return 'factories['+JSON.stringify(name)+']=function(module,require){\n'+body+'\n};';
  }).join('\n');
  return `(()=>{
'use strict';
const factories=Object.create(null),cache=Object.create(null);
${modules}
function load(name){
  if(!Object.hasOwn(factories,name)) throw new Error('Unknown demo module: '+name);
  if(Object.hasOwn(cache,name)) return cache[name].exports;
  const module={exports:{}}; cache[name]=module;
  const require=(specifier)=>{
    if(!specifier.startsWith('./')) throw new Error('External modules are not bundled');
    let target=specifier.slice(2);
    if(name.includes('/')) target=name.slice(0,name.lastIndexOf('/')+1)+target;
    if(!/\\.(js|json)$/.test(target)) target+='.js';
    return load(target);
  };
  factories[name](module,require);
  return module.exports;
}
const {alerts}=load('fixtures/scenarios.js');
const {investigate,reportText}=load('engine.js');
const publicAlerts=alerts.map(({seedEventId,...alert})=>alert);
async function api(route,options={}){
  if(route==='/api/alerts'&&(!options.method||options.method==='GET'))
    return {alerts:publicAlerts,count:publicAlerts.length};
  if(route==='/api/investigations'&&options.method==='POST'){
    let input;
    try{input=JSON.parse(options.body||'{}');}catch{throw new Error('Invalid JSON');}
    if(typeof input.alertId!=='string'||!/^ALT-\\d{4}$/.test(input.alertId))
      throw new Error('Provide a valid alertId');
    const result=investigate(input.alertId);
    if(!result) throw new Error('Alert not found');
    return result;
  }
  throw new Error('Not found');
}
window.SignalDeskDemo=Object.freeze({api,reportText});
})();\n`;
}

fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
for(const name of ['index.html','main.css','main.js'])
  fs.copyFileSync(path.join(client,name),path.join(output,name));
const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
const marker='<script defer src="/main.js"></script>';
if(!html.includes(marker)) throw new Error('Client entry script was not found');
fs.writeFileSync(path.join(output,'index.html'),html.replace(marker,'<script defer src="/investigator.browser.js"></script>\n  '+marker));
fs.writeFileSync(path.join(output,'investigator.browser.js'),buildBrowserEngine());
console.log('Slate build ready in dist/');
