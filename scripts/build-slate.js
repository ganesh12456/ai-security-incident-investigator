'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
const client=path.join(root,'client');
const investigator=path.join(root,'functions','investigator');
const sourceFiles=[
  'fixtures/model-training.js',
  'ingest.js',
  'model.js',
  'engine.js'
];

// Slate runs the import and investigation logic on the visitor's device.
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
  if(!Object.hasOwn(factories,name)) throw new Error('Unknown module: '+name);
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
const {parseRecords,MAX_BYTES,MAX_ROWS}=load('ingest.js');
const {investigate,reportText}=load('engine.js');
window.SignalDeskApp=Object.freeze({parseRecords,investigate,reportText,MAX_BYTES,MAX_ROWS});
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
