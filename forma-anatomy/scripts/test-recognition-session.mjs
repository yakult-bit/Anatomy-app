import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:`export {useStore,anatomy,parts} from './src/store';export {recognitionGate,recognitionChoices} from './shared/recognition';export {recognitionReplacementPool} from './shared/recognition-recovery';export {replacementQuestion} from './server/quiz';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/recognition-session-test.mjs'});
const m=await import('../work/recognition-session-test.mjs');
const s=()=>m.useStore.getState();
let seed=27;const random=Math.random,info=console.info,events=[];
Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
console.info=message=>events.push(message);
async function start(){
 s().set({mode:'quiz',quiz:null,stats:{},quizBusy:false,settings:{format:'identify',system:'all',region:'all',count:10,timer:0}});
 await s().startQuiz();assert.equal(s().quiz.questions.length,10);
}
async function completeCurrent(correct=true){
 const q=s().quiz,id=q.questions[q.index].id;
 await s().readyIdentify(id);assert(s().identifyReady);
 await s().answer(correct?id:'Skipped');assert(s().quiz.feedback);
 await s().next();
}
const runs=[];
try{
 // Real catalogs, generated metadata and production state transitions. This
 // exact seed used to cancel every 2.4-aspect run after zero to two answers.
 for(const aspect of [.7,1,1.6,2.4]){
  for(let run=0;run<10;run++){
   await start();
   for(let step=0;step<60&&!s().quiz.finished;step++){
    assert(s().quiz,'A rejected structure must never return the user home');
    const q=s().quiz,p=m.anatomy[q.questions[q.index].id],reason=m.recognitionGate(p,aspect);
    if(reason)await s().rerollIdentify(reason,aspect);else await completeCurrent(q.index%3!==0);
    assert(s().quiz);assert.equal(s().quiz.questions.length,10);assert.equal(s().identifyIssue,null);
   }
   assert(s().quiz.finished);assert.equal(s().quiz.answers.length,10);
   assert.equal(Object.values(s().stats).reduce((n,v)=>n+v.attempts,0),10);
   runs.push({aspect,answers:s().quiz.answers.length});
  }
 }
 // More than three failures spread across a session must be recoverable:
 // retries are per question, while skipped IDs remain excluded across the run.
 await start();
 for(let i=0;i<10;i++){
  assert.equal(s().identifyAttempts,0);
  if(i<5){await s().rerollIdentify('model_unavailable',1.6);assert.equal(s().identifyAttempts,1);assert.equal(s().identifyIssue,null)}
  await completeCurrent();
 }
 assert.equal(s().quiz.answers.length,10);assert(s().quiz.finished);assert.equal(s().identifySkipped.length,5);
 // Repeated failures on ONE question pause that question, keep its number,
 // earlier answers and earned stats, and can resume to the normal 10/10 screen.
 await start();await completeCurrent();await completeCurrent(false);
 const previousAnswers=structuredClone(s().quiz.answers),previousStats=structuredClone(s().stats);
 for(let i=0;i<4;i++)await s().rerollIdentify('model_unavailable',1.6);
 assert(s().identifyIssue);assert.equal(s().quiz.index,2);assert.equal(s().quiz.questions.length,10);
 assert.deepEqual(s().quiz.answers,previousAnswers);assert.deepEqual(s().stats,previousStats);
 const paused=s().quiz;await s().rerollIdentify('setup_timeout',1.6);assert.equal(s().quiz,paused);
 await s().readyIdentify(paused.questions[2].id);assert.equal(s().identifyReady,false);
 await s().answer(paused.questions[2].id);assert.deepEqual(s().stats,previousStats);
 const revision=s().identifyRevision;s().retryIdentify();assert.equal(s().identifyIssue,null);assert.equal(s().identifyAttempts,0);assert.equal(s().identifyRevision,revision+1);
 assert.deepEqual(s().quiz.answers,previousAnswers);
 while(!s().quiz.finished)await completeCurrent();assert.equal(s().quiz.answers.length,10);
 // Exhausting candidates must also preserve the run rather than silently
 // shorten the question list, invent an answer, or clear the session.
 await start();await completeCurrent();const before=s().quiz;
 s().set({identifySkipped:m.parts.map(p=>p.id)});await s().rerollIdentify('model_unavailable',1.6);
 assert(s().identifyIssue);assert.equal(s().quiz,before);assert.equal(s().quiz.answers.length,1);
 // Server replacement policy uses trusted plan scope; fallback never expands
 // a system/region filter or changes another format's replacement policy.
 const candidates=m.parts.filter(p=>p.system==='skeletal'&&!m.recognitionGate(p,1.6));
 const target=candidates.find(p=>p.region==='head-neck'),neighbor=candidates.find(p=>p.region==='upper-limb');
 const excluded=m.parts.filter(p=>p.region===target.region).map(p=>p.id);
 const pool=m.recognitionReplacementPool(target,m.parts,excluded,1.6,[target,neighbor]);assert(pool.length);
 assert(pool.every(p=>p.system==='skeletal'&&p.region==='upper-limb'));
 const replacement=m.replacementQuestion(target.id,excluded,1.6,'identify','beginner',[target.id,neighbor.id]);
 assert(pool.some(p=>p.id===replacement.id));assert.equal(replacement.options.length,4);assert.equal(new Set(replacement.options).size,4);
 assert.throws(()=>m.replacementQuestion(target.id,excluded,1.6,'identify','beginner',[target.id]),e=>e.status===409);
 // A saved-session network failure preserves its ticket and existing answers.
 await start();await completeCurrent();const ticket=crypto.randomUUID();s().set({quiz:{...s().quiz,ticket}});
 const fetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'Try again.'},{status:503});
 try{await s().rerollIdentify('setup_timeout',1.6)}finally{globalThis.fetch=fetch}
 assert(s().identifyIssue);assert.equal(s().quiz.ticket,ticket);assert.equal(s().quiz.answers.length,1);
 // An obsolete async replacement cannot restart a session the user ended.
 await start();const pending=s().rerollIdentify('model_unavailable',1.6);s().set({quiz:null});await pending;assert.equal(s().quiz,null);assert.equal(s().quizBusy,false);
}finally{Math.random=random;console.info=info}
console.log(JSON.stringify({completedTenQuestionSessions:runs.length,aspectRatios:[.7,1,1.6,2.4],verified:['per-question retry budget','replacement scope','pause/resume with earlier answers','saved-session request failure','no scoring for rejected targets','cancelled-session race'],note:'Production state/gate/server-policy regression. Browser rendering is tested separately.'},null,2));
