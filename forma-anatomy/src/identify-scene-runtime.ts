import * as THREE from 'three';
type MeshState={visible:boolean;materials:{material:THREE.Material;opacity:number;transparent:boolean;depthWrite:boolean}[]};
export function captureIsolation(scene:THREE.Object3D){
 const saved=new Map<THREE.Object3D,MeshState>();
 function hide(){
  function walk(node:THREE.Object3D){
   if(node.userData.identifyProtected)return;
   if((node as THREE.Mesh).isMesh||(node as THREE.Line).isLine||(node as THREE.Points).isPoints||(node as THREE.Sprite).isSprite){
    if(!saved.has(node)){
     const material=(node as THREE.Mesh).material;
     const materials=material?(Array.isArray(material)?material:[material]):[];
     saved.set(node,{visible:node.visible,materials:materials.map(m=>({material:m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite}))});
    }
    node.visible=false;
   }
   for(const child of node.children)walk(child);
  }
  walk(scene);
 }
 function restore(){for(const [node,s] of saved){node.visible=s.visible;for(const x of s.materials){x.material.opacity=x.opacity;x.material.transparent=x.transparent;x.material.depthWrite=x.depthWrite;x.material.needsUpdate=true}}saved.clear()}
 hide();return {hide,restore};
}
