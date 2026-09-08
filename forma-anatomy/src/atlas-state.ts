import {hasSystem,FEMALE_START_SYSTEMS,type AtlasSex} from '../shared/atlas';

export function initialAtlasState<T extends string>(s:{active:Record<T,boolean>;camera:{token:number}},sex:AtlasSex){
 const keys=Object.keys(s.active) as T[];
 return {sex,active:Object.fromEntries(keys.map(id=>[id,hasSystem(sex,id)&&(sex==='female'?FEMALE_START_SYSTEMS.includes(id):['skeletal','muscular'].includes(id))])) as Record<T,boolean>,
  opacity:Object.fromEntries(keys.map(id=>[id,100])) as Record<T,number>,selected:null,hidden:[] as string[],solo:null,xray:false,coverings:false,
  depth:sex==='female'?0:2,labels:false,overlay:'none',view:'body' as const,returnView:'body' as const,autoRotate:false,
  boardSystem:sex==='female'?'reproductive' as const:'muscular' as const,boardQuery:'',boardRegion:'all',boardPage:0,
  camera:{preset:'anterior',part:null,token:s.camera.token+1}};
}
