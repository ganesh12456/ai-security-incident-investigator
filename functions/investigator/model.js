'use strict';
const samples = require('./fixtures/model-training');
const labels = ['credential_access','data_access','oauth_abuse','benign'];
const words = text => String(text).toLowerCase().match(/[a-z][a-z0-9_-]+/g) || [];
const trained = Object.fromEntries(labels.map(label => [label,{documents:0,total:0,counts:new Map()}]));
const vocabulary = new Set();
for (const [label, sentence] of samples) {
  const row = trained[label]; row.documents++;
  for (const word of words(sentence)) {
    vocabulary.add(word); row.total++; row.counts.set(word, (row.counts.get(word)||0)+1);
  }
}
function classify(text) {
  const tokens=words(text);
  const scores=labels.map(label=>{
    const row=trained[label];
    let score=Math.log(row.documents/samples.length);
    for(const token of tokens) score+=Math.log(((row.counts.get(token)||0)+1)/(row.total+vocabulary.size));
    return {label,score};
  });
  const highest=Math.max(...scores.map(x=>x.score));
  const sum=scores.reduce((n,x)=>n+Math.exp(x.score-highest),0);
  return scores.map(x=>({label:x.label,confidence:Math.exp(x.score-highest)/sum}))
    .sort((a,b)=>b.confidence-a.confidence);
}
module.exports={classify,labels};
