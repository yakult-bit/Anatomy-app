import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';
await build({stdin:{contents:`export * from './src/recognition-setup';export * from './shared/recognition';export * from './shared/recognition-context';export * from './src/recognition-context-runtime';export * from './src/identify-state';export * from './src/identify-scene-runtime';export {useStore,parts,anatomy} from './src/store';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/recognition-timing.mjs',metafile:true}).then(async result=>{
 // A regression importing any offline geometry pipeline into setup fails too.
 for(const path of Object.keys(result.metafile.inputs))assert(!/scripts\/.*(?:coverage|geometry|precompute)/.test(path),path+' leaked into runtime');
});
const m=await import('../work/recognition-timing.mjs');
const generated=JSON.parse(await fs.readFile('src/data/recognition-geometry.json','utf8'));
for(const entry of Object.values(generated.structures)){
 assert.equal(entry.frames.length,generated.aspects.length-1);
 for(const frame of entry.frames){assert.equal(frame.length,4);assert(frame.slice(0,3).every(Number.isFinite));assert(frame[3]===null||typeof frame[3]==='string');}
}
const meta=JSON.parse(await fs.readFile('src/data/model-info.json','utf8'));
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const references=JSON.parse(await fs.readFile('src/data/recognition-context.json','utf8'));
const contextDocument=await io.read('public'+references.path);
assert.equal(contextDocument.getRoot().listMeshes().length,2,'Context must stay batched, not hundreds of draw calls');
const wrist=m.anatomy.z_skeletal_dorsal_radio_ulnar_ligamentr;
assert.equal(m.recognitionContext(wrist).cue,'Right wrist');
for(const name of ['Radiusr','Ulnar','Scaphoid_boner','Lunate_boner']){
 assert(m.recognitionContext(wrist).neighbors.includes(name),name+' missing from wrist neighborhood');
 assert(references.batches.find(b=>b.kind==='skeleton').sourceMeshes.includes(name),name+' missing from context GLB');
}
const bonePrimitive=contextDocument.getRoot().listNodes().find(n=>n.getExtras().recognitionContext==='skeleton').getMesh().listPrimitives()[0];
const contextGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(Float32Array.from(bonePrimitive.getAttribute('POSITION').getArray()),3));
// Context setup must never scan or change the atlas buffers either.
contextGeometry.computeBoundingBox=()=>{throw Error('runtime context bounds scan')};
const contextStart=performance.now();
for(const local of [false,true]){
 const center=new THREE.Vector3(...m.recognitionGeometry(wrist).center);
 const layer=m.createContextLayer(contextGeometry,m.CONTEXT_BONE_OPACITY,center,.2,local);
 assert.equal(layer.material.depthWrite,false);assert(layer.material.opacity>=.1&&layer.material.opacity<=.18);
 assert.equal(layer.material.color.r,layer.material.color.g);assert.equal(layer.material.color.g,layer.material.color.b);
 for(const mesh of layer.scene.children){const hits=[];mesh.raycast(new THREE.Raycaster(),hits);assert.equal(hits.length,0);assert.equal(mesh.geometry,contextGeometry)}
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};layer.material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.contextLocal.value,local?1:0);assert(shader.fragmentShader.includes('smoothstep'));
 layer.dispose();
}
const contextSetupMs=performance.now()-contextStart;assert(contextSetupMs<50);
assert(m.CONTEXT_SURFACE_OPACITY>=.1&&m.CONTEXT_SURFACE_OPACITY<=.18);
// Render ordering across separate passes is the regression for transparent
// ghosts tinting targets. renderOrder on one scene would fail this contract.
const calls=[],surface={},skeleton={},target={},camera={};
const renderer={autoClear:true,clear(){calls.push('clear')},clearDepth(){calls.push('depth')},render(scene){calls.push(scene)}};
m.renderRecognitionContext(renderer,camera,surface,skeleton,target);
assert.deepEqual(calls,['clear',surface,'depth',skeleton,'depth',target]);assert(renderer.autoClear);
const framedExamples=[];
for(const id of [wrist.id,'femur_right','z_nervous_vitreous_bodyr','kidney_right']){
 const p=m.anatomy[id],g=m.recognitionGeometry(p),c=m.recognitionContext(p);assert(c.neighbors.length>=3,id+' needs anatomical references');
 for(const aspect of [.6,1,1.6,2.4]){
  if(m.contextGate(p,aspect))continue;
  const frame=m.contextFrame(p,aspect),camera=new THREE.PerspectiveCamera(42,aspect,frame.near,frame.far),center=new THREE.Vector3(...g.center);
  camera.position.copy(center).addScaledVector(new THREE.Vector3(.12,.05,1).normalize(),frame.distance);camera.lookAt(center);camera.updateMatrixWorld();
  const projected=new THREE.Box3();for(let bits=0;bits<8;bits++)projected.expandByPoint(new THREE.Vector3(...[0,1,2].map(i=>(bits>>i)&1?p.bounds.max[i]:p.bounds.min[i])).project(camera));
  const size=projected.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y)/2;
  assert(span>=.15&&span<=.405,id+' context framing span '+span);
  assert(frame.near<frame.distance-g.radius);
  framedExamples.push({id,aspect,span});
 }
}
const scenes=new Map();
for(const file of meta.files){
 const doc=await io.read('public'+file.path),scene=new THREE.Scene();
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh())continue;
  for(const primitive of node.getMesh().listPrimitives()){
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(primitive.getAttribute('POSITION').getArray()),3));
   const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.userData=node.getExtras();
   mesh.matrix.fromArray(node.getWorldMatrix());mesh.matrixAutoUpdate=false;scene.add(mesh);
  }
 }
 scenes.set(file.system,scene);
}
// Throw if setup attempts even one vertex read. Framing must come from JSON.
for(const scene of scenes.values())scene.traverse(mesh=>{
 if(mesh.isMesh){mesh.geometry.computeBoundingBox=()=>{throw Error('runtime bounds scan')};
  mesh.geometry.attributes.position.getX=()=>{throw Error('runtime vertex read')};}
});
// Regress the two structures visible in the user's screenshots. The branch
// must not be asked; the vitreous must use just its own real GLB mesh, with no
// retina, lens, nerve trunk, contralateral eye or parent/system fallback in the
// opaque target pass. The separate grey reference passes are tested above.
const vitreous=m.anatomy.z_nervous_vitreous_bodyr;
const branch=m.anatomy.z_nervous_posterior_division_of_middle_trunk_of_brachial_plexusr;
assert.equal(m.recognitionGate(branch),'no_supported_viewport');
const nervous=scenes.get('nervous');
const result=m.prepareRecognition(nervous,vitreous,1);assert.equal(result.reason,null);
assert.equal(result.prepared.meshes.length,1);
const original=nervous.children.find(n=>n.userData.sourceMeshName==='Vitreous_bodyr');assert(original);
assert.equal(result.prepared.meshes[0].geometry,original.geometry);
assert.equal(result.prepared.meshes[0].userData.recognitionTarget,vitreous.id);
assert.equal(result.prepared.meshes[0].material.opacity,1);
const protectedRoot=new THREE.Group();protectedRoot.userData.identifyProtected=true;
for(const mesh of result.prepared.meshes)protectedRoot.add(mesh);nervous.add(protectedRoot);
const isolation=m.captureIsolation(nervous);
const visible=[];nervous.traverseVisible(o=>{if(o.isMesh)visible.push(o)});
assert.deepEqual(visible,result.prepared.meshes,'Connected anatomy leaked into the isolated target');
for(const chosen of [vitreous.id,'z_nervous_retinar']){
 const s=m.useStore.getState();s.set({quiz:null,mode:'quiz',settings:{format:'identify',system:'nervous',region:'head-neck',count:5,timer:0}});
 await s.startQuiz([vitreous.id]);await m.useStore.getState().readyIdentify(vitreous.id);
 assert(m.isIdentifySceneActive(m.useStore.getState()));
 await m.useStore.getState().answer(chosen);
 assert(!m.isIdentifyQuestion(m.useStore.getState()),'Picking must lock after answer');
 assert(m.isIdentifySceneActive(m.useStore.getState()),'Feedback must retain isolation');
 isolation.hide();assert(nervous.children.filter(n=>n.isMesh).every(n=>!n.visible));
 // A growing feedback panel may narrow the canvas. Keep the target in review
 // even at a ratio that would correctly reject a brand-new question.
 const narrow=m.prepareRecognition(nervous,vitreous,.4,true);assert(narrow.prepared);m.disposeRecognition(narrow.prepared);
 await m.useStore.getState().next();assert(!m.isIdentifySceneActive(m.useStore.getState()));
}
isolation.restore();assert(original.visible);nervous.remove(protectedRoot);m.disposeRecognition(result.prepared);
// Recall and Function use exact real meshes, with the same no-vertex-read rule.
for(const [format,id] of [['recall','z_detail_brain_postcentral_gyrusr'],['function','foot_left']]){
 const p=m.anatomy[id],scene=scenes.get(p.system),start=performance.now();
 const result=m.prepareRecognition(scene,p,1,false,format);assert.equal(result.reason,null,id);
 assert(result.prepared.meshes.every(mesh=>mesh.userData.recognitionTarget===id));
 assert.equal(result.prepared.meshes.length,m.recognitionGeometry(p).meshCount);
 const originals=new Set(scene.children.filter(mesh=>mesh.userData.partId===id||mesh.userData.detailId===id).map(mesh=>mesh.geometry));
 for(const mesh of result.prepared.meshes){assert(originals.has(mesh.geometry));assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.transparent,false)}
 assert(performance.now()-start+m.RECOGNITION_APPROACH_MS+34<300);m.disposeRecognition(result.prepared);
}
let maxSetup=0,maxReroll=0;
const eligible=m.parts.filter(p=>p.sex!=='female'&&!m.recognitionGate(p,1)).sort((a,b)=>m.recognitionGeometry(a).radius-m.recognitionGeometry(b).radius);
assert(eligible.length>100);
for(const p of eligible){
 const state=m.useStore.getState();state.set({mode:'quiz',quiz:null,settings:{format:'identify',system:p.system,region:p.region,count:5,timer:0}});
 const start=performance.now();await state.startQuiz([p.id]);
 const result=m.prepareRecognition(scenes.get(p.system),p,1);assert.equal(result.reason,null);
 const elapsed=performance.now()-start;maxSetup=Math.max(maxSetup,elapsed);
 assert(elapsed+m.RECOGNITION_APPROACH_MS+34<m.RECOGNITION_SETUP_BUDGET_MS,`${p.id} setup ${elapsed}ms plus animation exceeds 300ms`);
 m.disposeRecognition(result.prepared);
}
for(let attempt=0;attempt<10;attempt++){
 const s=m.useStore.getState();s.set({quiz:null});await s.startQuiz(['skull']);assert(m.useStore.getState().quiz,'Test must start a real question');
 const start=performance.now();await m.useStore.getState().rerollIdentify('footprint_too_small',.7);
 maxReroll=Math.max(maxReroll,performance.now()-start);
 assert(performance.now()-start<300,'A synchronous reroll exceeds the wall-clock budget');
 const q=m.useStore.getState().quiz;if(q)assert.equal(m.recognitionGate(m.anatomy[q.questions[q.index].id],.7),null);
}
console.log(JSON.stringify({structures:eligible.length,maxSetupMs:maxSetup,maxRerollMs:maxReroll,contextSetupMs,framedExamples,
 note:'Real decoded models and production setup functions. Full question-to-interactive rendering is separately enforced by test:quiz-browser.'},null,2));
