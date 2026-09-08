import {useLayoutEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {createContextLayer,renderRecognitionContext,CONTEXT_SURFACE_OPACITY,CONTEXT_BONE_OPACITY} from './recognition-context-runtime';

export default function RecognitionContext({atlas,center,radius,local}:{atlas:THREE.Group;center:THREE.Vector3;radius:number;local:boolean}){
 const layers=useMemo(()=>{
  const batches=new Map<string,THREE.BufferGeometry>();
  atlas.traverse(o=>{if((o as THREE.Mesh).isMesh){let owner:THREE.Object3D|null=o;while(owner&&!owner.userData.recognitionContext)owner=owner.parent;if(owner)batches.set(owner.userData.recognitionContext,(o as THREE.Mesh).geometry)}});
  const skin=batches.get('surface'),bones=batches.get('skeleton');
  if(!skin||!bones)throw Error('Anatomical reference unavailable');
  return {surface:createContextLayer(skin,CONTEXT_SURFACE_OPACITY,center,radius,local),skeleton:createContextLayer(bones,CONTEXT_BONE_OPACITY,center,radius,local)};
 },[atlas,center,radius,local]);
 useLayoutEffect(()=>()=>{layers.surface.dispose();layers.skeleton.dispose()},[layers]);
 // Positive priority takes over rendering only while this recognition scene
 // is mounted; Learn, exploration and other question formats keep their renderer.
 useFrame(({gl,camera,scene})=>renderRecognitionContext(gl,camera,layers.surface.scene,layers.skeleton.scene,scene),1);
 return null;
}
