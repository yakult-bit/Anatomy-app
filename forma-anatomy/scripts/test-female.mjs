import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';

await build({stdin:{contents:`export {useStore,anatomy,parts,SYSTEMS} from './src/store';export * from './shared/atlas';export * from './src/model-runtime';export * from './src/study-board-layout';export * from './src/find-state';export * from './src/recognition-setup';export * from './shared/recognition';export * from './shared/recognition-context';export * from './shared/visual-quiz';export {createPlan,settingsSchema,structureId,replacementQuestion,grade} from './server/quiz';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/female-test.mjs',logLevel:'silent'});
const m=await import('../work/female-test.mjs'),s=()=>m.useStore.getState(),female=m.parts.filter(p=>m.inAtlas(p,'female'));
const meta=m.femaleInfo;
assert.equal(meta.sourceMeshCount,40);assert.equal(female.length,44);assert.equal(meta.coreStructureCount,19);
assert.equal(meta.provider,'NIH 3D Human Reference Atlas');assert.equal(meta.sourceFiles.length,7);
assert.equal(new Set(m.parts.map(p=>p.id)).size,m.parts.length);
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const found=new Set(),names=new Set(),scenes=new Map();let triangles=0;
for(const file of meta.files){
 const bytes=await fs.readFile('public'+file.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
 const doc=await io.readBinary(bytes),scene=new THREE.Scene();scenes.set(file.system,scene);
 assert(doc.getRoot().listExtensionsRequired().some(e=>e.extensionName==='KHR_draco_mesh_compression'));
 assert(doc.getRoot().getAsset().copyright.includes('CC BY 4.0'));
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh())continue;
  const x=node.getExtras();assert.equal(x.atlasSex,'female');assert.equal(x.source,'NIH 3D Human Reference Atlas — Visible Human Female');
  assert.equal(node.getName(),x.sourceMeshName);assert(!names.has(node.getName()));names.add(node.getName());
  for(const id of [x.partId,x.detailId].filter(Boolean)){assert(m.inAtlas(m.anatomy[id],'female'));assert.equal(m.anatomy[id].system,file.system);found.add(id)}
  if(x.detailId)assert.equal(m.anatomy[x.detailId].parentId,x.partId);
  const part=m.anatomy[x.detailId||x.partId];let nodeTriangles=0;
  for(const primitive of node.getMesh().listPrimitives()){
   const positions=primitive.getAttribute('POSITION').getArray();
   for(let i=0;i<positions.length;i++){assert(Number.isFinite(positions[i]));assert(positions[i]>=part.bounds.min[i%3]-.0001&&positions[i]<=part.bounds.max[i%3]+.0001,part.id+' transformed bounds')}
   nodeTriangles+=primitive.getIndices().getCount()/3;
   const material=primitive.getMaterial();assert(material);assert.equal(material.getBaseColorFactor()[3],1);
   const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3));
   geometry.computeBoundingBox=()=>{throw Error('runtime geometry scan')};geometry.attributes.position.getX=()=>{throw Error('runtime vertex read')};
   const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());mesh.userData=x;mesh.matrix.fromArray(node.getWorldMatrix());mesh.matrixAutoUpdate=false;scene.add(mesh);
  }
  // Draco removes degenerate triangles created by quantization.
  assert(nodeTriangles<=part.sourceTriangles&&nodeTriangles>=part.sourceTriangles-part.sourceDegenerateTriangles-Math.max(2,part.sourceTriangles*.001),part.id+' unexpected geometry loss');triangles+=nodeTriangles;
 }
}
assert.equal(names.size,40);assert.equal(found.size,44);
for(const p of female){
 assert(found.has(p.id));assert(m.structureId.safeParse(p.id).success);assert(p.position.every(Number.isFinite));
 assert(p.relatedIds.every(id=>m.inAtlas(m.anatomy[id],'female')));assert(p.sourceMeshNames.every(n=>names.has(n)));
 if(p.quizEligible)assert(p.description&&p.function&&p.clinical_notes);else if(p.quizExcluded)assert(!p.function,'No invented function filler');
 assert(m.recognitionGeometry(p));assert(m.recognitionContext(p));
}
assert(m.anatomy.female_ovary_l.position[0]>0);assert(m.anatomy.female_ovary_r.position[0]<0);
assert(!female.some(p=>p.id==='female_liver'),'Retired unaudited subset must not remain active');
assert(m.anatomy.female_uterus.position[2]<m.anatomy.female_bladder.position[2]);
const refs=JSON.parse(await fs.readFile('src/data/female-recognition-context.json','utf8'));
assert.equal(m.contextUrl(m.anatomy.female_uterus),refs.path+'?v='+refs.assetHash.slice(0,12));assert.notEqual(refs.path,m.contextUrl(m.anatomy.heart));
const context=await io.read('public'+refs.path);assert.equal(context.getRoot().listMeshes().length,1);
assert.equal(refs.batches.find(b=>b.kind==='skeleton').sourceMeshes.length,14);
assert(refs.batches.every(b=>b.sourceMeshes.every(n=>names.has(n))));

s().set({quiz:null,sex:'female'});assert.equal(s().sex,'female');assert.equal(s().selected,null);
assert.equal(m.requiredSystems(s()).length,3);assert.equal(s().boardSystem,'reproductive');
for(const [system] of m.SYSTEMS){
 const supported=meta.files.some(f=>f.system===system);assert.equal(s().active[system],m.FEMALE_START_SYSTEMS.includes(system));
 if(supported)assert(m.modelPath(system,'female').startsWith('/models/hra-female/'));
 else {assert.throws(()=>m.modelPath(system,'female'));s().toggleSystem(system);assert(!s().active[system])}
 const board=m.filterBoard(system,'all','','female');assert.equal(board.length,female.filter(p=>p.system===system).length);assert(board.every(p=>p.sex==='female'));
}
s().peel(4);assert.equal(s().depth,4);s().peel(5);assert.deepEqual(m.requiredSystems(s()),['skeletal']);s().peel(0);
s().select('female_ovary_l');assert.equal(s().view,'inspect');assert.deepEqual(m.requiredSystems(s()),['reproductive']);
s().returnToAtlas();assert.equal(s().view,'body');s().select('heart');assert.equal(s().sex,'male');s().select('female_uterus');assert.equal(s().sex,'female');
s().set({quizBusy:true});s().set({sex:'male'});s().select('heart');assert.equal(s().sex,'female','an in-flight saved start must retain its donor');s().set({quizBusy:false});
const neutral=m.neutralFindState(s()),frame=m.neutralFindFrame(1,'female');
assert.equal(neutral.depth,0);assert.equal(neutral.selected,null);assert.deepEqual(frame.center,meta.center);

const log=console.info;console.info=()=>{};let maxSetupMs=0,completed=0;const pools={};
try{
 for(const format of ['click','identify','recall','function']){
  const settings={model:'female',format,system:'all',region:'all',count:10,timer:0,clickDifficulty:'beginner',difficulty:'guided'};
  assert(m.settingsSchema.safeParse(settings).success);
  for(const extra of [{model:'invented'},{userId:'other-user'},{score:100},{is_admin:true}])assert(!m.settingsSchema.safeParse({...settings,...extra}).success);
  pools[format]=female.filter(p=>!m.questionGate(p,format,'beginner')&&(format!=='function'||p.quizEligible)).length;
  const plan=m.createPlan(settings);assert.equal(plan.plan.length,10,format+' female server pool');
  for(const q of plan.plan){assert(m.inAtlas(m.anatomy[q.id],'female'));assert(q.options.every(id=>m.inAtlas(m.anatomy[id],'female')));assert.equal(q.options.length,['identify','function'].includes(format)?4:1)}
  const {model,...legacy}=settings;assert(m.createPlan(legacy).plan.every(q=>m.inAtlas(m.anatomy[q.id],'male')));
  s().set({quiz:null,mode:'quiz',settings});await s().startQuiz();assert.equal(s().quiz.questions.length,10);
  for(let index=0;index<10;index++){
   const q=s().quiz,p=m.anatomy[q.questions[index].id];assert.equal(q.index,index);assert.equal(p.sex,'female');
   if(format==='click'){
    assert.deepEqual(s().active,neutral.active);assert.equal(s().depth,neutral.depth);assert.equal(s().selected,null);assert.equal(s().camera.part,null);
    await s().readyFind();
   }else{
    const start=performance.now(),result=m.prepareRecognition(scenes.get(p.system),p,1,false,format);assert.equal(result.reason,null,p.id);
    assert.equal(result.prepared.meshes.length,m.recognitionGeometry(p).meshCount);
    for(const mesh of result.prepared.meshes){assert.equal(mesh.userData.recognitionTarget,p.id);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.transparent,false)}
    await s().readyIdentify(p.id);const ms=performance.now()-start+m.RECOGNITION_APPROACH_MS+34;maxSetupMs=Math.max(maxSetupMs,ms);assert(ms<300,format+' question exceeds setup budget');m.disposeRecognition(result.prepared);
   }
   await s().answer(format==='recall'?p.displayName:p.id);assert(s().quiz.feedback.correct);assert(m.grade(format,p.id,format==='recall'?p.displayName:p.id));
   await s().next();assert(s().quiz,'session disappeared');completed++;
  }
  assert(s().quiz.finished);assert.equal(s().quiz.answers.length,10);
 }
 // Changing donor after a finished run cannot carry its old result panel.
 s().set({sex:'male'});assert.equal(s().quiz,null);assert.equal(s().sex,'male');
 s().set({sex:'female',settings:{format:'click',system:'all',region:'all',count:10,timer:0}});s().set({settings:{format:'click',system:'all',region:'all',count:10,timer:0}});await s().startQuiz();
 s().set({sex:'male'});assert.equal(s().sex,'female','do not switch donors during a run');
 s().set({mode:'learn'});s().select('heart');assert.equal(s().sex,'male');s().set({mode:'quiz'});assert.equal(s().sex,'female','resume returns to the quiz donor');assert.deepEqual(s().active,neutral.active);
 const q=s().quiz,replacement=m.replacementQuestion(q.questions[0].id,q.questions.map(x=>x.id),1,'click','beginner',q.questions.map(x=>x.id));assert.equal(m.anatomy[replacement.id].sex,'female');
}finally{console.info=log}
console.log(JSON.stringify({sourceMeshes:names.size,selectableStructures:found.size,triangles,pools,completedQuestions:completed,maxWarmSetupMs:maxSetupMs,checks:'Separate donors, accurate bounds and orientation, real Draco meshes, female ghost context, layer controls, saved/local quiz filtering, 10-question sessions and pause/resume. CPU verification; browser rendering not measured here.'},null,2));
