import raw from '../src/data/recognition-geometry.json';
import female from '../src/data/female-recognition-geometry.json';
import {contextGate} from './recognition-context';
export const RECOGNITION_NAME='Name that structure';
export const RECOGNITION_SETUP_BUDGET_MS=300;
export const RECOGNITION_LOAD_TIMEOUT_MS=8000;
export type RecognitionGeometry={id:string;center:number[];radius:number;coverage:number;dominantFraction:number;clusters:number;meshCount:number;distractors:string[];reason:string|null;frames:[minFootprint:number,maxFootprint:number,edge:number,reason:string|null][]};
// JSON inference widens tuple arrays; the generated shape is checked in CI.
const geometry={...raw.structures,...female.structures} as unknown as Record<string,RecognitionGeometry>;
type Key={id:string;meshName?:string};
export function recognitionGeometry(part:Key){return geometry[part.meshName||part.id]}
// No vertices, projections, catalog sorts or per-candidate ranking at runtime.
export function recognitionGate(part:Key,aspect?:number):string|null{
 const entry=recognitionGeometry(part);if(!entry)return 'missing_precomputed_geometry';
 if(entry.reason)return entry.reason;
 // Retain the offline thin/fragmented-structure screen. The old per-aspect
 // filled-area bins describe the retired target-only camera, however: applying
 // those to the contextual camera rejects clear targets on wide canvases.
 if(!entry.frames.some(f=>!f[3]))return 'no_supported_viewport';
 if(aspect!==undefined&&!Number.isFinite(aspect))return 'unsupported_viewport';
 return contextGate(part,aspect);
}
export function recognitionChoices(part:Key){return recognitionGeometry(part)?.distractors||[]}
