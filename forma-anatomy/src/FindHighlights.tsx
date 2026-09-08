import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Html,Line,Outlines} from '@react-three/drei';
import * as THREE from 'three';
import {anatomy,useUiStore,useHoverStore} from './store';
import {CLICK_CORRECT,CLICK_WRONG,CLICK_HOVER} from '../shared/click-quiz';
import {renderFindLayers} from './find-render-runtime';

function MeshOutline({source,color}:{source:THREE.Mesh;color:string}){
 const ref=useRef<THREE.Mesh>(null);
 useFrame(()=>{if(ref.current){ref.current.matrix.copy(source.matrixWorld);ref.current.visible=source.visible;ref.current.traverse(o=>{if(o!==ref.current&&(o as THREE.Mesh).isMesh){const m=(o as THREE.Mesh).material as THREE.Material;m.depthTest=true;m.depthWrite=false;}})}});
 return <mesh ref={ref} geometry={source.geometry} matrixAutoUpdate={false} raycast={()=>{}} renderOrder={1003}>
  <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false}/>
  <Outlines screenspace={false} angle={0} thickness={2.5} color={color} opacity={1} transparent toneMapped={false} renderOrder={1000}/>
 </mesh>;
}
function RevealLabel({id,correct,picked=false}:{id:string;correct:boolean;picked?:boolean}){
 const p=anatomy[id],position=new THREE.Vector3(...p.position as [number,number,number]);
 const b=p.bounds!,extent=Math.max(...b.max.map((v,i)=>v-b.min[i]));
 const end=position.clone().add(new THREE.Vector3((picked?-1:1)*extent*.45,extent*.2,extent*.15));
 const color=correct?CLICK_CORRECT:CLICK_WRONG;
 // Solid + check / dashed + cross are always present, including colorblind use.
 return <group><Line points={[position,end]} color={color} lineWidth={2} dashed={!correct} dashSize={extent*.04} gapSize={extent*.025} depthTest={false} renderOrder={1005}/>
  <Html position={end} center zIndexRange={[18,0]} style={{pointerEvents:'none'}}><span className={`find-reveal-label ${correct?'is-correct':'is-wrong'}`}>{correct?'✓':'✕'} {p.displayName}</span></Html>
 </group>;
}
function DashedBoundary({source}:{source:THREE.Mesh}){
 const geometry=useMemo(()=>{const b=source.geometry.boundingBox||(source.geometry.computeBoundingBox(),source.geometry.boundingBox!);const size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());const box=new THREE.BoxGeometry(...size.toArray());box.translate(...center.toArray());const edges=new THREE.EdgesGeometry(box);box.dispose();return edges},[source]);
 const ref=useRef<THREE.LineSegments>(null);
 useEffect(()=>{ref.current?.computeLineDistances();return ()=>geometry.dispose()},[geometry]);
 useFrame(()=>{if(ref.current)ref.current.matrix.copy(source.matrixWorld)});
 return <lineSegments ref={ref} geometry={geometry} matrixAutoUpdate={false} raycast={()=>{}} renderOrder={1005}><lineDashedMaterial color={CLICK_WRONG} dashSize={Math.max(.0001,anatomy[source.userData.structureId].size*.07)} gapSize={Math.max(.00005,anatomy[source.userData.structureId].size*.04)} depthTest={false}/></lineSegments>;
}
export default function FindHighlights(){
 const s=useUiStore(),hover=useHoverStore(s=>s.hovered),q=s.quiz!,feedback=q.feedback;const {gl,scene,camera,invalidate}=useThree();const pulseStart=useRef(0),revealStart=useRef(0);
 useFrame(()=>{if(feedback)renderFindLayers(gl,scene,camera);else gl.render(scene,camera)},1);
 const chosen=feedback&&anatomy[feedback.chosen]?feedback.chosen:null;
 const ids=feedback?[feedback.id,...(chosen?[chosen]:[])]:s.findReady&&hover?[hover]:[];
 const records=useMemo(()=>{const all:THREE.Mesh[]=[];scene.traverse(o=>{if((o as THREE.Mesh).isMesh&&o.userData.structureId&&ids.some(id=>id===o.userData.structureId||id===o.userData.studyId))all.push(o as THREE.Mesh)});return all},[scene,ids.join(','),s.loaded,s.active]);
 useEffect(()=>{pulseStart.current=0;revealStart.current=performance.now();invalidate()},[feedback,hover,s.loaded,invalidate]);
 useFrame(()=>{if(!feedback)return;const now=performance.now();if(!pulseStart.current){const b=anatomy[feedback.id].bounds!,visible=Array.from({length:8},(_,bits)=>new THREE.Vector3(...[0,1,2].map(i=>(bits>>i)&1?b.max[i]:b.min[i]) as [number,number,number]).project(camera)).every(v=>Math.abs(v.x)<.9&&Math.abs(v.y)<.9&&v.z>-1&&v.z<1);if(visible||now-revealStart.current>5000)pulseStart.current=now;}
  const elapsed=pulseStart.current?now-pulseStart.current:0,glow=elapsed<2700?.45+.35*(.5+.5*Math.sin(elapsed/210)):.45;for(const mesh of records){if(mesh.userData.structureId!==feedback.id&&mesh.userData.studyId!==feedback.id)continue;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){(material as THREE.MeshStandardMaterial).emissiveIntensity=glow;}}if(elapsed<2700)invalidate()});
 return <group>{records.map(mesh=>{const correct=!!feedback&&(feedback.id===mesh.userData.structureId||feedback.id===mesh.userData.studyId);return <group key={mesh.uuid} userData={{findLayer:feedback?(correct?2:1):0}}><MeshOutline source={mesh} color={feedback?correct?CLICK_CORRECT:CLICK_WRONG:CLICK_HOVER}/>{feedback&&!correct&&<DashedBoundary source={mesh}/>}</group>})}{feedback&&<group userData={{findLayer:2}}><RevealLabel id={feedback.id} correct/></group>}{chosen&&chosen!==feedback?.id&&<group userData={{findLayer:feedback?.correct?2:1}}><RevealLabel id={chosen} correct={!!feedback?.correct} picked/></group>}</group>;
}
