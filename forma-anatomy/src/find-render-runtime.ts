import * as THREE from 'three';

// Transparent geometry is normally drawn after opaque geometry, regardless of
// renderOrder. Separate complete passes prevent ghost tissue tinting answers.
export function renderFindLayers(gl:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera){
 const entries:{object:THREE.Object3D;visible:boolean;layer:number}[]=[];
 scene.traverse(object=>{
  if(!(object as THREE.Mesh).isMesh&&!(object as THREE.Line).isLine&&!(object as THREE.Sprite).isSprite)return;
  let layer=0;
  for(let p:THREE.Object3D|null=object;p;p=p.parent){if(p.userData.findLayer){layer=p.userData.findLayer;break}}
  entries.push({object,visible:object.visible,layer});
 });
 const autoClear=gl.autoClear;gl.autoClear=false;
 try{
  gl.clear();
  for(const layer of [0,1,2]){
   for(const entry of entries)entry.object.visible=entry.visible&&entry.layer===layer;
   if(layer)gl.clearDepth();
   gl.render(scene,camera);
  }
 }finally{for(const entry of entries)entry.object.visible=entry.visible;gl.autoClear=autoClear}
}
