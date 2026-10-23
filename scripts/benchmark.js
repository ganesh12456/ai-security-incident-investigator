'use strict';
const {performance}=require('node:perf_hooks');
const {investigate}=require('../functions/investigator/engine');
const {alerts,events}=require('../functions/investigator/fixtures/scenarios');
const started=performance.now();
let invalid=0;
for(let i=0;i<10000;i++){
  const sample=alerts[i%alerts.length];
  const related=events.filter(e=>e.actor===sample.actor);
  const suffix=String(i).padStart(5,'0');
  const uniqueEvents=related.map(e=>({...e,id:e.id+'-'+suffix,actor:e.actor.replace('@','+'+suffix+'@')}));
  const uniqueAlert={...sample,id:'ALT-'+String(i+10000),actor:uniqueEvents[0].actor,seedEventId:sample.seedEventId+'-'+suffix};
  const result=investigate(uniqueAlert.id,{alerts:[uniqueAlert],events:uniqueEvents});
  if(!result||result.findings.some(f=>f.eventIds.some(id=>!result.evidence.some(e=>e.id===id)))) invalid++;
}
const seconds=(performance.now()-started)/1000;
console.log(JSON.stringify({distinctSyntheticAlerts:10000,scenarioTemplates:alerts.length,elapsedSeconds:Number(seconds.toFixed(3)),throughputPerSecond:Math.round(10000/seconds),invalid,method:'In-process calculation with small per-case event sets; excludes database and network latency'},null,2));
if(invalid) process.exitCode=1;
