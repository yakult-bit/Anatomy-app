// Real decoded triangle topology and picking checks, run offline only.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';import {KHRDracoMeshCompression} from '@gltf-transform/extensions';import draco from 'draco3dgltf';import {build} from 'esbuild';import * as T from 'three';
await build({stdin:{contents:`export * from './shared/click-quiz';export * from './shared/visual-quiz';export * from './src/model-runtime';export * from './src/recognition-setup';export * from './src/recognition-context-runtime';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/nih-mesh-policy.mjs',logLevel:'silent'});
const m=await import('../work/nih-mesh-policy.mjs'),content=JSON.parse(await fs.readFile('src/data/female-anatomy.json','utf8')),meta=JSON.parse(await fs.readFile('src/data/female-model-info.json','utf8'));
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});const nodes=[],groups=new Map();
for(const file of meta.files){
 const doc=await io.read('public'+file.path);assert.equal(doc.getRoot().listScenes().length,1,'All organs must be in the loaded default scene');
 for(const n of doc.getRoot().listNodes()){
  if(!n.getMesh())continue;
  const x=n.getExtras(),p=content[x.detailId||x.partId],edges=new Map(),canonical=new Map(),meshes=[],vector=new T.Vector3();let vertices=0,triangles=0,degenerate=0;
  for(const primitive of n.getMesh().listPrimitives()){
   const a=primitive.getAttribute('POSITION').getArray(),index=primitive.getIndices().getArray(),normals=primitive.getAttribute('NORMAL').getArray(),ids=[];
   // Weld positions for topology only. Imported geometry remains untouched.
   for(let i=0;i<a.length;i+=3){const key=[a[i],a[i+1],a[i+2]].map(v=>v.toFixed(6)).join(',');if(!canonical.has(key))canonical.set(key,canonical.size);ids.push(canonical.get(key));}
   const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(a,3)).setAttribute('normal',new T.BufferAttribute(normals,3)).setIndex(new T.BufferAttribute(index,1));
   const color=new T.Color().fromArray(primitive.getMaterial().getBaseColorFactor());
   const material=new T.MeshStandardMaterial({color,side:T.DoubleSide}),mesh=new T.Mesh(geometry,material);mesh.userData={...x,pickable:true};mesh.raycast=m.visibleRaycast;m.preparePicking(geometry);meshes.push(mesh);
   for(let i=0;i<index.length;i+=3){const t=[ids[index[i]],ids[index[i+1]],ids[index[i+2]]];triangles++;if(new Set(t).size<3){degenerate++;continue}for(const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){const key=a<b?a+':'+b:b+':'+a;edges.set(key,(edges.get(key)||0)+1)}}
   vertices+=a.length/3;
  }
  const scene=new T.Scene();meshes.forEach(mesh=>scene.add(mesh));scene.updateMatrixWorld(true);
  // Aim at actual triangle interiors from both normal directions. This tests
  // picking real surfaces, not their bounding box or an artificial proxy hull.
  let samples=0,hits=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3(),origin=new T.Vector3(),ray=new T.Raycaster();ray.firstHitOnly=true;
  for(const mesh of meshes){const pos=mesh.geometry.getAttribute('position'),idx=mesh.geometry.index;for(let i=0;i<idx.count;i+=Math.max(3,Math.floor(idx.count/96/3)*3)){
   a.fromBufferAttribute(pos,idx.getX(i));b.fromBufferAttribute(pos,idx.getX(i+1));c.fromBufferAttribute(pos,idx.getX(i+2));normal.crossVectors(b.clone().sub(a),c.clone().sub(a));if(normal.lengthSq()<1e-18)continue;normal.normalize();const center=a.clone().add(b).add(c).multiplyScalar(1/3);
   for(const direction of [-1,1]){origin.copy(center).addScaledVector(normal,p.size*.5*direction);ray.set(origin,normal.clone().multiplyScalar(-direction));samples++;if(ray.intersectObjects(meshes,false).length)hits++}
  }}
  assert(samples>0&&hits/samples>=.99,`${p.id} picking unreliable ${hits}/${samples}`);
  for(const mesh of meshes){mesh.userData.pickable=false;assert.equal(new T.Raycaster().intersectObject(mesh).length,0);mesh.userData.pickable=true;}
  const status={meshName:x.sourceMeshName,id:p.id,modelId:x.sourceModelId,triangles,vertices,degenerateTriangles:degenerate,boundaryEdges:[...edges.values()].filter(n=>n===1).length,nonManifoldEdges:[...edges.values()].filter(n=>n>2).length,raycast:{samples,hits,hitRate:hits/samples},clickBeginner:m.questionGate(p,'click','beginner',1)||'pass',clickAdvanced:m.questionGate(p,'click','advanced',1)||'pass',recognition:m.questionGate(p,'identify','beginner',1)||'pass'};nodes.push(status);
  for(const id of new Set([x.partId,x.detailId].filter(Boolean))){const a=groups.get(id)||[];a.push(...meshes);groups.set(id,a)}
  // Render material state assertions; actual WebGL outline appearance still
  // requires browser QA and is deliberately not claimed by this CPU test.
  for(const mesh of meshes){const base=mesh.material.color.clone();m.tintMaterial(mesh.material,base,true,false);assert(mesh.material.emissiveIntensity>0);m.paintFindMaterial(mesh.material,base,false,m.CLICK_CORRECT,false);assert.equal(mesh.material.color.getHexString(),'00ff85');m.paintFindMaterial(mesh.material,base,false,m.CLICK_WRONG,false);assert.equal(mesh.material.color.getHexString(),'ff174d');}
 }
}
const rows=Object.values(content).map(p=>({id:p.id,displayName:p.displayName,meshNames:p.sourceMeshNames,clickBeginner:m.questionGate(p,'click','beginner',1)||'pass',clickAdvanced:m.questionGate(p,'click','advanced',1)||'pass',identify:m.questionGate(p,'identify','beginner',1)||'pass',recall:m.questionGate(p,'recall','beginner',1)||'pass',function:p.quizEligible?(m.questionGate(p,'function','beginner',1)||'pass'):'not_a_major_structure',missing:m.teaching(p).missing,...(p.annotationIssue?{annotationIssue:p.annotationIssue}:{})}));
const report={checkedAt:'2026-09-07',method:'Decoded Draco triangles; positional weld tolerance 1e-6 scene units for topology counts only; up to 96 triangles per primitive sampled on each side; real accelerated Three.js raycasting, no proxy geometry. Gate assessed at aspect 1, with per-aspect recognition reports separately shipped.',limitations:['Boundary edges can be intentional openings or incomplete research surfaces; no hole filling or anatomical repair was performed.','Surface sampling proves rays hitting the tested rendered triangles are selectable. Rays through empty holes can still pass through; it does not prove watertightness.','WebGL outline appearance, orbit screenshots and real-device touch remain unverified because the supervised preview daemon is unavailable.'],summary:{models:7,meshes:nodes.length,triangles:nodes.reduce((s,n)=>s+n.triangles,0),withBoundaryEdges:nodes.filter(n=>n.boundaryEdges).length,withNonManifoldEdges:nodes.filter(n=>n.nonManifoldEdges).length,raySamples:nodes.reduce((s,n)=>s+n.raycast.samples,0),rayHits:nodes.reduce((s,n)=>s+n.raycast.hits,0),clickBeginnerPass:rows.filter(r=>r.clickBeginner==='pass').length,clickAdvancedPass:rows.filter(r=>r.clickAdvanced==='pass').length,identifyPass:rows.filter(r=>r.identify==='pass').length,missingContent:rows.filter(r=>r.missing.length).length},meshes:nodes,structures:rows};
await fs.writeFile('public/data/nih-hra-mesh-quality.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary,null,2));
