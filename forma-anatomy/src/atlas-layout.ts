import type {Part,System} from './store';

export type Vec3=[number,number,number];
export const INSPECT_CENTER:Vec3=[0,.15,1.4];
export function inspectionOffset(p:Pick<Part,'position'>):Vec3{return INSPECT_CENTER.map((v,i)=>v-p.position[i]) as Vec3}
export function framingDistance(radius:number,fov:number,aspect:number){const vertical=fov*Math.PI/360;const limiting=Math.atan(Math.tan(vertical)*Math.min(1,Math.max(.12,aspect)));return Math.max(.06,radius/Math.sin(limiting)*1.18)}
