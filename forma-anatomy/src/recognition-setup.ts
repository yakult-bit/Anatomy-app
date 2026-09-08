import * as THREE from 'three';
import {IDENTIFY_DIRECTION} from '../shared/identify';
import {recognitionGate,recognitionGeometry} from '../shared/recognition';
import {contextFrame} from '../shared/recognition-context';
import {sourceParts} from './model-runtime';
import {visualGate} from '../shared/visual-quiz';

const sources=new WeakMap<THREE.Object3D,ReturnType<typeof sourceParts>>();
export function prepareRecognition(scene:THREE.Object3D,part:{id:string;meshName:string},aspect:number,reviewing=false,format='identify'){
 const entry=recognitionGeometry(part);
 if(!entry)return {reason:'missing_precomputed_geometry',prepared:null};
 // A smaller review panel/canvas must not remove an already answered target.
 const reason=reviewing?null:format==='identify'?recognitionGate(part,aspect):visualGate(part,aspect);
 if(reason)return {reason,prepared:null};
 let index=sources.get(scene);
 if(!index){scene.updateMatrixWorld(true);index=sourceParts(scene);sources.set(scene,index)}
 const originals=index.get(part.id)||[];
 if(!originals.length)return {reason:'model_unavailable',prepared:null};
 // Refuse a model/metadata mismatch instead of accidentally rendering a parent
 // group or silently including its attached structures.
 if(originals.length!==entry.meshCount)return {reason:'model_unavailable',prepared:null};
 const sphere=new THREE.Sphere(new THREE.Vector3(...entry.center),entry.radius);
 const frame=contextFrame(part,aspect);
 if(!frame)return {reason:'missing_precomputed_geometry',prepared:null};
 // Only clone the chosen materials. Shared vertex buffers remain untouched:
 // no precise Box3 walk, normal welding, rasterization or BVH construction.
 const meshes=originals.map(source=>{
  const mesh=new THREE.Mesh(source.geometry);mesh.matrix.copy(source.matrixWorld);mesh.matrixAutoUpdate=false;mesh.raycast=()=>{};
  mesh.userData.recognitionTarget=part.id;
  const materials=(Array.isArray(source.material)?source.material:[source.material]).map(m=>{
   const copy=(m as THREE.MeshStandardMaterial).clone();copy.opacity=1;copy.transparent=false;copy.alphaTest=0;
   copy.depthWrite=true;copy.emissive.set('#401546');copy.emissiveIntensity=.2;copy.forceSinglePass=true;return copy;
  });
  mesh.material=Array.isArray(source.material)?materials:materials[0];return mesh;
 });
 return {reason:null,prepared:{meshes,sphere,frame,
  destination:sphere.center.clone().addScaledVector(new THREE.Vector3(...IDENTIFY_DIRECTION).normalize(),frame.distance)}};
}
export function disposeRecognition(prepared:NonNullable<ReturnType<typeof prepareRecognition>['prepared']>){
 for(const mesh of prepared.meshes)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();
}
export const RECOGNITION_APPROACH_MS=120;
