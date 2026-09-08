import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as THREE from 'three';
await build({stdin:{contents:`export {useStore,useHoverStore,anatomy,parts,SYSTEMS} from './src/store';export * from './src/find-state';export * from './src/find-visibility';export {requiredSystems,paintFindMaterial,tintMaterial} from './src/model-runtime';export {pickStructure} from './src/FindInteraction';export {CLICK_CORRECT,CLICK_WRONG,distinction} from './shared/click-quiz';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/find-no-clues.mjs',logLevel:'silent'});
const m=await import('../work/find-no-clues.mjs'),s=()=>m.useStore.getState();
const info=console.info;console.info=()=>{};
const baseline=()=>{const x=s();return {active:x.active,opacity:x.opacity,depth:x.depth,selected:x.selected,hovered:m.useHoverStore.getState().hovered,hidden:x.hidden,solo:x.solo,xray:x.xray,labels:x.labels,coverings:x.coverings,overlay:x.overlay,view:x.view,preset:x.camera.preset,part:x.camera.part}};
try{
 s().set({mode:'learn',quiz:null,quizBusy:false,selected:'heart',depth:4,xray:true,solo:'heart',hidden:['femur_left'],settings:{format:'click',system:'all',region:'all',count:10,timer:0}});
 m.useHoverStore.getState().setHovered('heart');await s().startQuiz();assert.equal(s().quiz.questions.length,10);
 const expected=baseline();assert.equal(expected.depth,0);assert.equal(expected.selected,null);assert.equal(expected.hovered,null);assert.equal(expected.part,null);
 let materialChecks=0;
 for(let i=0;i<10;i++){
  const q=s().quiz,target=m.anatomy[q.questions[i].id];assert.deepEqual(baseline(),expected,`Question ${i+1} leaked previous exploration`);
  assert.equal(m.isFindQuestion(s()),true);
  const neutral=m.neutralFindFrame(1.4);assert.deepEqual(neutral,m.neutralFindFrame(1.4));
  assert.deepEqual(m.requiredSystems(s()),['skeletal','muscular','integumentary']);
  for(const p of m.parts){
   const base=s().active[p.system]&&p.layer>=s().depth?1:0,isTarget=p.id===target.id||p.parentId===target.id;
   assert.equal(m.findOpacity(p,target,{base,isTarget,isWrong:false,hint:false,feedback:false}),base,p.id+' reveals the target');
   assert.equal(m.findRenderLayer(isTarget,false,false),0);
  }
  // Restore the real material used for a prior correct/wrong/hovered piece.
  for(const previous of [m.CLICK_CORRECT,m.CLICK_WRONG,null]){
   const base=new THREE.Color('#b67565'),material=new THREE.MeshStandardMaterial({color:base});
   m.paintFindMaterial(material,base,true,previous,false);
   m.paintFindMaterial(material,base,false,null,false);
   assert(material.color.equals(base));assert.equal(material.emissive.getHex(),0);assert.equal(material.emissiveIntensity,0);materialChecks++;
  }
  await s().readyFind();
  const beforeSelect=baseline(),camera=s().camera;s().select(target.id,true);assert.deepEqual(baseline(),beforeSelect,'search/selection bypassed Find');
  s().hint();assert.equal(s().quiz.hint,1);assert.equal(s().quiz.feedback,null);assert.equal(s().camera,camera);
  assert.equal(m.findOpacity(target,target,{base:0,isTarget:true,isWrong:false,hint:true,feedback:false}),0,'hint unhid the target');
  const elsewhere=m.parts.find(p=>p.region!==target.region);assert.equal(m.findOpacity(elsewhere,target,{base:1,isTarget:false,isWrong:false,hint:true,feedback:false}),.07);
  s().toggleSystem(target.system);s().set({active:{...s().active,[target.system]:false},depth:5});
  assert(!m.requiredSystems(s()).includes(target.system));assert.equal(m.findOpacity(target,target,{base:0,isTarget:true,isWrong:false,hint:false,feedback:false}),0);
  // Second hint is a reveal (not a wrong pick); it may now override layers.
  s().hint();assert(s().quiz.feedback.revealed);assert.equal(s().quiz.feedback.correct,false);
  assert(m.requiredSystems(s()).includes(target.system));assert.equal(m.findOpacity(target,target,{base:0,isTarget:true,isWrong:false,hint:false,feedback:true}),1);
  assert.equal(m.findRenderLayer(true,false,true),2);
  // Seed the exact residual state that used to leak into the next question.
  s().set({selected:target.id,depth:4,labels:true,xray:true,solo:target.id,camera:{preset:'posterior',part:target.id,token:s().camera.token+1}});m.useHoverStore.getState().setHovered(target.id);
  await s().next();
 }
 assert(s().quiz.finished);assert.equal(s().quiz.answers.length,10);
 // Fit two widely separated answers, rather than flying off and losing the pick.
 for(const ids of [['heart','foot_left'],['kidney_right','skull'],['femur_right','tibia_left']])for(const aspect of [.5,1,2.4]){
  const [correct,picked]=ids.map(id=>m.anatomy[id]),fit=m.findRevealFrame(correct,picked,aspect),c=new THREE.PerspectiveCamera(42,aspect,.00001,250),center=new THREE.Vector3(...fit.center);
  c.position.copy(center).addScaledVector(new THREE.Vector3(...fit.direction).normalize(),fit.distance);c.lookAt(center);c.updateMatrixWorld(true);
  for(const part of [correct,picked])for(let bits=0;bits<8;bits++){
   const v=new THREE.Vector3(...[0,1,2].map(i=>bits&(1<<i)?part.bounds.max[i]:part.bounds.min[i])).project(c);
   assert(Math.abs(v.x)<.85&&Math.abs(v.y)<.85&&v.z>-1&&v.z<1,part.id+' is cropped in reveal');
  }
  const contrast=m.distinction(correct,picked);assert(contrast.includes(correct.displayName)&&contrast.includes(picked.displayName));
 }
 // Search is restored in Learn; its normal hover material still works.
 s().set({mode:'learn',quiz:null});s().select('heart',true);assert.equal(s().selected,'heart');
 const material=new THREE.MeshStandardMaterial(),base=material.color.clone();m.tintMaterial(material,base,true,false);assert(!material.color.equals(base));
 // Visiting Learn mid-question must not carry its selection back into Find.
 await s().startQuiz(['heart']);s().set({mode:'learn'});s().select('heart',true);m.useHoverStore.getState().setHovered('heart');
 s().set({mode:'quiz'});assert.deepEqual(baseline(),expected);assert.equal(s().findReady,false);
 console.info=info;console.log(JSON.stringify({questionsWithIdenticalNeutralStarts:10,targetIndependentVisibilityChecks:10*m.parts.length,priorMaterialStatesCleared:materialChecks,verified:['no target loading/pick/draw priority','search blocked only during Find','hint does not move camera or open layers','revealed outcome retained','both feedback structures fit the viewport','Learn selection and hover preserved']},null,2));
}finally{console.info=info}
