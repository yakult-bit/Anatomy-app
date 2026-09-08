import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import postcss from 'postcss';
const css=postcss.parse(await fs.readFile('src/a11y.css','utf8'));
const original=postcss.parse(await fs.readFile('src/style.css','utf8'));
const entries=[
 ['Workspace breadcrumb','.workspace-breadcrumb','#8b9187','#fcfcfa'],
 ['Sidebar muted labels','.sidebar-top>span','#6c7b5f','#f9faf6'],
 ['Question labels','.question-count','#697c59','#f7f9f2'],
 ['Quiz supporting text','.quiz-intro','#6b7e59','#f7f9f2'],
 ['Text links','.text-link','#7a9067','#f7f9f2'],
 ['Camera presets','.camera-bar>button','#829586','#2d3637'],
 ['Orientation letters','.anatomy-side','#829086','#2d3637',.55],
 ['Incorrect feedback','.feedback.incorrect','#967d52','#f2ece0'],
 ['Incorrect option','.answer-options>button.incorrect','#ac775a','#f4e7de'],
 ['Correct feedback','.feedback','#607d4b','#e8f1de'],
 ['Correct option','.answer-options>button.correct','#567c3c','#e2efda'],
 ['Quiz option','.answer-options>button','#70815f','#ffffff'],
 ['Option number','.answer-options kbd','#99a58c','#f2f5ec'],
 ['Hint button','.skip-question','#96a487','#f7f9f2'],
 ['Timer','.timer','#8ba075','#e9efdf'],
 ['Urgent timer','.timer.urgent','#b57558','#f5e6dd'],
 ['Recall label','.recall-form label','#879775','#f7f9f2'],
 ['Touch guidance','.click-prompt>small','#a0ad95','#f7f9f2'],
 ['Clinical supporting note','.clinical-card>span','#697f56','#eaf0e0'],
 ['Source links','.source-links a','#77925f','#fafbf7'],
 ['Keyboard shortcut','.shortcut-grid kbd','#7e9869','#eef3e7'],
 ['Account error','.account-error','#f0aaa0','#fafbf7']
];
function rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255)}
function luminance(v){return v.reduce((n,x,i)=>n+(x<=.04045?x/12.92:((x+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0)}
function ratio(f,b,alpha=1){const bg=rgb(b),fg=rgb(f).map((x,i)=>alpha*x+(1-alpha)*bg[i]),a=luminance(fg),c=luminance(bg);return (Math.max(a,c)+.05)/(Math.min(a,c)+.05)}
const results=entries.map(([label,selector,before,background,alpha=1])=>{
 let declared;original.walkRules(r=>{if(r.selectors.includes(selector))r.walkDecls('color',d=>{declared=d.value})});
 assert.equal(declared,before,selector+' baseline changed; remeasure this pair');
 let after;css.walkRules(r=>{if(r.selectors.includes(selector))r.walkDecls('color',d=>{after=d.value})});assert(after,selector+' has no repair');
 const old=ratio(before,background,alpha),fixed=ratio(after,background);assert(old<4.5);assert(fixed>=4.5,selector+' below AA: '+fixed);
 return {label,selector,before,background,beforeRatio:+old.toFixed(2),after,afterRatio:+fixed.toFixed(2)};
});
await fs.mkdir('work/reports',{recursive:true});await fs.writeFile('work/reports/contrast.json',JSON.stringify({scope:'Declared CSS foreground/background pairs, alpha-composited where specified. Not a browser computed-style or complete WCAG conformance audit.',bodyFloor:4.5,largeTextFloor:3,results},null,2));
console.log(`Repaired ${results.length} failing text pairs; lowest new ratio ${Math.min(...results.map(r=>r.afterRatio))}:1. Detailed measurements: work/reports/contrast.json.`);
