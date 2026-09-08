import {isFindQuestion,neutralFindState} from './find-state';
import {isVisualFormat,questionGate,questionChoices} from '../shared/visual-quiz';
import {logIdentifySkip} from '../shared/identify';
import {RECOGNITION_LOAD_TIMEOUT_MS} from '../shared/recognition';
import {recognitionReplacementPool,RECOGNITION_AUTO_RETRIES} from '../shared/recognition-recovery';
import {explorationSnapshot,isIdentifyQuestion} from './identify-state';
import {api,useAccount,accountError} from './account-state';
import {accountGeneration,applySaved,type SavedData} from './account-sync';
import {create} from 'zustand';
import {useShallow} from 'zustand/react/shallow';
import {persist,createJSONStorage} from 'zustand/middleware';
import {atlasContent as raw,atlasOf,inAtlas,hasSystem} from '../shared/atlas';
import {initialAtlasState} from './atlas-state';
import modelInfo from './data/model-info.json';
export {modelInfo};
export const SYSTEMS=[['skeletal','Skeletal','#c5b694'],['muscular','Muscular','#b67565'],['cardiovascular','Cardiovascular','#c46563'],['respiratory','Respiratory','#a98dba'],['digestive','Digestive','#c19b6b'],['nervous','Nervous','#d5b957'],['urinary','Urinary','#bd8295'],['reproductive','Reproductive','#ad91aa'],['endocrine','Endocrine','#c0a37a'],['lymphatic','Lymphatic','#8da971'],['integumentary','Integumentary','#b7a391']] as const;
export type System=typeof SYSTEMS[number][0];
export type Part={landmarks?:string;clinical_notes?:string;related_ids?:string[];clickGeometry?:{meshes:number;dominantFraction:number;coverage?:number;clusters?:number};distinctions?:Record<string,string>;id:string;meshName:string;displayName:string;latinName:string;system:System;region:string;description:string;function:string;clinicalNotes:string;relatedIds:string[];layer:number;sex:string;aliases:string[];position:number[];size:number;available?:boolean;quizEligible?:boolean;parentId?:string;covering?:boolean;source?:string;sourceUrl?:string;sourceModelId?:string;license?:string;licenseUrl?:string;textSource?:string;textLicense?:string;lessonSources?:string[];annotationIssue?:string;quizExcluded?:boolean;sourceMeshNames?:string[];bounds?:{min:number[];max:number[]}};
export const anatomy=raw as Record<string,Part>;
export const parts=Object.values(anatomy).filter(p=>p.available!==false);
export const studyParts=parts.filter(p=>p.quizEligible!==false);
export const REGIONS=[['all','All regions'],['head-neck','Head & neck'],['thorax','Thorax'],['abdomen','Abdomen'],['upper-limb','Upper limb'],['lower-limb','Lower limb'],['pelvis','Pelvis']];
export const LAYERS=['Skin','Subcutaneous fat','Superficial muscle','Deep muscle','Organs','Skeleton'];
export type Format='click'|'identify'|'recall'|'function';
export type Settings={format:Format;system:string;region:string;count:number;timer:number;clickDifficulty?:'beginner'|'advanced';difficulty?:'guided'|'strict'};
export type Question={id:string;options:string[]};
export type Answer={revealed?:boolean;id:string;correct:boolean;chosen:string};
export type Quiz={hint?:number;ticket?:string;activeAt?:number;questions:Question[];index:number;answers:Answer[];feedback:Answer|null;finished:boolean;format:Format;timer:number};
export type Stat={revealed?:number;attempts:number;correct:number;run:number;due:number;last:number};
const defaults=Object.fromEntries(SYSTEMS.map(([id])=>[id,['skeletal','muscular'].includes(id)])) as Record<System,boolean>;
export type AtlasView='body'|'board'|'inspect';
const shuffle=<T,>(a:T[])=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b};
export function normalize(s:string){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()}
export function recallMatches(input:string,p:Part){const a=normalize(input);if(!a)return false;return [p.displayName,p.latinName,...p.aliases].some(s=>{const b=normalize(s);if(a===b)return true;if(b.length<5)return false;if((b.includes('left')&&!a.includes('left'))||(b.includes('right')&&!a.includes('right')))return false;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length]<=(b.length>7?2:1)})}
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function studyStreak(days:string[]){let n=0;const d=new Date();if(!days.includes(dayKey(d)))d.setDate(d.getDate()-1);while(days.includes(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
let storageFailed=false;
const safeStorage={getItem:(n:string)=>{try{return localStorage.getItem(n)}catch{storageFailed=true;return null}},setItem:(n:string,v:string)=>{try{localStorage.setItem(n,v)}catch{storageFailed=true}},removeItem:(n:string)=>{try{localStorage.removeItem(n)}catch{storageFailed=true}}};
export const hasStorageError=()=>storageFailed;
type State={findSnapshot:Partial<State>|null;identifyAttempts:number;identifyIssue:string|null;identifyRevision:number;retryIdentify:()=>void;findReady:boolean;findSkipped:string[];readyFind:()=>void;rerollFind:(reason:string,aspect:number)=>void;reviewDue:string[];review:(id:string)=>void;hint:()=>void;identifySnapshot:Partial<State>|null;identifyReady:boolean;identifySkipped:string[];quizBusy:boolean;view:AtlasView;returnView:'body'|'board';boardSystem:System;boardRegion:string;boardQuery:string;boardPage:number;boardColumns:number;quality:'smooth'|'detail';popOnSelect:boolean;autoRotate:boolean;coverings:boolean;sex:'male'|'female';mode:'learn'|'quiz';active:Record<System,boolean>;opacity:Record<System,number>;depth:number;selected:string|null;hovered:string|null;hidden:string[];solo:string|null;xray:boolean;labels:boolean;focusOnSelect:boolean;camera:{preset:string;part:string|null;token:number};overlay:string;bookmarks:string[];stats:Record<string,Stat>;studyDays:string[];quiz:Quiz|null;settings:Settings;loaded:string[];loadErrors:string[];
readyIdentify:(id:string)=>void;rerollIdentify:(reason:string,aspect?:number)=>void;setView:(view:AtlasView)=>void;returnToAtlas:()=>void;peel:(depth:number)=>void;preset:(name:'muscles'|'organs'|'skeleton'|'all')=>void;
set:(v:Partial<State>)=>void;toggleSystem:(id:System)=>void;select:(id:string,focus?:boolean)=>void;reset:()=>void;showAll:(show:boolean)=>void;bookmark:(id:string)=>void;startQuiz:(ids?:string[])=>void;answer:(answer:string)=>void;next:()=>void;record:(id:string,correct:boolean,revealed?:boolean)=>void;setLoaded:(id:string,failed?:boolean)=>void};
export const useStore=create<State>()(persist((set,get)=>({findSnapshot:null,identifyAttempts:0,identifyIssue:null,identifyRevision:0,findReady:false,findSkipped:[],reviewDue:[],identifySnapshot:null,identifyReady:false,identifySkipped:[],quizBusy:false,view:'body',returnView:'body',boardSystem:'muscular',boardRegion:'all',boardQuery:'',boardPage:0,boardColumns:3,quality:'smooth',popOnSelect:true,autoRotate:false,coverings:false,sex:'male',mode:'learn',active:{...defaults},opacity:Object.fromEntries(SYSTEMS.map(([id])=>[id,100])) as Record<System,number>,depth:2,selected:'deltoid_right',hovered:null,hidden:[],solo:null,xray:false,labels:true,focusOnSelect:false,camera:{preset:'anterior',part:null,token:0},overlay:'none',bookmarks:[],stats:{},studyDays:[],quiz:null,settings:{format:'identify',system:'all',region:'all',count:10,timer:0,difficulty:'guided',clickDifficulty:'beginner'},loaded:[],loadErrors:[],set:v=>{
 const s=get();
 if(v.sex&&v.sex!==s.sex){if(s.quizBusy||s.quiz&&!s.quiz.finished)return;useHoverStore.getState().setHovered(null);set({...v,...initialAtlasState(s,v.sex),quiz:null,findSnapshot:null,identifySnapshot:null,identifyIssue:null,settings:{...s.settings,system:'all',region:'all'}});return}
 const leaving=isIdentifyQuestion(s)&&(v.quiz===null||v.mode==='learn');
 const leavingFind=s.quiz?.format==='click'&&(v.quiz===null||v.mode==='learn');
 const resumingAtlas=v.mode==='quiz'&&s.mode!=='quiz'&&s.quiz&&!s.quiz.finished?atlasOf(anatomy[s.quiz.questions[s.quiz.index].id]):s.sex;
 const resumed=resumingAtlas===s.sex?s:{...s,...initialAtlasState(s,resumingAtlas)};
 const resumingFind=v.mode==='quiz'&&s.mode!=='quiz'&&isFindQuestion({...s,mode:'quiz'});
 if(resumingFind)useHoverStore.getState().setHovered(null);
 set({... (leaving?s.identifySnapshot:{}),...(leavingFind?s.findSnapshot:{}),...v,
  ...(leavingFind?{findSnapshot:null}:{}),...(leaving?{identifySnapshot:null,identifyReady:false}:{}),
  ...(v.mode==='quiz'?{...(resumingAtlas!==s.sex?initialAtlasState(s,resumingAtlas):{}),view:'body' as const,autoRotate:false}:{}),
  ...(resumingFind?{...neutralFindState(resumed),findSnapshot:explorationSnapshot(resumed),findReady:false}:{})});
},
setView:view=>{const s=get();if(view==='inspect'&&!s.selected)return;set({view,returnView:view==='inspect'?(s.view==='inspect'?s.returnView:s.view):view,hovered:null,autoRotate:false,camera:{preset:'anterior',part:null,token:s.camera.token+1},...(view==='board'?{overlay:'none'}:{})})},
returnToAtlas:()=>{const s=get();set({view:s.returnView,hovered:null,autoRotate:false,camera:{preset:'anterior',part:null,token:s.camera.token+1}})},
peel:depth=>{const sex=get().sex;const systems=sex==='female'?(depth===5?['skeletal']:SYSTEMS.filter(([id])=>hasSystem(sex,id)).map(([id])=>id)):depth===0?['integumentary','skeletal']:depth<4?['muscular','skeletal']:depth===5?['skeletal']:SYSTEMS.map(([id])=>id).filter(id=>!['integumentary','muscular'].includes(id));set({depth,view:'body',returnView:'body',selected:null,autoRotate:false,hidden:[],solo:null,xray:false,coverings:false,active:Object.fromEntries(SYSTEMS.map(([id])=>[id,systems.includes(id)])) as Record<System,boolean>,opacity:Object.fromEntries(SYSTEMS.map(([id])=>[id,100])) as Record<System,number>})},
preset:name=>{const s=get();const chosen=name==='muscles'?['skeletal','muscular']:name==='skeleton'?['skeletal']:name==='organs'?['cardiovascular','respiratory','digestive','urinary','reproductive','endocrine']:SYSTEMS.map(([id])=>id);set({view:'body',returnView:'body',autoRotate:false,active:Object.fromEntries(SYSTEMS.map(([id])=>[id,hasSystem(s.sex,id)&&chosen.includes(id)])) as Record<System,boolean>,opacity:Object.fromEntries(SYSTEMS.map(([id])=>[id,100])) as Record<System,number>,depth:name==='all'?0:2,hidden:[],solo:null,xray:false,coverings:name==='all',camera:{preset:'anterior',part:null,token:s.camera.token+1}})},
toggleSystem:id=>set(s=>({active:{...s.active,[id]:hasSystem(s.sex,id)&&!s.active[id]},solo:null,view:s.view==='inspect'?s.returnView:s.view,autoRotate:false,camera:isFindQuestion(s)?s.camera:{preset:s.camera.preset,part:null,token:s.camera.token+1}})),
select:(id,focus=false)=>{if(isFindQuestion(get()))return;const p=anatomy[id];if(!p||p.available===false||get().quizBusy&&atlasOf(p)!==get().sex)return;const prior=get(),changed=atlasOf(p)!==prior.sex,s=changed?{...prior,...initialAtlasState(prior,atlasOf(p))}:prior;const inspect=s.mode==='learn'&&(s.popOnSelect||s.view==='inspect'||s.view==='board');set({...(changed?initialAtlasState(prior,atlasOf(p)):{}),selected:id,view:inspect?'inspect':s.view,returnView:s.view==='inspect'?s.returnView:s.view,autoRotate:false,sex:atlasOf(p),active:{...s.active,[p.system]:true},hidden:s.hidden.filter(x=>x!==id&&x!==p.parentId),solo:null,depth:Math.min(s.depth,p.layer),camera:inspect||focus||s.focusOnSelect?{preset:inspect?'anterior':s.camera.preset,part:id,token:s.camera.token+1}:s.camera})},
reset:()=>set(s=>({... (s.view==='board'?{boardPage:0,boardQuery:'',boardRegion:'all'}:{}),camera:{preset:'anterior',part:null,token:s.camera.token+1}})),
showAll:show=>set(s=>({view:s.view==='inspect'?s.returnView:s.view,autoRotate:false,active:Object.fromEntries(SYSTEMS.map(([id])=>[id,show&&hasSystem(s.sex,id)])) as Record<System,boolean>,depth:0,hidden:[],solo:null,xray:false,coverings:show,opacity:Object.fromEntries(SYSTEMS.map(([id])=>[id,100])) as Record<System,number>,camera:{preset:'anterior',part:null,token:s.camera.token+1}})),
hint:()=>{const s=get(),q=s.quiz;if(!q||q.format!=='click'||q.feedback||s.quizBusy||!s.findReady)return;if(!q.hint)set({quiz:{...q,hint:1}});else void s.answer('__revealed__')},
review:async id=>{if(!anatomy[id])return;if(!useAccount.getState().profile){useAccount.getState().set({open:true});return}const g=accountGeneration();try{await api('review',{structureId:id});if(g===accountGeneration())set(s=>({reviewDue:[...new Set([...s.reviewDue,id])],bookmarks:[...new Set([...s.bookmarks,id])]}))}catch(e){accountError(e)}},
bookmark:async id=>{if(!anatomy[id])return;if(!useAccount.getState().profile){useAccount.getState().set({open:true});return}const g=accountGeneration(),saved=!get().bookmarks.includes(id);try{await api('bookmarks',{structureId:id,saved});if(g===accountGeneration())set(s=>({bookmarks:saved?[...new Set([...s.bookmarks,id])]:s.bookmarks.filter(x=>x!==id)}))}catch(e){accountError(e)}},
record:(id,correct,revealed=false)=>set(s=>{const old=s.stats[id]||{attempts:0,correct:0,run:0,due:0,last:0};const run=correct?old.run+1:0;const delay=correct?[1,3,7,14,30][Math.min(run-1,4)]*86400000:0;const date=dayKey();return {stats:{...s.stats,[id]:{attempts:old.attempts+1,revealed:(old.revealed||0)+Number(revealed),correct:old.correct+Number(correct),run,due:Date.now()+delay,last:Date.now()}},studyDays:s.studyDays.includes(date)?s.studyDays:[...s.studyDays,date]}}),
startQuiz:async ids=>{
 const s=get();if(s.quizBusy)return;const snapshot=explorationSnapshot(s);
 let remote:{ticket:string;questions:Question[];format:Format;timer:number;activeAt:number}|undefined;
 if(useAccount.getState().profile){const g=accountGeneration();set({quizBusy:true});try{remote=await api('quiz/start',{...s.settings,model:s.sex,...(ids?{reviewIds:ids.slice(0,50)}:{})});if(g!==accountGeneration())return}catch(e){accountError(e);return}finally{set({quizBusy:false})}}
 const format=remote?.format||s.settings.format;
 let questions=remote?.questions;
 if(!questions){
  const eligible=(format==='function'||format==='click'&&s.settings.clickDifficulty!=='advanced'?studyParts:parts).filter(p=>inAtlas(p,s.sex));
  const pool=shuffle(ids?eligible.filter(p=>ids.includes(p.id)):eligible.filter(p=>(s.settings.system==='all'||p.system===s.settings.system)&&(s.settings.region==='all'||p.region===s.settings.region)));
  questions=[];const count=ids?Math.min(ids.length,50):s.settings.count;
  for(const p of pool){if(questions.length>=count)break;const reason=questionGate(p,format,s.settings.clickDifficulty);
   if(reason){console.info(JSON.stringify({event:format+'_question_skipped',structure:p.id,reason}));continue}
   const choices=questionChoices(p,eligible,format);if(format==='function'&&choices.length<3)continue;
   questions.push({id:p.id,options:shuffle([p.id,...choices])});
  }
 }
 if(!questions.length){set({quiz:null});accountError(Error('No fair questions match these filters. Choose another system or region.'));return;}
 const quiz:Quiz={...(remote?{ticket:remote.ticket,activeAt:remote.activeAt}:{}),questions,index:0,answers:[],feedback:null,finished:false,format,timer:s.settings.timer};
 if(format==='click'){useHoverStore.getState().setHovered(null);set({...neutralFindState(s),findSnapshot:snapshot,identifySkipped:[],identifyAttempts:0,identifyIssue:null,mode:'quiz',view:'body',autoRotate:false,findReady:false,findSkipped:[],quiz});return}
 if(isVisualFormat(format)){set({mode:'quiz',identifySnapshot:snapshot,identifyReady:false,identifySkipped:[],identifyAttempts:0,identifyIssue:null,quiz});return}

},
answer:async input=>{const s=get(),q=s.quiz;if(!q||q.finished||q.feedback||s.quizBusy||(isVisualFormat(q.format)&&!s.identifyReady)||(q.format==='click'&&!s.findReady))return;if(q.ticket){const g=accountGeneration();set({quizBusy:true});try{const data=await api<SavedData&{feedback:Answer}>('quiz/answer',{ticket:q.ticket,index:q.index,answer:input.slice(0,160)});if(g!==accountGeneration()||get().quiz!==q)return;applySaved(data);set({... (isVisualFormat(q.format)?s.identifySnapshot:{selected:data.feedback.id}),identifySnapshot:null,identifyReady:false,quiz:{...q,feedback:data.feedback,answers:[...q.answers,data.feedback]}})}catch(e){accountError(e)}finally{set({quizBusy:false})}return;}const target=q.questions[q.index].id;const revealed=q.format==='click'&&input==='__revealed__';const correct=q.format==='recall'?recallMatches(input,anatomy[target]):input===target||q.format==='click'&&anatomy[input]?.parentId===target;const a={id:target,correct,chosen:input,revealed};s.record(target,correct,revealed);set({... (isVisualFormat(q.format)?s.identifySnapshot:{selected:target}),identifySnapshot:null,identifyReady:false,quiz:{...q,feedback:a,answers:[...q.answers,a]}})},
next:async()=>{const s=get(),q=s.quiz;if(!q||!q.feedback||s.quizBusy)return;let activeAt:number|undefined;if(q.ticket&&q.index<q.questions.length-1){const g=accountGeneration();set({quizBusy:true});try{const response=await api<{activeAt:number}>('quiz/next',{ticket:q.ticket,index:q.index+1});if(g!==accountGeneration()||get().quiz!==q)return;activeAt=response.activeAt}catch(e){accountError(e);return}finally{set({quizBusy:false})}}if(q.index===q.questions.length-1)set({...(q.format==='click'?s.findSnapshot:{}),findSnapshot:null,quiz:{...q,finished:true}});else if(isVisualFormat(q.format))set({identifySnapshot:explorationSnapshot(get()),identifyReady:false,identifyAttempts:0,identifyIssue:null,quiz:{...q,activeAt,index:q.index+1,feedback:null}});else {useHoverStore.getState().setHovered(null);set({...neutralFindState(s),identifyAttempts:0,identifyIssue:null,findReady:false,quiz:{...q,hint:0,activeAt,index:q.index+1,feedback:null}})}},
readyFind:async()=>{const s=get(),q=s.quiz;if(!q||s.mode!=='quiz'||q.format!=='click'||q.feedback||s.findReady||s.identifyIssue)return;let activeAt=Date.now();if(q.ticket){try{const r=await api<{activeAt:number}>('quiz/ready',{ticket:q.ticket,index:q.index},true,AbortSignal.timeout(RECOGNITION_LOAD_TIMEOUT_MS));activeAt=r.activeAt}catch(e){accountError(e);return}}if(get().quiz===q)set({findReady:true,quiz:{...q,activeAt}})},
rerollFind:async(reason,aspect)=>{await get().rerollIdentify(reason,aspect)},
readyIdentify:async id=>{const s=get(),q=s.quiz;if(!isIdentifyQuestion(s)||!q||s.identifyIssue||q.questions[q.index].id!==id)return;let activeAt=Date.now();if(q.ticket){try{const response=await api<{activeAt:number}>('quiz/ready',{ticket:q.ticket,index:q.index},true,AbortSignal.timeout(RECOGNITION_LOAD_TIMEOUT_MS));activeAt=response.activeAt}catch(e){accountError(e);return}}if(get().quiz===q)set({identifyReady:true,quiz:{...q,activeAt}})},
retryIdentify:()=>{
 const s=get(),q=s.quiz;if(!q||s.mode!=='quiz'||q.finished||q.feedback||s.quizBusy||!s.identifyIssue)return;
 set({identifyIssue:null,identifyAttempts:0,identifyReady:false,identifyRevision:s.identifyRevision+1,findReady:false,loadErrors:[],quiz:{...q,activeAt:undefined}});
},
rerollIdentify:async (reason,aspect=1)=>{
 const s=get(),q=s.quiz;if(!q||s.mode!=='quiz'||q.finished||q.feedback||s.quizBusy||s.identifyIssue)return;
 const id=q.questions[q.index].id,skipped=[...new Set([...s.identifySkipped,id])],attempts=s.identifyAttempts+1;logIdentifySkip(id,reason);
 set({findReady:false,identifyReady:false,identifySkipped:skipped,identifyAttempts:attempts,quizBusy:true});
 // Yield out of React's layout phase; bounded retries belong to this question,
 // not to the whole ten-question session.
 await new Promise(resolve=>setTimeout(resolve,0));
 if(get().quiz!==q){set({quizBusy:false});return}
 let replacement:Question|undefined;
 try{
  if(attempts<=RECOGNITION_AUTO_RETRIES){
   if(q.ticket){const result=await api<{question:Question}>('quiz/reroll',{ticket:q.ticket,index:q.index,reason,aspect:Math.max(.05,Math.min(10,aspect))},true,AbortSignal.timeout(RECOGNITION_LOAD_TIMEOUT_MS));replacement=result.question;}
   else{
    const pool=recognitionReplacementPool(anatomy[id],(q.format==='function'?studyParts:parts).filter(p=>inAtlas(p,s.sex)),[...skipped,...q.questions.map(x=>x.id)],aspect,q.questions.map(x=>anatomy[x.id]),(p,a)=>questionGate(p,q.format,s.settings.clickDifficulty,a));
    const p=shuffle(pool)[0];if(p)replacement={id:p.id,options:shuffle([p.id,...questionChoices(p,parts.filter(x=>inAtlas(x,s.sex)),q.format)])};
   }
  }
 }catch(e){accountError(e)}
 if(get().quiz!==q){set({quizBusy:false});return}
 if(replacement){const questions=q.questions.slice();questions[q.index]=replacement;set({quizBusy:false,quiz:{...q,questions,activeAt:undefined}})}
 else{
  // Never erase answered questions because a model, viewport or request failed.
  // Stop automatic retries and leave an explicit way to resume this same run.
  set({quizBusy:false,identifyReady:false,identifyIssue:'This structure could not be prepared. Try again to continue your session.'});
 }
},
setLoaded:(id,failed=false)=>set(s=>failed?{loadErrors:[...new Set([...s.loadErrors,id])]}:{loaded:[...new Set([...s.loaded,id])]}),
}),{name:'forma-preferences-v2',storage:createJSONStorage(()=>safeStorage),partialize:s=>({quality:s.quality}),merge:(saved,current)=>({...current,quality:(saved as {quality?:string})?.quality==='detail'?'detail':'smooth'})}));

// Hover changes stay inside the model/tooltip rather than refreshing the whole interface.
export const uiSnapshot=({hovered,...state}:State)=>state;
export const useUiStore=()=>useStore(useShallow(uiSnapshot));
// Pointer movement is transient: never serialize it to local storage.
export const useHoverStore=create<{hovered:string|null;setHovered:(id:string|null)=>void}>((set,get)=>({hovered:null,setHovered:id=>{if(get().hovered!==id)set({hovered:id})}}));
