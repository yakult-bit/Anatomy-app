import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as THREE from 'three';
await build({stdin:{contents:`export {useStore,anatomy,parts,studyParts,SYSTEMS} from './src/store';export * from './shared/visual-quiz';export * from './src/identify-state';export * from './src/find-render-runtime';export * from './src/find-visibility';export * from './src/FindInteraction';export {createPlan,grade} from './server/quiz';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/quiz-modes-test.mjs',logLevel:'silent'});
const m=await import('../work/quiz-modes-test.mjs'),s=()=>m.useStore.getState();
const info=console.info;console.info=()=>{};let runs=0;
try{
 for(const format of ['click','recall','function'])for(const aspect of [.7,1,1.6,2.4]){
  s().set({quiz:null,quizBusy:false,stats:{},settings:{format,system:'all',region:'all',count:10,timer:0,clickDifficulty:'beginner'}});
  await s().startQuiz();assert.equal(s().quiz.questions.length,10);
  for(let i=0;i<10;i++){
   let q=s().quiz;assert(q);assert.equal(q.index,i);
   let reason=m.questionGate(m.anatomy[q.questions[i].id],format,'beginner',aspect);
   while(reason&&!s().identifyIssue){await s().rerollIdentify(reason,aspect);q=s().quiz;reason=m.questionGate(m.anatomy[q.questions[i].id],format,'beginner',aspect)}
   assert(!s().identifyIssue,JSON.stringify({format,aspect,reason}));
   const id=q.questions[i].id;
   // One failed asset on every other question used to exhaust a session-wide
   // cap. Now retries are bounded per question and prior scores survive.
   if(i%2===0){await s().rerollIdentify('model_unavailable',aspect);if(s().identifyIssue){assert.equal(m.questionGate(m.anatomy[s().quiz.questions[i].id],format,'beginner',aspect),null);s().retryIdentify()}}
   q=s().quiz;const target=m.anatomy[q.questions[i].id];
   await s().answer(target.id);assert.equal(s().quiz.feedback,null,'answers wait for the scene');
   if(format==='click')await s().readyFind();else await s().readyIdentify(target.id);
   assert.equal(m.isIdentifySceneActive(s()),format!=='click');
   await s().answer(format==='recall'?target.displayName:target.id);assert(s().quiz.feedback.correct);
   await s().next();assert(s().quiz,'a question failure must never erase the run');
  }
  assert(s().quiz.finished);assert.equal(s().quiz.answers.length,10);runs++;
 }
 for(const format of ['recall','function','click']){
  s().set({quiz:null,settings:{format,system:'all',region:'all',count:10,timer:0}});await s().startQuiz();
  const q=s().quiz;s().set({identifyAttempts:3});await s().rerollIdentify('setup_timeout',1);
  assert(s().identifyIssue);assert.equal(s().quiz,q);s().retryIdentify();assert(!s().identifyIssue);assert.equal(s().quiz.format,format);
 }
 // The exact screenshot structures retain their requested format, including
 // retry-missed on a detailed structure with no four-name recognition pool.
 for(const [format,id] of [['recall','z_detail_brain_postcentral_gyrusr'],['function','foot_left']]){
  s().set({quiz:null,settings:{format,system:'all',region:'all',count:10,timer:0}});await s().startQuiz([id]);
  assert(s().quiz);assert.equal(s().quiz.format,format);assert.equal(s().quiz.questions[0].id,id);
  const plan=m.createPlan({...s().settings,reviewIds:[id]});assert.equal(plan.format,format);assert.equal(plan.plan[0].id,id);
 }
 for(const p of m.studyParts){
  const choices=m.functionChoices(p,m.parts);assert.equal(choices.length,3);
  const texts=[p.id,...choices].map(id=>m.anatomy[id].function.toLowerCase());assert.equal(new Set(texts).size,4,p.id+' has duplicate function answers');
 }
 // Peeling actually removes skin from pickable candidates, and a hidden
 // target is only forced visible once feedback is committed.
 const skin=m.parts.find(p=>p.system==='integumentary'&&p.layer===0);
 s().set({mode:'learn',quiz:null});s().peel(0);assert.equal(s().depth,0);s().peel(2);
 assert(s().active.muscular&&s().active.skeletal);assert.equal(s().depth,2);
 const alpha=m.findOpacity(skin,m.anatomy.heart,{base:skin.layer>=s().depth?1:0,isTarget:false,isWrong:false,hint:false,feedback:false});assert.equal(alpha,0);
 assert.equal(m.findOpacity(m.anatomy.heart,m.anatomy.heart,{base:0,isTarget:true,isWrong:false,hint:false,feedback:false}),0);
 s().peel(5);assert.equal(s().depth,5);
 // Exercise the real render dispatcher: no translucent background may draw in
 // either answer pass; both answers stay opaque and restore visibility after.
 const scene=new THREE.Scene(),objects=[0,1,2].map(layer=>{const g=new THREE.Group();g.userData.findLayer=layer;const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial({transparent:!layer,opacity:layer?1:.12}));g.add(mesh);scene.add(g);return mesh});
 const frames=[],fake={autoClear:true,clear(){},clearDepth(){},render(scene){const visible=[];scene.traverseVisible(o=>{if(o.isMesh)visible.push(objects.indexOf(o))});frames.push(visible)}};
 m.renderFindLayers(fake,scene,new THREE.PerspectiveCamera());assert.deepEqual(frames,[[0],[1],[2]]);assert(objects.every(o=>o.visible));assert(fake.autoClear);
 assert.equal(objects[1].material.opacity,1);assert.equal(objects[2].material.opacity,1);
 fake.render=()=>{throw Error('context lost')};assert.throws(()=>m.renderFindLayers(fake,scene,new THREE.PerspectiveCamera()));assert(objects.every(o=>o.visible));assert(fake.autoClear);
}finally{console.info=info}
console.log(JSON.stringify({completedTenQuestionSessions:runs,verified:['Recall and Function share the contextual subject renderer','screenshot targets keep their quiz format','four distinct functions','per-question recovery in every mode','layer removal and target access','separate ghost/red/green rendering passes'],visualBrowserVerification:'pending'},null,2));
