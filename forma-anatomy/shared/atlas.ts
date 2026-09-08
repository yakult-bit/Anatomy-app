import male from '../src/data/anatomy.json';
import female from '../src/data/female-anatomy.json';
import maleInfo from '../src/data/model-info.json';
import femaleInfo from '../src/data/female-model-info.json';

export type AtlasSex='male'|'female';
export const atlasContent={...male,...female};
// "both" described shared anatomy in the original male catalog; its meshes
// still belong to that donor. It must not place male organs in the female scene.
export const atlasOf=(part?:{id?:string;sex?:string}):AtlasSex=>part?.sex==='female'?'female':'male';
export const inAtlas=(part:{id?:string;sex?:string},sex:AtlasSex)=>atlasOf(part)===sex;
export const atlasInfo=(sex:AtlasSex='male')=>sex==='female'?femaleInfo:maleInfo;
export const hasSystem=(sex:AtlasSex,system:string)=>atlasInfo(sex).files.some(f=>f.system===system);
export const atlasView=(sex:AtlasSex='male')=>sex==='female'?{center:femaleInfo.center,radius:femaleInfo.radius*1.04}:{center:[0,.12,0],radius:2.9};
export {femaleInfo};

export const FEMALE_START_SYSTEMS=['skeletal','urinary','reproductive'];
