import {coversTarget,type ClickPart} from '../shared/click-quiz';
export const findRenderLayer=(isTarget:boolean,isWrong:boolean,feedback:boolean)=>feedback?(isTarget?2:isWrong?1:0):0;
export function findOpacity(p:ClickPart,target:ClickPart,options:{base:number;isTarget:boolean;isWrong:boolean;hint:boolean;feedback:boolean}){
 const {isTarget,isWrong,hint,feedback}=options;
 if(feedback&&(isTarget||isWrong))return 1;
 let alpha=options.base;
 if(feedback&&alpha&&(coversTarget(p,target)||p.covering))alpha=Math.min(alpha,.12);
 if(hint&&p.region!==target.region)alpha=Math.min(alpha,.07);
 if(feedback)alpha=Math.min(alpha,.12);
 return alpha;
}
