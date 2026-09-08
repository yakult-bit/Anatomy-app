import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const root='dist',read=p=>fs.readFile(root+'/'+p.replace(/^\//,''));
const male=JSON.parse(await fs.readFile('src/data/model-info.json','utf8')),female=JSON.parse(await fs.readFile('src/data/female-model-info.json','utf8'));
const entry=await read('learn.html'),home=await read('index.html');
const refs=[...entry.toString().matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(js|css))"/g)].map(m=>m[1]);
const assets=[];for(const path of new Set(refs)){const bytes=await read(path);assets.push({path,bytes:bytes.length,gzipBytes:gzipSync(bytes).length})}
assert(assets.some(a=>a.path.endsWith('.js')));assert(!home.toString().includes('<script'));
const models=await Promise.all(male.files.map(async f=>({system:f.system,path:f.path,bytes:(await read(f.path)).length})));
const femaleModels=await Promise.all(female.files.map(async f=>({system:f.system,path:f.path,bytes:(await read(f.path)).length})));
const dracoWrapper=await read('draco/draco_wasm_wrapper.js'),dracoWasm=await read('draco/draco_decoder.wasm');
const application=assets.reduce((s,a)=>s+a.gzipBytes,0)+gzipSync(entry).length;
const decoder=gzipSync(dracoWrapper).length+dracoWasm.length;
const firstMale=models.filter(f=>['skeletal','muscular'].includes(f.system)).reduce((s,a)=>s+a.bytes,0);
const firstFemale=femaleModels.filter(f=>['skeletal','urinary','reproductive'].includes(f.system)).reduce((s,a)=>s+a.bytes,0);
const homeCss=await read('website.css'),homeImage=await read('social-preview.png'),icon=await read('favicon-32x32.png');
const report={
 measurement:'Built artifact byte counts. Cold transfer estimates use gzip for HTML/JS/CSS plus original Draco GLB/WASM and PNG bytes; actual host Brotli/gzip, headers, APIs, HTTP caching and browser requests require a network trace.',
 applicationAssets:assets,
 firstPaint:{home:{javascriptBytes:0,modelBytes:0,estimatedTransferBytes:gzipSync(home).length+gzipSync(homeCss).length+homeImage.length+icon.length},maleLab:{systems:['skeletal','muscular'],modelBytes:firstMale,estimatedTransferBytes:application+decoder+firstMale},femaleLab:{systems:['skeletal','urinary','reproductive'],modelBytes:firstFemale,estimatedTransferBytes:application+decoder+firstFemale}},
 maleModels:models,allElevenMaleModelsBytes:models.reduce((s,a)=>s+a.bytes,0),allElevenWithApplicationAndDecoderBytes:application+decoder+models.reduce((s,a)=>s+a.bytes,0),
 femaleModels,allFemaleSystemBundlesBytes:femaleModels.reduce((s,a)=>s+a.bytes,0),
 additionalQuizContextBytes:{male:(await read('models/z-anatomy/recognition-context.glb')).length,female:(await read('models/hra-female/recognition-context.glb')).length},
 lighthouse:{performance:null,accessibility:null,bestPractices:null,seo:null,status:'Not run: supervised browser preview is unavailable. No inferred scores.'},
 mobile:{width375:'Browser verification pending',realTouchDevice:'Not available in this environment',midRangeHardware:'Not measured'}
};
await fs.mkdir('work/reports',{recursive:true});await fs.writeFile('work/reports/performance.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
