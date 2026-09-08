import * as THREE from 'three';
import {acceleratedRaycast,computeBoundsTree,CENTER} from 'three-mesh-bvh';
import {anatomy,modelInfo,SYSTEMS,type System,type Part} from './store';
import {atlasInfo,hasSystem,type AtlasSex} from '../shared/atlas';
export const modelPaths=Object.fromEntries(modelInfo.files.map(f=>[f.system,`${f.path}?v=${f.sha256.slice(0,12)}`]));
export function modelPath(system:System,sex:AtlasSex='male'){
 const f=atlasInfo(sex).files.find(f=>f.system===system);if(!f)throw Error('System unavailable for this model');
 return `${f.path}?v=${f.sha256.slice(0,12)}`;
}
export const HOVER_COLOR=new THREE.Color('#9edfff');
export const HOVER_CSS='#9edfff';
export function tintMaterial(material:THREE.MeshStandardMaterial,base:THREE.Color,hovered:boolean,selected:boolean){
 material.color.copy(base);if(hovered)material.color.lerp(HOVER_COLOR,.9);
 material.emissive.set(hovered?'#7dccff':selected?'#235c75':'#000000');material.emissiveIntensity=hovered?.38:selected?.18:0;
}
export function paintFindMaterial(material:THREE.MeshStandardMaterial,base:THREE.Color,hovered:boolean,answerColor:string|null,ghost:boolean){
 // Always reset the previous question's tint and emissive values first.
 tintMaterial(material,base,hovered,false);
 if(ghost&&!hovered){material.color.set('#abb3b0');material.emissive.set('#000000');material.emissiveIntensity=0}
 if(answerColor){material.color.set(answerColor);material.emissive.set(answerColor);material.emissiveIntensity=.45}
}
export function setMaterialOpacity(material:THREE.MeshStandardMaterial,alpha:number){
 const transparent=alpha<.999;if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}material.opacity=alpha;material.depthWrite=alpha>.92;material.forceSinglePass=true;
}
// Cache the acceleration index on the shared geometry. It does not change anatomical vertices.
export function preparePicking(geometry:THREE.BufferGeometry){if(!geometry.boundsTree)computeBoundsTree.call(geometry,{strategy:CENTER,indirect:true,maxLeafTris:12});}
export function visibleRaycast(this:THREE.Mesh,raycaster:THREE.Raycaster,hits:THREE.Intersection[]){
 if(!this.visible||!this.userData.pickable)return;acceleratedRaycast.call(this,raycaster,hits);
}
export function requiredSystems(s:{sex?:AtlasSex;view:string;mode:string;selected:string|null;boardSystem:System;active:Record<System,boolean>;quiz?:{format?:string;finished:boolean;index:number;questions:{id:string}[];feedback?:{id:string;chosen:string}|null}|null}):System[]{
 if(s.mode==='quiz'&&s.quiz&&!s.quiz.finished&&s.quiz.format==='click'&&s.quiz.feedback){const f=s.quiz.feedback;return [...new Set([...SYSTEMS.filter(([id])=>s.active[id]&&hasSystem(s.sex||'male',id)).map(([id])=>id),...[f.id,f.chosen].filter(id=>!!anatomy[id]).map(id=>anatomy[id].system)])]};

 if(s.mode==='learn'&&s.view==='board')return [s.boardSystem];
 if(s.mode==='learn'&&s.view==='inspect'&&s.selected)return [anatomy[s.selected].system];
 return SYSTEMS.filter(([id])=>s.active[id]&&hasSystem(s.sex||'male',id)).map(([id])=>id);
}
export function sourceParts(scene:THREE.Object3D){
 const index=new Map<string,THREE.Mesh[]>();scene.traverse(o=>{if(!(o as THREE.Mesh).isMesh)return;let owner:THREE.Object3D|null=o,id='',detail='';while(owner&&!id){id=owner.userData.partId||'';detail=owner.userData.detailId||'';owner=owner.parent;}for(const key of new Set([id,detail].filter(Boolean))){const list=index.get(key)||[];list.push(o as THREE.Mesh);index.set(key,list);}});return index;
}
