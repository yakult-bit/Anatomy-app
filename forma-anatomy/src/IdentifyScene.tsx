import {captureIsolation} from './identify-scene-runtime';
import {Component,Suspense,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Html,Line,Outlines,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import type {OrbitControls as OrbitImpl} from 'three-stdlib';
import {anatomy,useStore,useUiStore} from './store';
import {modelPath} from './model-runtime';
import {prepareRecognition,disposeRecognition,RECOGNITION_APPROACH_MS} from './recognition-setup';
import RecognitionContext from './RecognitionContext';
import {recognitionContext,contextUrl} from '../shared/recognition-context';
import {IDENTIFY_OUTLINE} from '../shared/identify';
const noPick=()=>{};
function modelUnavailable(id:string){const s=useStore.getState();if(s.quiz?.questions[s.quiz.index].id===id)void s.rerollIdentify('model_unavailable')}
class TargetBoundary extends Component<{id:string;children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}componentDidCatch(){modelUnavailable(this.props.id)}render(){return this.state.failed?null:this.props.children}}

function Target({id}:{id:string}){
 const p=anatomy[id],s=useUiStore();
 const [gltf,contextAtlas]=useGLTF([modelPath(p.system,p.sex==='female'?'female':'male'),contextUrl(p)],'/draco/');
 const context=recognitionContext(p);
 const {camera,controls,size,invalidate}=useThree();const orbit=controls as OrbitImpl;
 // Keep the exact same meshes and orbit on answer. Only an actual resize
 // refits them, without reapplying question eligibility to the feedback view.
 const result=useMemo(()=>prepareRecognition(gltf.scene,p,size.width/size.height,!!useStore.getState().quiz?.feedback,s.quiz?.format),[gltf.scene,p,size.width,size.height,s.quiz?.format]);
 const prepared=result.prepared;
 const transition=useRef<{start:number;position:THREE.Vector3;pivot:THREE.Vector3;destination:THREE.Vector3}|null>(null),ready=useRef(false);
 useLayoutEffect(()=>()=>{if(prepared)disposeRecognition(prepared)},[prepared]);
 useLayoutEffect(()=>{
  ready.current=false;if(!orbit)return;
  if(!prepared){void useStore.getState().rerollIdentify(result.reason||'model_unavailable',size.width/size.height);return}
  const perspective=camera as THREE.PerspectiveCamera;perspective.fov=42;perspective.zoom=1;
  const {frame,destination}=prepared;
  perspective.near=frame.near;perspective.far=frame.far;perspective.updateProjectionMatrix();
  orbit.enabled=false;orbit.enableDamping=false;orbit.enablePan=false;orbit.minDistance=frame.distance;orbit.maxDistance=120;
  transition.current={start:performance.now(),position:camera.position.clone(),pivot:orbit.target.clone(),destination};invalidate();
 },[prepared,result.reason,orbit,camera,size.width,size.height,invalidate]);
 useFrame(()=>{const t=transition.current;if(!t||!orbit||!prepared)return;const elapsed=Math.min(1,(performance.now()-t.start)/RECOGNITION_APPROACH_MS),ease=elapsed<.5?4*elapsed**3:1-(-2*elapsed+2)**3/2;
  // Interpolate the pivot and camera together. Disable distance clamps only for
  // this short approach; the final zoom limit keeps the sphere inside the frame.
  camera.position.lerpVectors(t.position,t.destination,ease);orbit.target.lerpVectors(t.pivot,prepared.sphere.center,ease);camera.lookAt(orbit.target);
  if(elapsed===1){transition.current=null;orbit.enabled=true;orbit.enableDamping=true;orbit.update();if(!ready.current){ready.current=true;void useStore.getState().readyIdentify(id)}}else invalidate();
 });
 if(!prepared)return null;
 const marker=prepared.sphere.center.clone().add(new THREE.Vector3(0,prepared.sphere.radius*1.25,0));
 return <group dispose={null}>{prepared.meshes.map(mesh=><mesh key={mesh.uuid} geometry={mesh.geometry} material={mesh.material} matrix={mesh.matrix} matrixAutoUpdate={false} userData={mesh.userData} raycast={noPick}><Outlines color={IDENTIFY_OUTLINE} angle={0} thickness={3} screenspace={false} opacity={1} transparent={false} toneMapped={false}/></mesh>)}
  <Line points={[prepared.sphere.center,marker]} color={IDENTIFY_OUTLINE} lineWidth={1} raycast={noPick}/>
  <Html position={marker} center zIndexRange={[18,0]} style={{pointerEvents:'none'}}><span className="recognition-marker" aria-label="Structure A">A</span></Html>
  {context&&<RecognitionContext atlas={contextAtlas.scene} center={prepared.sphere.center} radius={context.localRadius} local={s.settings.difficulty==='strict'}/>}</group>;
}
export default function IdentifyScene({id}:{id:string}){
 const issue=useStore(s=>s.identifyIssue),revision=useStore(s=>s.identifyRevision);
 const {scene,camera,controls,invalidate}=useThree();const isolation=useRef<ReturnType<typeof captureIsolation>|null>(null);const orbit=controls as OrbitImpl;const [captured,setCaptured]=useState(false);
 useLayoutEffect(()=>{
  if(!orbit)return;const c=camera as THREE.PerspectiveCamera;
  const snapshot={position:c.position.clone(),quaternion:c.quaternion.clone(),up:c.up.clone(),near:c.near,far:c.far,zoom:c.zoom,fov:c.fov,target:orbit.target.clone(),min:orbit.minDistance,max:orbit.maxDistance,pan:orbit.enablePan,damping:orbit.enableDamping,enabled:orbit.enabled};
  isolation.current=captureIsolation(scene);orbit.enabled=false;setCaptured(true);invalidate();
  return ()=>{isolation.current?.restore();isolation.current=null;orbit.target.copy(snapshot.target);orbit.minDistance=snapshot.min;orbit.maxDistance=snapshot.max;orbit.enablePan=snapshot.pan;orbit.enableDamping=false;c.position.copy(snapshot.position);orbit.update();c.position.copy(snapshot.position);c.quaternion.copy(snapshot.quaternion);c.up.copy(snapshot.up);c.near=snapshot.near;c.far=snapshot.far;c.zoom=snapshot.zoom;c.fov=snapshot.fov;c.updateProjectionMatrix();orbit.enableDamping=snapshot.damping;orbit.enabled=snapshot.enabled;invalidate()};
 },[scene,camera,orbit,invalidate]);
 // This full-graph pass also catches newly mounted/lazy-loaded meshes. A hidden
 // exploration root provides an additional barrier before this pass runs.
 useFrame(()=>isolation.current?.hide(),-10);
 return <group userData={{identifyProtected:true}}><TargetBoundary key={`${id}:${revision}`} id={id}><Suspense fallback={null}>{captured&&!issue&&<Target id={id}/>}</Suspense></TargetBoundary></group>;
}
