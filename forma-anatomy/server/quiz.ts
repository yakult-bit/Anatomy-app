import {questionGate,questionChoices} from '../shared/visual-quiz';
import {recognitionReplacementPool} from '../shared/recognition-recovery';
import {type ClickPart} from '../shared/click-quiz';
import {z} from 'zod';
import {atlasContent as raw,atlasOf,inAtlas} from '../shared/atlas';
import {fail} from './http';
const content=raw as Record<string,ClickPart&{aliases:string[]}>;
const entries=Object.values(content).filter(p=>p.available!==false);
export const structureId=z.string().min(1).max(160).refine(id=>Object.hasOwn(content,id)&&content[id].available!==false);
export const settingsSchema=z.object({model:z.enum(['male','female']).optional(),format:z.enum(['click','identify','recall','function']),system:z.enum(['all','skeletal','muscular','cardiovascular','respiratory','digestive','nervous','urinary','reproductive','endocrine','lymphatic','integumentary']),region:z.enum(['all','head-neck','thorax','abdomen','upper-limb','lower-limb','pelvis']),count:z.union([z.literal(5),z.literal(10),z.literal(20),z.literal(50)]),timer:z.union([z.literal(0),z.literal(30),z.literal(60)]),difficulty:z.enum(['guided','strict']).optional(),clickDifficulty:z.enum(['beginner','advanced']).optional(),reviewIds:z.array(structureId).max(50).optional()}).strict();
export const questionSchema=z.object({ticket:z.string().uuid(),index:z.number().int().min(0).max(49)}).strict();
export const answerSchema=questionSchema.extend({answer:z.string().max(160)}).strict();
export type Plan={id:string;options:string[]}[];
function shuffle<T>(a:T[]){return a.map(v=>({v,n:crypto.getRandomValues(new Uint32Array(1))[0]})).sort((a,b)=>a.n-b.n).map(x=>x.v)}
export function createPlan(s:z.infer<typeof settingsSchema>){
 const format=s.format;
 const eligible=entries.filter(p=>inAtlas(p,s.model||'male')&&(format!=='function'||p.quizEligible!==false)&&(format!=='click'||s.clickDifficulty==='advanced'||p.quizEligible===true));
 const pool=shuffle(eligible.filter(p=>s.reviewIds?s.reviewIds.includes(p.id):(s.system==='all'||p.system===s.system)&&(s.region==='all'||p.region===s.region)));
 const chosen:ClickPart[]=[],count=s.reviewIds?Math.min(s.reviewIds.length,50):s.count;
 for(const p of pool){if(chosen.length>=count)break;const reason=questionGate(p,format,s.clickDifficulty);if(reason){console.info(JSON.stringify({event:format+'_question_skipped',structure:p.id,reason}));continue}chosen.push(p)}
 if(!chosen.length)fail(400,'no_questions');
 return {format,plan:chosen.map(p=>({id:p.id,options:shuffle([p.id,...questionChoices(p,eligible,format)])}))};
}
function normalize(s:string){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim()}
export function grade(format:string,target:string,answer:string){
 if(format==='click')return answer===target||content[answer]?.parentId===target;
 if(format!=='recall')return answer===target;
 const p=content[target],a=normalize(answer);if(!p||!a)return false;
 return [p.displayName,p.latinName,...p.aliases].some(s=>{
  const b=normalize(s);if(a===b)return true;if(b.length<5||Math.abs(a.length-b.length)>2)return false;
  if((b.includes('left')&&!a.includes('left'))||(b.includes('right')&&!a.includes('right')))return false;
  let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return prev[b.length]<=(b.length>7?2:1);
 });
}

export function replacementQuestion(targetId:string,excluded:string[],aspect:number,format='identify',difficulty='beginner',sessionIds:string[]=[targetId]){
 const target=content[targetId];if(!target)fail(400,'unknown_structure');
 const pool=recognitionReplacementPool(target,entries.filter(p=>inAtlas(p,atlasOf(target))),excluded,aspect,sessionIds.map(id=>content[id]).filter(Boolean),(p,a)=>format==='function'&&p.quizEligible===false?'not_a_major_structure':questionGate(p,format,difficulty,a));
 const p=shuffle(pool)[0];if(p)return {id:p.id,options:shuffle([p.id,...questionChoices(p,entries.filter(x=>inAtlas(x,atlasOf(target))),format)])};
 fail(409,'no_fair_replacement');
}

export function validReroll(id:string,aspect:number,reason:string,format='identify',difficulty='beginner'){const p=content[id];return !!p&&questionGate(p,format,difficulty,aspect)===reason}
