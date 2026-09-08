import {identifyFrame} from '../shared/identify';
import {atlasView,FEMALE_START_SYSTEMS,type AtlasSex} from '../shared/atlas';

export function isFindQuestion(s:{mode:string;quiz?:{format:string;finished:boolean;feedback:unknown}|null}){
 return s.mode==='quiz'&&s.quiz?.format==='click'&&!s.quiz.finished&&!s.quiz.feedback;
}
// No target or region argument: question identity cannot alter the starting view.
export function neutralFindState<T extends string>(s:{active:Record<T,boolean>;camera:{token:number};sex?:AtlasSex}){
 const systems=Object.keys(s.active) as T[];
 return {active:Object.fromEntries(systems.map(id=>[id,s.sex==='female'?FEMALE_START_SYSTEMS.includes(id):['integumentary','muscular','skeletal'].includes(id)])) as Record<T,boolean>,
  opacity:Object.fromEntries(systems.map(id=>[id,100])) as Record<T,number>,depth:0,selected:null,hovered:null,hidden:[] as string[],solo:null,xray:false,
  labels:false,overlay:'none',coverings:false,view:'body' as const,autoRotate:false,
  camera:{preset:'anterior',part:null,token:s.camera.token+1}};
}
export function neutralFindFrame(aspect:number,sex:AtlasSex='male'){const view=atlasView(sex);return {...identifyFrame(view.radius,42,aspect),center:view.center,direction:[0,0,1]};}
type Bounded={bounds?:{min:number[];max:number[]}};
// Feedback fits BOTH answers, even if the picked part is in another region.
export function findRevealFrame(correct:Bounded,picked:Bounded|undefined,aspect:number){
 const bounds=[correct.bounds,picked?.bounds].filter(Boolean) as NonNullable<Bounded['bounds']>[];
 if(!bounds.length)return neutralFindFrame(aspect);
 const min=[0,1,2].map(i=>Math.min(...bounds.map(b=>b.min[i]))),max=[0,1,2].map(i=>Math.max(...bounds.map(b=>b.max[i])));
 const center=min.map((v,i)=>(v+max[i])/2),radius=Math.hypot(...max.map((v,i)=>v-min[i]))/2;
 return {...identifyFrame(radius,42,aspect),center,direction:[.12,.05,1]};
}
