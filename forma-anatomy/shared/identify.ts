// Shared question policy: public recognition rules, never a source of saved scores.
export type IdentifyPart={quizExcluded?:boolean;clickGeometry?:{coverage?:number};id:string;displayName:string;system:string;region:string;position:number[];bounds?:{min:number[];max:number[]};sourceMeshNames?:string[];relatedIds:string[];parentId?:string;available?:boolean};
export const IDENTIFY_OUTLINE='#ff00e5';
export const IDENTIFY_PADDING=1.6;
export function side(name:string){return /\bleft\b/i.test(name)?'left':/\bright\b/i.test(name)?'right':null}
export function optionName(name:string){const s=side(name);return s?name.replace(/\b(left|right)\b/gi,'').replace(/\s+/g,' ').trim()+` (${s})`:name}
const stem=(name:string)=>name.toLowerCase().replace(/\b(left|right)\b/g,'').replace(/\W+/g,' ').trim();
const radius=(p:IdentifyPart)=>p.bounds?Math.hypot(...p.bounds.max.map((v,i)=>v-p.bounds!.min[i]))/2:0;
export function distractors(target:IdentifyPart,all:IdentifyPart[]){
 const names=new Set([optionName(target.displayName).toLowerCase()]),meshes=new Set(target.sourceMeshNames||[]),paired=!!side(target.displayName);
 const candidates=all.filter(p=>p.id!==target.id&&!p.quizExcluded&&p.available!==false&&p.region===target.region&&!!side(p.displayName)===paired&&p.parentId!==target.id&&target.parentId!==p.id&&!(p.sourceMeshNames||[]).some(n=>meshes.has(n)));
 const score=(p:IdentifyPart)=>{
  const pair=stem(p.displayName)===stem(target.displayName)&&side(p.displayName)!==side(target.displayName);
  const related=target.relatedIds.includes(p.id)||p.relatedIds.includes(target.id);
  const distance=Math.hypot(...p.position.map((v,i)=>v-target.position[i]));
  const size=Math.abs(Math.log(Math.max(radius(p),1e-8)/Math.max(radius(target),1e-8)));
  return (p.system===target.system?0:1000)+(pair?-100:0)+(related?-20:0)+distance+size;
 };
 return candidates.sort((a,b)=>score(a)-score(b)).filter(p=>{const n=optionName(p.displayName).toLowerCase();if(names.has(n))return false;names.add(n);return true}).slice(0,3);
}
export function identifyFrame(radius:number,fovDegrees:number,aspect:number){
 const half=fovDegrees*Math.PI/360;
 const limiting=Math.atan(Math.tan(half)*Math.min(1,Math.max(.05,aspect)));
 const rawDistance=radius/Math.sin(limiting)*IDENTIFY_PADDING;
 const distance=Math.max(.0005,Math.min(120,rawDistance));
 const near=Math.max(.000001,Math.min(radius*.08,(distance-radius)*.1));
 return {distance,near,far:Math.max(250,distance+radius*8),clamped:distance!==rawDistance};
}
export function contentGate(p:IdentifyPart,all:IdentifyPart[]){
 if(!p.bounds||!Number.isFinite(radius(p))||radius(p)<=0)return 'missing_geometry_bounds';
 if(distractors(p,all).length<3)return 'fewer_than_three_region_distractors';
 return null;
}
export function logIdentifySkip(id:string,reason:string){console.info(JSON.stringify({event:'identify_question_skipped',structure:id,reason}))}
export const IDENTIFY_DIRECTION=[.12,.05,1] as const;
export function projectedFootprint(bounds:{min:number[];max:number[]},aspect:number,fov=42,distanceScale=1){
 const center=bounds.min.map((v,i)=>(v+bounds.max[i])/2),r=Math.hypot(...bounds.max.map((v,i)=>v-bounds.min[i]))/2;
 const frame=identifyFrame(r,fov,aspect),n=Math.hypot(...IDENTIFY_DIRECTION),dir=IDENTIFY_DIRECTION.map(x=>x/n),rn=Math.hypot(dir[0],dir[2]),right=[dir[2]/rn,0,-dir[0]/rn],up=[-dir[1]*right[2],dir[2]*right[0]-dir[0]*right[2],dir[1]*right[0]];
 frame.distance*=distanceScale;
 frame.near=Math.max(.000001,Math.min(r*.08,(frame.distance-r)*.1));
 // right x direction gives negative up; use direction x right instead.
 up[0]=dir[1]*right[2];up[1]=dir[2]*right[0]-dir[0]*right[2];up[2]=-dir[1]*right[0];
 const tan=Math.tan(fov*Math.PI/360),xs:number[]=[],ys:number[]=[];
 for(let bits=0;bits<8;bits++){const v=center.map((c,i)=>(bits&(1<<i)?bounds.max[i]:bounds.min[i])-c);const depth=frame.distance-v.reduce((s,x,i)=>s+x*dir[i],0);xs.push(v.reduce((s,x,i)=>s+x*right[i],0)/(depth*tan*aspect));ys.push(v.reduce((s,x,i)=>s+x*up[i],0)/(depth*tan))}
 const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys);
 return {...frame,area:width*height/4,edge:Math.max(...xs.map(Math.abs),...ys.map(Math.abs)),radius:r,center};
}
export function footprintReason(bounds:{min:number[];max:number[]},aspect:number,coverage=1){const f=projectedFootprint(bounds,aspect);f.area*=coverage;return f.clamped?'framing_clamped':f.area<.05?'footprint_too_small':f.area>.6||f.edge>.9?'footprint_too_large':null}
