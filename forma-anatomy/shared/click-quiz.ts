import {projectedFootprint,IDENTIFY_DIRECTION,type IdentifyPart} from './identify';
export const CLICK_HOVER='#9edfff',CLICK_CORRECT='#00ff85',CLICK_WRONG='#ff174d';
export const clickSizeFloor=(difficulty='beginner')=>difficulty==='advanced'?.02:.025;
export type ClickPart=IdentifyPart&{covering?:boolean;quizEligible?:boolean;description:string;function:string;clinicalNotes?:string;clinical_notes?:string;landmarks?:string;related_ids?:string[];latinName:string;clickGeometry?:{meshes:number;dominantFraction:number;coverage?:number;clusters?:number};distinctions?:Record<string,string>};
export function clickGate(p:ClickPart,difficulty='beginner',aspect=1){
 if(!p.bounds||!p.sourceMeshNames?.length)return 'missing_geometry';
 if(difficulty==='beginner'&&p.quizEligible!==true)return 'not_a_major_structure';
 if(p.clickGeometry&&(p.clickGeometry.clusters??p.clickGeometry.meshes)>8&&p.clickGeometry.dominantFraction<.12)return 'disconnected_fragments';
 const frame=clickFraming(p,aspect,difficulty);
 if(frame.area*(p.clickGeometry?.coverage??1)<clickSizeFloor(difficulty)||frame.edge>=.85)return 'below_click_size_floor';
 return null;
}
const frames=new WeakMap<ClickPart,Map<string,ReturnType<typeof fitClick>>>();
function fitClick(p:ClickPart,aspect:number,difficulty:string){
 const coverage=p.clickGeometry?.coverage??1,floor=clickSizeFloor(difficulty);
 // Just eight JSON bounds corners; never triangles. Find the closest safe
 // regional view first, then use any spare space for surrounding anatomy.
 let low=.66,high=1.6;
 for(let i=0;i<12;i++){const mid=(low+high)/2,f=projectedFootprint(p.bounds!,aspect,42,mid);if(f.edge>=.84)low=mid;else high=mid}
 let f=projectedFootprint(p.bounds!,aspect,42,high);
 if(f.area*coverage>=floor){low=high;high=1.6;for(let i=0;i<12;i++){const mid=(low+high)/2,v=projectedFootprint(p.bounds!,aspect,42,mid);if(v.area*coverage>=floor*1.2)low=mid;else high=mid}f=projectedFootprint(p.bounds!,aspect,42,low)}
 return {...f,direction:IDENTIFY_DIRECTION};
}
export function clickFraming(p:ClickPart,aspect:number,difficulty='beginner'){
 const key=`${aspect}:${difficulty}`;let cache=frames.get(p);if(!cache){cache=new Map();frames.set(p,cache)}
 let f=cache.get(key);if(!f){f=fitClick(p,aspect,difficulty);if(cache.size>16)cache.clear();cache.set(key,f)}return f;
}
// Project anatomical bounds onto the fixed starting view. Only tissue in
// front of and overlapping the target is ghosted, including ribs and fascia.
export function coversTarget(p:ClickPart,target:ClickPart){
 if(!p.bounds||!target.bounds||p.id===target.id)return false;
 const [dx,dy,dz]=IDENTIFY_DIRECTION,length=Math.hypot(dx,dy,dz),d=[dx/length,dy/length,dz/length];
 const r=[d[2],0,-d[0]],rl=Math.hypot(...r);r.forEach((v,i)=>r[i]=v/rl);
 const up=[d[1]*r[2]-d[2]*r[1],d[2]*r[0]-d[0]*r[2],d[0]*r[1]-d[1]*r[0]];
 function range(part:ClickPart,axis:number[]){const b=part.bounds!;let min=Infinity,max=-Infinity;for(let i=0;i<8;i++){const n=axis.reduce((sum,v,j)=>sum+v*((i>>j)&1?b.max[j]:b.min[j]),0);min=Math.min(min,n);max=Math.max(max,n)}return [min,max]}
 const front=range(p,d),tFront=range(target,d);if(front[1]<tFront[0])return false;
 return [r,up].every(axis=>{const a=range(p,axis),b=range(target,axis);return a[0]<=b[1]&&a[1]>=b[0]});
}
const boilerplate=/Z-Anatomy|(?:this|male|imported|the) atlas|file format|anatomical position|notes (?:are )?not included|notes and quiz|this additional structure|detailed function notes/i;
export function teaching(p:ClickPart){const clean=(s?:string)=>s&&!boilerplate.test(s)?s.trim():'';const data={location:clean(p.landmarks)||clean(p.description),function:clean(p.function),clinical:clean(p.clinical_notes),latin:clean(p.latinName)};return {data,missing:Object.entries(data).filter(([,v])=>!v).map(([k])=>k)}}
export function distinction(correct:ClickPart,picked?:ClickPart){
 if(!picked)return '';const explicit=correct.distinctions?.[picked.id];if(explicit)return explicit;
 const a=teaching(correct).data,b=teaching(picked).data;
 const first=(s:string)=>s.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||s;
 if(correct.parentId===picked.id)return `${correct.displayName} is one component of ${picked.displayName}; the question asked for that component, rather than the whole group. ${first(a.location)}`.trim();
 const delta=correct.position.map((v,i)=>v-picked.position[i]),axis=delta.reduce((best,v,i)=>Math.abs(v)>Math.abs(delta[best])?i:best,0);
 // Coordinates in the imported content are left-positive, superior-positive,
 // anterior-positive. This comparison uses stored geometry, never invented notes.
 const direction=axis===0?(delta[0]>0?'farther toward the body’s left':'farther toward the body’s right'):axis===1?(delta[1]>0?'higher (superior)':'lower (inferior)'):(delta[2]>0?'farther forward (anterior)':'farther back (posterior)');
 const relation=Math.abs(delta[axis])>.00001?`The centre of ${correct.displayName} is ${direction} than the centre of ${picked.displayName}.`:'';
 const feature=a.function&&a.function!==b.function?`${correct.displayName}: ${first(a.function)}`:a.location?`${correct.displayName}: ${first(a.location)}`:'';
 return [relation,feature].filter(Boolean).join(' ');
}
export function logClickGap(id:string,missing:string[]){console.info(JSON.stringify({event:'click_content_gap',structure:id,missing}))}
