// BUILD ONLY. Never import this module, the decoder, or rasterizer into the SPA.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';
import {projectedCoverage} from './projected-coverage.mjs';

const female=process.argv.includes('--female'),prefix=female?'female-':'';
const dataPath=`src/data/${prefix}anatomy.json`,metaPath=`src/data/${prefix}model-info.json`;
const output=`src/data/${prefix}recognition-geometry.json`,failures=`public/data/${prefix}recognition-skips.json`;
const data=JSON.parse(await fs.readFile(dataPath,'utf8'));
const meta=JSON.parse(await fs.readFile(metaPath,'utf8'));
const inputs=[dataPath,metaPath,'shared/identify.ts',
 'scripts/precompute-quiz.mjs','scripts/projected-coverage.mjs',...meta.files.map(f=>'public'+f.path)];
const hash=createHash('sha256');for(const path of inputs)hash.update(path).update(await fs.readFile(path));
const sourceHash=hash.digest('hex');
let previous;try{previous=JSON.parse(await fs.readFile(output,'utf8'))}catch{}
if(previous?.sourceHash===sourceHash&&!process.argv.includes('--force')){
 const report=JSON.parse(await fs.readFile(failures,'utf8'));
 if(report.sourceHash!==sourceHash)throw Error('Recognition skip report is stale. Run npm run quiz:precompute -- --force');
 console.log('Recognition metadata is current (no geometry work needed).');process.exit(0);
}
if(process.argv.includes('--check'))throw Error('Recognition metadata is stale. Run npm run quiz:precompute');
await fs.mkdir('work',{recursive:true});
await build({entryPoints:['shared/identify.ts'],bundle:true,platform:'node',format:'esm',outfile:'work/recognition-build-policy.mjs'});
const {distractors,projectedFootprint}=await import('../work/recognition-build-policy.mjs');
const all=Object.values(data).filter(p=>p.available!==false);
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const groups=new Map(),missing=new Set();
for(const file of meta.files){
 const doc=await io.read('public'+file.path);
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh())continue;
  const {partId,detailId}=node.getExtras(),pieces=[];
  const matrix=new THREE.Matrix4().fromArray(node.getWorldMatrix()),v=new THREE.Vector3();
  for(const primitive of node.getMesh().listPrimitives()){
   const positions=Float32Array.from(primitive.getAttribute('POSITION').getArray());
   for(let i=0;i<positions.length;i+=3){v.fromArray(positions,i).applyMatrix4(matrix);v.toArray(positions,i)}
   pieces.push({positions,indices:primitive.getIndices()?.getArray()||Uint32Array.from({length:positions.length/3},(_,i)=>i)});
  }
  for(const id of new Set([partId,detailId].filter(Boolean))){
   if(!data[id]){missing.add(id);continue}
   const group=groups.get(id)||[];group.push(...pieces);groups.set(id,group);
  }
 }
}
// The ranges include the five tested viewport ratios. Within each range, both
// endpoints and its midpoint must pass. This deliberately errs toward reroll.
const aspects=[.05,.25,.45,.6,.8,1,1.3,1.6,2,2.4,3.2,4,6,10];
const round=v=>Number.isFinite(v)?Number(v.toFixed(8)):0;
const structures={},skipped=[...missing].map(meshName=>({meshName,reason:'missing_content'}));
let count=0;
for(const part of all){
 const pieces=groups.get(part.id)||[],box=new THREE.Box3(),v=new THREE.Vector3();
 for(const piece of pieces)for(let i=0;i<piece.positions.length;i+=3)box.expandByPoint(v.fromArray(piece.positions,i));
 const bounds={min:box.min.toArray(),max:box.max.toArray()},sphere=box.getBoundingSphere(new THREE.Sphere());
 const choices=distractors(part,all).map(p=>p.id);
 const samples=pieces.length?[.45,1,2.4].flatMap(aspect=>[1,1.4].map(scale=>({aspect,scale,...projectedCoverage(pieces,bounds,aspect,scale)}))):[];
 const coverage=samples.length?Math.max(0,Math.min(...samples.map(v=>v.coverage))-.005):0;
 const dominantFraction=samples.length?Math.min(...samples.map(v=>v.dominantFraction)):0;
 const clusters=samples.length?Math.max(...samples.map(v=>v.clusters)):0;
 const reason=part.quizExcluded?'annotation_under_review':!pieces.length?'missing_geometry_bounds':choices.length<3?'fewer_than_three_region_distractors':dominantFraction<.55&&clusters>3?'disconnected_fragments':null;
 const frames=aspects.slice(0,-1).map((minAspect,i)=>{
  const maxAspect=aspects[i+1],views=[minAspect,(minAspect+maxAspect)/2,maxAspect].map(a=>projectedFootprint(bounds,a));
  const minFootprint=Math.min(...views.map(f=>f.area*coverage)),maxFootprint=Math.max(...views.map(f=>f.area*coverage)),edge=Math.max(...views.map(f=>f.edge));
  return {minAspect,maxAspect,minFootprint,maxFootprint,edge,reason:reason||
   (views.some(v=>v.clamped)?'framing_clamped':minFootprint<.05?'footprint_too_small':maxFootprint>.6||edge>.9?'footprint_too_large':null)};
 });
 structures[part.meshName]={id:part.id,center:sphere.center.toArray().map(round),radius:round(sphere.radius),
  coverage:round(coverage),dominantFraction:round(dominantFraction),clusters,meshCount:pieces.length,distractors:choices,reason,
  // Global aspect boundaries avoid repeating them 3,189 times. Measured
  // footprint values are retained, including failed cases, for inspection.
  frames:frames.map(f=>[round(f.minFootprint),round(f.maxFootprint),round(f.edge),f.reason])};
 if(reason||frames.some(f=>f.reason))skipped.push({id:part.id,meshName:part.meshName,displayName:part.displayName,
  reason:reason||'viewport_dependent',alwaysSkipped:frames.every(f=>f.reason),ranges:frames.filter(f=>f.reason).map(({minAspect,maxAspect,reason})=>({minAspect,maxAspect,reason}))});
 if(++count%500===0)console.log('Precomputed',count,'recognition structures');
}
await fs.mkdir('public/data',{recursive:true});
await fs.writeFile(output,JSON.stringify({version:1,sourceHash,aspects,structures})+'\n');
await fs.writeFile(failures,JSON.stringify({version:1,sourceHash,total:all.length,skipped},null,2)+'\n');
console.log(`Precomputed ${all.length} structures; ${skipped.filter(p=>p.alwaysSkipped).length} always fail. Static report: ${failures}`);
