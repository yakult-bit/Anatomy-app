import {recognitionGate} from './recognition';

type Part={id:string;meshName?:string;system:string;region:string;available?:boolean};
// A replacement belongs to the same session scope. Prefer the failed target's
// system/region, but an All-systems session must not end just because that one
// narrow region has no spare structures. Its four answer choices still come
// from the replacement target's own region via recognitionChoices.
export function recognitionReplacementPool<T extends Part>(target:T,all:T[],excluded:string[],aspect:number,session:T[],gate:(p:T,aspect:number)=>string|null=recognitionGate){
 const systems=new Set(session.map(p=>p.system)),regions=new Set(session.map(p=>p.region)),used=new Set(excluded);
 const pools:T[][]=[[],[],[],[]];
 for(const p of all){
  if(p.available===false||used.has(p.id)||!systems.has(p.system)||!regions.has(p.region)||gate(p,aspect))continue;
  const sameSystem=p.system===target.system,sameRegion=p.region===target.region;
  pools[sameSystem&&sameRegion?0:sameSystem?1:sameRegion?2:3].push(p);
 }
 return pools.find(p=>p.length)||[];
}
export const RECOGNITION_AUTO_RETRIES=3;
