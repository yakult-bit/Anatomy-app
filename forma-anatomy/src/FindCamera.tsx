import {useLayoutEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {OrbitControls as OrbitImpl} from 'three-stdlib';
import {anatomy,useStore,useUiStore} from './store';
import {requiredSystems} from './model-runtime';
import {neutralFindFrame,findRevealFrame} from './find-state';

const directions:Record<string,[number,number,number]>={anterior:[0,0,1],posterior:[0,0,-1],left:[1,0,0],right:[-1,0,0],superior:[0,1,.001]};
export default function FindCamera(){
 const s=useUiStore(),q=s.quiz!;
 const {camera,controls,size,invalidate}=useThree(),orbit=controls as OrbitImpl;
 const resetKey=`${q.index}:${q.questions[q.index].id}:${s.identifyRevision}`;
 const handled=useRef(''),ready=useRef('');
 const flight=useRef<{start:number;from:THREE.Vector3;pivot:THREE.Vector3;to:THREE.Vector3;target:THREE.Vector3}|null>(null);
 useLayoutEffect(()=>{
  if(!orbit)return;
  const pc=camera as THREE.PerspectiveCamera;
  const saved={position:pc.position.clone(),quaternion:pc.quaternion.clone(),up:pc.up.clone(),near:pc.near,far:pc.far,fov:pc.fov,zoom:pc.zoom,pivot:orbit.target.clone(),min:orbit.minDistance,max:orbit.maxDistance,pan:orbit.enablePan,damping:orbit.enableDamping};
  return ()=>{flight.current=null;orbit.enableDamping=false;orbit.update();orbit.target.copy(saved.pivot);camera.position.copy(saved.position);camera.up.copy(saved.up);orbit.update();camera.quaternion.copy(saved.quaternion);pc.near=saved.near;pc.far=saved.far;pc.fov=saved.fov;pc.zoom=saved.zoom;pc.updateProjectionMatrix();orbit.minDistance=saved.min;orbit.maxDistance=saved.max;orbit.enablePan=saved.pan;orbit.enableDamping=saved.damping;orbit.enabled=true;invalidate()};
 },[camera,orbit,invalidate]);
 useLayoutEffect(()=>{
  if(!orbit)return;
  const first=handled.current!==resetKey,pc=camera as THREE.PerspectiveCamera;
  const fit=q.feedback?findRevealFrame(anatomy[q.feedback.id],anatomy[q.feedback.chosen],size.width/size.height):neutralFindFrame(size.width/size.height,s.sex);
  const direction=q.feedback?fit.direction:directions[s.camera.preset]||directions.anterior;
  const target=new THREE.Vector3(...fit.center as [number,number,number]),destination=target.clone().addScaledVector(new THREE.Vector3(...direction as [number,number,number]).normalize(),fit.distance);
  pc.near=.00001;pc.far=250;pc.fov=42;pc.zoom=1;pc.up.set(0,1,0);pc.updateProjectionMatrix();
  orbit.enablePan=true;orbit.minDistance=.005;orbit.maxDistance=120;
  if(!q.feedback){
   // Snap to a neutral start, never animate away from the previous answer.
   // Only question/reset/preset/resize commands enter here; changing layers,
   // giving the first hint or hovering cannot take control of the camera.
   flight.current=null;orbit.enableDamping=false;orbit.update();orbit.target.copy(target);camera.position.copy(destination);camera.lookAt(target);orbit.update();orbit.enableDamping=true;orbit.enabled=true;
   if(first){handled.current=resetKey;ready.current=''}
  }else{flight.current={start:performance.now(),from:camera.position.clone(),pivot:orbit.target.clone(),to:destination,target};orbit.enabled=false;}
  invalidate();
 },[camera,orbit,resetKey,s.camera.token,size.width,size.height,q.feedback,invalidate]);
 useFrame(()=>{
  if(!orbit)return;
  const f=flight.current;
  if(f){const t=Math.min(1,(performance.now()-f.start)/700),ease=t*t*(3-2*t);orbit.enableDamping=false;camera.position.lerpVectors(f.from,f.to,ease);orbit.target.lerpVectors(f.pivot,f.target,ease);camera.lookAt(orbit.target);orbit.update();if(t===1){flight.current=null;orbit.enableDamping=true;orbit.enabled=true}else invalidate()}
  if(!q.feedback&&!s.findReady&&!s.identifyIssue&&ready.current!==resetKey&&requiredSystems(s).every(id=>s.loaded.includes(`${s.sex}-${id}`))){ready.current=resetKey;void useStore.getState().readyFind()}
 });
 return null;
}
