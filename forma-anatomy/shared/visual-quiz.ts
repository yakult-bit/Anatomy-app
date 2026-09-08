import {recognitionGate,recognitionGeometry,recognitionChoices} from './recognition';
import {contextGate} from './recognition-context';
import {clickGate,teaching,type ClickPart} from './click-quiz';

export const isVisualFormat=(format:string)=>['identify','recall','function'].includes(format);
// Recall and function matching need a readable subject, but do not require
// three alternate structure names. Use the contextual build-time measurements.
export function visualGate(part:{id:string;meshName?:string},aspect?:number){
 const g=recognitionGeometry(part);
 if(!g||!g.meshCount||!Number.isFinite(g.radius)||g.radius<=0)return 'missing_precomputed_geometry';
 if(g.clusters>8&&g.dominantFraction<.12)return 'disconnected_fragments';
 return contextGate(part,aspect);
}
export function questionGate(p:ClickPart,format:string,difficulty='beginner',aspect?:number){
 if(p.quizExcluded)return 'annotation_under_review';
 if(format==='click')return clickGate(p,difficulty,aspect);
 if(format==='identify')return recognitionGate(p,aspect);
 return visualGate(p,aspect);
}
// Equal functions (for example left/right femur) must never appear as different
// answers. Rank similar-region/system functions first, then widen if necessary.
export function functionChoices<T extends ClickPart>(target:T,all:T[]){
 const seen=new Set([teaching(target).data.function.toLowerCase()]);
 const rank=(p:T)=>Number(p.system!==target.system)*2+Number(p.region!==target.region);
 return all.filter(p=>p.id!==target.id&&!p.quizExcluded&&p.quizEligible!==false)
  .sort((a,b)=>rank(a)-rank(b)).filter(p=>{
   const f=teaching(p).data.function.toLowerCase();if(!f||seen.has(f))return false;seen.add(f);return true;
  }).slice(0,3).map(p=>p.id);
}
export function questionChoices<T extends ClickPart>(p:T,all:T[],format:string){
 return format==='identify'?recognitionChoices(p):format==='function'?functionChoices(p,all):[];
}
