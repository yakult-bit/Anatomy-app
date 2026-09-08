import raw from '../src/data/recognition-context.json';
import female from '../src/data/female-recognition-context.json';
import {identifyFrame} from './identify';
export type ContextEntry={radius:number;localRadius:number;neighbors:string[];cue:string;frames:[radius:number,minSpan:number,maxSpan:number,reason:string|null][]};
const entries={...raw.structures,...female.structures} as unknown as Record<string,ContextEntry>;
export const RECOGNITION_CONTEXT_URL=raw.path+'?v='+raw.assetHash.slice(0,12);
export const contextUrl=(part:{sex?:string})=>part.sex==='female'?female.path+'?v='+female.assetHash.slice(0,12):RECOGNITION_CONTEXT_URL;
export function recognitionContext(part:{id:string;meshName?:string}){return entries[part.meshName||part.id]}
function bin(aspect:number){return raw.aspects.findIndex((a,i)=>i<raw.aspects.length-1&&aspect>=a&&aspect<=raw.aspects[i+1])}
export function contextGate(part:{id:string;meshName?:string},aspect?:number){
 const c=recognitionContext(part);if(!c)return 'missing_precomputed_geometry';
 if(aspect===undefined)return c.frames.some(f=>!f[3])?null:'no_supported_viewport';
 // Preserve the authenticated reroll API's existing reason vocabulary. The
 // static report retains the more specific contextual measurement/reason.
 const i=bin(aspect);if(i<0)return 'unsupported_viewport';
 const reason=c.frames[i][3];return reason==='context_target_too_small'?'footprint_too_small':reason?'footprint_too_large':null;
}
export function contextFrame(part:{id:string;meshName?:string},aspect:number){
 const context=recognitionContext(part);
 return context?identifyFrame(context.frames[bin(aspect)]?.[0]||context.radius,42,aspect):null;
}
