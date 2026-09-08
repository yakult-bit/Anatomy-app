import FemaleReferenceNote from './FemaleReferenceNote';
import {atlasInfo,atlasOf,atlasView,hasSystem,type AtlasSex} from '../shared/atlas';
import FindCamera from './FindCamera';
import {findOpacity,findRenderLayer} from './find-visibility';
import LayerControls from './LayerControls';
import IdentifyScene from './IdentifyScene';
import FindInteraction from './FindInteraction';
import FindHighlights from './FindHighlights';
import {CLICK_CORRECT,CLICK_WRONG} from '../shared/click-quiz';
import {isIdentifySceneActive} from './identify-state';
import {Component,Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Html,Line,Outlines,useGLTF,useProgress} from '@react-three/drei';
import * as THREE from 'three';
import type {OrbitControls as OrbitImpl} from 'three-stdlib';
import {anatomy,parts,modelInfo,useStore,useUiStore,useHoverStore,SYSTEMS,type System} from './store';
import {landmarks,type Landmark} from './data/landmarks';
import {LoaderCircle,RotateCcw,AlertCircle,ArrowUpRight,Hand,MousePointer2,ZoomIn,Focus,Eye} from 'lucide-react';
import {inspectionOffset,framingDistance,INSPECT_CENTER,type Vec3} from './atlas-layout';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {BoardScene,BoardCards,BoardControls} from './StudyBoard';
import {modelPath,tintMaterial,paintFindMaterial,setMaterialOpacity,preparePicking,visibleRaycast,requiredSystems} from './model-runtime';
import {Expand,ArrowLeft,Play,Pause,Rotate3D,LayoutGrid} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
class ModelBoundary extends Component<{children:ReactNode;id:string},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true}}componentDidCatch(){useStore.getState().setLoaded(this.props.id,true)}render(){return this.state.error?null:this.props.children}}
class CanvasBoundary extends Component<{children:ReactNode;fallback:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true}}render(){return this.state.error?this.props.fallback:this.props.children}}
type MeshRecord={mesh:THREE.Mesh;id:string;detailId:string;materials:THREE.MeshStandardMaterial[];baseColors:THREE.Color[];alpha:number;target:number;destination:THREE.Vector3};
const matches=(r:MeshRecord,id:string|null|undefined)=>r.id===id||r.detailId===id;
function MovingOutline({record,color}:{record:MeshRecord;color:string}){
 const mesh=useRef<THREE.Mesh>(null);
 useFrame(()=>{if(isIdentifySceneActive(useStore.getState()))return;if(mesh.current){mesh.current.matrix.copy(record.mesh.matrixWorld);mesh.current.visible=record.mesh.visible&&record.target>.1}});
 return <mesh ref={mesh} geometry={record.mesh.geometry} matrixAutoUpdate={false} raycast={()=>{}}><meshBasicMaterial transparent opacity={0} depthWrite={false}/><Outlines thickness={.003} color={color} opacity={.85}/></mesh>
}
function paintRecord(r:MeshRecord){
 const state=useStore.getState();if(isIdentifySceneActive(state))return;
 const quiz=state.mode==='quiz'&&state.quiz&&!state.quiz.finished&&state.quiz.format==='click'?state.quiz:null;
 const hovered=(!quiz||!quiz.feedback)&&matches(r,useHoverStore.getState().hovered);
 r.materials.forEach((m,i)=>{
  if(quiz){const feedback=quiz.feedback,color=feedback?(matches(r,feedback.id)?CLICK_CORRECT:matches(r,feedback.chosen)?CLICK_WRONG:null):null;paintFindMaterial(m,r.baseColors[i],hovered,color,r.target>0&&r.target<.2)}
  else tintMaterial(m,r.baseColors[i],hovered,matches(r,state.selected));
 });
}
function SystemModel({system,sex}:{system:System;sex:AtlasSex}){
 const state=useUiStore(),invalidate=useThree(s=>s.invalidate);const isolated=isIdentifySceneActive(state);
 const gltf=useGLTF(modelPath(system,sex),'/draco/');
 const prepared=useMemo(()=>{
  const scene=gltf.scene.clone(true);const records:MeshRecord[]=[];const byId=new Map<string,MeshRecord[]>();
  scene.traverse(o=>{if(!(o as THREE.Mesh).isMesh)return;const mesh=o as THREE.Mesh;let owner:THREE.Object3D|null=o;let id='',detailId='';while(owner&&!id){id=owner.userData.partId||'';detailId=owner.userData.detailId||'';owner=owner.parent}if(!anatomy[id]){mesh.visible=false;mesh.raycast=()=>{};return}detailId=detailId||id;
   const originals=Array.isArray(mesh.material)?mesh.material:[mesh.material];const materials=originals.map(m=>(m as THREE.MeshStandardMaterial).clone());const baseColors=materials.map(m=>m.color.clone());for(const m of materials)setMaterialOpacity(m,0);mesh.material=Array.isArray(mesh.material)?materials:materials[0];mesh.visible=false;mesh.userData.studyId=id;mesh.userData.structureId=detailId;mesh.raycast=visibleRaycast;mesh.updateMatrix();mesh.matrixAutoUpdate=false;const record={mesh,id,detailId,materials,baseColors,alpha:0,target:0,destination:new THREE.Vector3()};records.push(record);for(const key of new Set([id,detailId])){const list=byId.get(key)||[];list.push(record);byId.set(key,list)}
  });return {scene,records,byId,animating:new Set<MeshRecord>()};
 },[gltf.scene]);
 const quiz=state.mode==='quiz'&&state.quiz&&!state.quiz.finished&&state.quiz.format==='click'?state.quiz:null;
 const target=quiz?anatomy[quiz.questions[quiz.index].id]:null;
 const inspecting=!quiz&&state.view==='inspect'&&state.selected?anatomy[state.selected]:null;
 const findReset=useRef('');
 const highlighted=quiz?(quiz.feedback?.id||(quiz.format!=='click'?target?.id:null)):state.selected;
 useLayoutEffect(()=>{
  if(isIdentifySceneActive(useStore.getState()))return;
  const hidden=new Set(state.hidden),needed=requiredSystems(state).includes(system);
  const key=quiz?`${quiz.index}:${quiz.questions[quiz.index].id}:${state.identifyRevision}`:'';const newFind=!!quiz&&!quiz.feedback&&findReset.current!==key;findReset.current=key;
  for(const r of prepared.records){const p=anatomy[r.detailId];const selected=matches(r,state.selected);let visible=state.active[p.system]&&p.layer>=state.depth&&!hidden.has(r.id)&&!hidden.has(r.detailId)&&(!state.solo||matches(r,state.solo))&&(!p.covering||state.coverings||selected);let alpha=visible?state.opacity[p.system]/100:0;
   if(state.xray&&state.selected&&!selected)alpha*=.12;
   let offset:Vec3=[0,0,0];
   if(inspecting){alpha=selected?state.opacity[p.system]/100:0;offset=selected?inspectionOffset(inspecting):[0,0,0];}
   if(quiz?.format==='click'&&target){
    const isTarget=matches(r,target.id),isWrong=!!quiz.feedback&&!quiz.feedback.correct&&matches(r,quiz.feedback.chosen);
    // Before commitment, the target follows exactly the same visibility as
    // every other part. Only feedback may force an answer into view.
    alpha=findOpacity(p,target,{base:alpha,isTarget,isWrong,hint:!!quiz.hint,feedback:!!quiz.feedback});
    r.mesh.userData.clickFront=!!quiz.feedback&&(isTarget||isWrong);
    r.mesh.userData.findLayer=findRenderLayer(isTarget,isWrong,!!quiz.feedback);
    r.mesh.renderOrder=r.mesh.userData.findLayer?1000+r.mesh.userData.findLayer:0;
    // FindHighlights composites separate background/answer passes. Retain depth
    // testing within each structure so internal submeshes cannot cover its skin.
    r.materials.forEach(m=>{m.depthTest=true;});
   }else{
    r.mesh.userData.clickFront=false;r.mesh.userData.findLayer=0;r.mesh.renderOrder=0;r.materials.forEach(m=>{m.depthTest=true;});
   }
   if(!needed)alpha=0;r.destination.set(...offset);r.target=alpha;r.mesh.userData.pickable=alpha>=.2;
   if(newFind){r.alpha=alpha;r.mesh.visible=alpha>.015;r.mesh.position.copy(r.destination);r.mesh.updateMatrix();r.materials.forEach(m=>setMaterialOpacity(m,alpha));prepared.animating.delete(r)}
   if(r.mesh.userData.pickable)preparePicking(r.mesh.geometry);
   if(quiz?.format==='click'&&r.mesh.userData.clickFront){r.alpha=alpha;r.mesh.visible=true;r.materials.forEach(m=>{setMaterialOpacity(m,1);});}
   if(Math.abs(r.alpha-r.target)>.001||r.mesh.position.distanceToSquared(r.destination)>.0000001)prepared.animating.add(r);
   paintRecord(r);
  }invalidate();
 },[prepared,state.active,state.depth,state.hidden,state.solo,state.opacity,state.xray,state.selected,state.view,state.coverings,quiz,target,highlighted,inspecting,isolated,invalidate]);
 useEffect(()=>useHoverStore.subscribe((next,previous)=>{const changed=new Set([...(prepared.byId.get(previous.hovered||'')||[]),...(prepared.byId.get(next.hovered||'')||[])]);if(!changed.size)return;changed.forEach(paintRecord);invalidate()}),[prepared,invalidate]);
 useFrame((_,dt)=>{if(isIdentifySceneActive(useStore.getState()))return;dt=Math.min(dt,.05);if(!prepared.animating.size)return;for(const r of prepared.animating){const positionMoving=r.mesh.position.distanceToSquared(r.destination)>.0000001;if(positionMoving){r.mesh.position.lerp(r.destination,1-Math.exp(-7*dt));r.mesh.updateMatrix();}else{r.mesh.position.copy(r.destination);r.mesh.updateMatrix();}if(Math.abs(r.alpha-r.target)>.001){r.alpha=THREE.MathUtils.damp(r.alpha,r.target,10,dt);if(Math.abs(r.alpha-r.target)<.001)r.alpha=r.target;r.mesh.visible=r.alpha>.015;r.materials.forEach(m=>setMaterialOpacity(m,r.alpha));}if(Math.abs(r.alpha-r.target)<=.001&&!positionMoving)prepared.animating.delete(r);}if(prepared.animating.size)invalidate();});
 useEffect(()=>{useStore.getState().setLoaded(`${sex}-${system}`);return ()=>prepared.records.forEach(r=>r.materials.forEach(m=>m.dispose()))},[sex,system,prepared]);
 return <group><primitive object={prepared.scene} dispose={null}
  onPointerOver={(e:import('@react-three/fiber').ThreeEvent<PointerEvent>)=>{if(quiz?.format==='click'||!e.object.userData.pickable)return;e.stopPropagation();useHoverStore.getState().setHovered(e.object.userData.structureId);document.body.style.cursor='pointer'}}
  onPointerOut={(e:import('@react-three/fiber').ThreeEvent<PointerEvent>)=>{if(useHoverStore.getState().hovered===e.object.userData.structureId)useHoverStore.getState().setHovered(null);if(!useHoverStore.getState().hovered)document.body.style.cursor='auto'}}
  onClick={(e:import('@react-three/fiber').ThreeEvent<MouseEvent>)=>{if(quiz?.format==='click'||!e.object.userData.pickable||e.delta>5)return;e.stopPropagation();if(!quiz&&!inspecting)state.select(e.object.userData.structureId)}}/>
  {!isolated&&highlighted&&!inspecting&&quiz?.format!=='click'&&(prepared.byId.get(highlighted)||[]).map((record,i)=><MovingOutline key={i} record={record} color={quiz?.feedback&&!quiz.feedback.correct?'#e9aa7e':'#b5e5ff'}/>)}
 </group>
}
const presetVectors:Record<string,number[]>={anterior:[0,0,1],posterior:[0,0,-1],left:[1,0,0],right:[-1,0,0],superior:[0,1,.001]};
function CameraRig(){
 const s=useUiStore();const controls=useRef<OrbitImpl>(null);const command=s.camera;const {camera,size,invalidate}=useThree();const dest=useRef(new THREE.Vector3(0,.2,8.2));const target=useRef(new THREE.Vector3(0,.1,0));const moving=useRef(false);
 const isolated=isIdentifySceneActive(s),wasIsolated=useRef(false),restoredInputs=useRef<unknown[]|null>(null);
 const inspecting=s.mode==='learn'&&s.view==='inspect'&&s.selected?anatomy[s.selected]:null;
 const finding=s.mode==='quiz'&&s.quiz?.format==='click'&&!s.quiz.finished?s.quiz:null;
 useEffect(()=>{
  if(finding){moving.current=false;return}
  const inputs=[command,inspecting,s.view,s.mode,s.active,s.depth,s.hidden,s.solo,s.coverings];if(isolated){wasIsolated.current=true;moving.current=false;return}if(wasIsolated.current){wasIsolated.current=false;restoredInputs.current=inputs;return}if(restoredInputs.current?.every((x,i)=>x===inputs[i]))return;restoredInputs.current=null;
  const point=command.part?anatomy[command.part]:null;const dir=new THREE.Vector3(...presetVectors[command.preset] as Vec3).normalize();const aspect=size.width/size.height;let distance=8.2;
  if(inspecting){target.current.set(...INSPECT_CENTER);distance=framingDistance(inspecting.size/2,42,aspect);}
  else{const view=atlasView(s.sex);target.current.set(...(point?point.position:view.center) as Vec3);distance=point?framingDistance(point.size/2,42,aspect):s.sex==='female'?framingDistance(view.radius,42,aspect):aspect<.7?10:8.2;}
  dest.current.copy(target.current).add(dir.multiplyScalar(Math.max(.06,distance)));moving.current=true;invalidate();
 },[command,size.width,size.height,inspecting,s.view,s.mode,s.active,s.depth,s.hidden,s.solo,s.coverings,isolated,finding?.index,finding?.questions,finding?.feedback,finding?.hint,s.identifyRevision,s.identifyIssue,invalidate]);
 useEffect(()=>{if(s.autoRotate)invalidate()},[s.autoRotate,invalidate]);
 useFrame((_,dt)=>{if(isolated||finding)return;dt=Math.min(dt,.05);if(s.autoRotate)invalidate();if(!controls.current)return;if(moving.current){camera.position.lerp(dest.current,1-Math.exp(-5*dt));controls.current.target.lerp(target.current,1-Math.exp(-5*dt));controls.current.update();if(camera.position.distanceTo(dest.current)<.002)moving.current=false;else invalidate()}});
 return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={finding ? .005 : inspecting?Math.max(.015,inspecting.size*.15):.25} maxDistance={120} target={[0,.12,0]} onStart={()=>moving.current=false} enablePan maxPolarAngle={Math.PI} autoRotate={!!inspecting&&s.autoRotate} autoRotateSpeed={1.2} mouseButtons={{LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}} touches={{ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}/>
}
function Label({id}:{id:string}){const s=useUiStore(),p=anatomy[id];const [occluded,setOccluded]=useState(false);const pos:[number,number,number]=[p.position[0],p.position[1],p.position[2]+.12];const right=p.position[0]>.04;const end:[number,number,number]=[right?Math.max(.75,pos[0]+.3):Math.min(-.75,pos[0]-.3),pos[1]+.07,.3];if(!s.active[p.system]||s.depth>p.layer||s.hidden.includes(id)||s.solo&&s.solo!==id)return null;return <group><Line points={[pos,[end[0]*.8,end[1],end[2]],end]} color={s.selected===id?'#d8edbf':'#81928a'} lineWidth={.6} transparent opacity={occluded?0:.6}/><Html position={end} center zIndexRange={[12,0]} occlude onOcclude={setOccluded} style={{opacity:occluded?0:1,pointerEvents:occluded?'none':'auto'}}><button className={`model-label ${s.selected===id?'selected':''}`} onClick={()=>s.select(id)}>{p.displayName.replace(/^Left |^Right /,'')}<span/></button></Html></group>}
function HoverTooltip(){const hovered=useHoverStore(s=>s.hovered);const p=hovered?anatomy[hovered]:null;return p?<Html position={p.position as Vec3} center zIndexRange={[18,0]}><span className="hover-label">{p.displayName}</span></Html>:null}
function Marker({mark,onSelect}:{mark:Landmark;onSelect:(m:Landmark)=>void}){return <Html position={mark.position} center zIndexRange={[15,0]}><button className={`landmark-pin ${mark.category}`} title={mark.name} aria-label={mark.name} onClick={()=>onSelect(mark)}><span/></button></Html>}
function Scene({onLandmark}:{onLandmark:(m:Landmark)=>void}){
 const s=useUiStore();const needed=requiredSystems(s);const neededKey=needed.join(',');const [visited,setVisited]=useState<System[]>(needed);
 useEffect(()=>{setVisited(v=>[...new Set([...v,...needed])]);const timer=setTimeout(()=>setVisited(needed),500);return ()=>clearTimeout(timer)},[neededKey]);
 const quiz=s.mode==='quiz'&&s.quiz&&!s.quiz.finished;const isolated=isIdentifySceneActive(s);
 return <><ambientLight intensity={1.35}/><directionalLight position={[-3,5,5]} intensity={2.8} color="#fff1dc"/><directionalLight position={[4,1,2]} intensity={1.2} color="#dae9e9"/><directionalLight position={[0,3,-4]} intensity={2} color="#a3bcb4"/>
 <group visible={!isolated}>
 {visited.filter(system=>hasSystem(s.sex,system)).map(system=><ModelBoundary key={`${s.sex}-${system}:${s.identifyRevision}`} id={`${s.sex}-${system}`}><Suspense fallback={null}><SystemModel system={system} sex={s.sex}/></Suspense></ModelBoundary>)}
 {s.labels&&!quiz&&s.view==='body'&&(s.sex==='female'?['female_uterus','female_ovary_l','female_ovary_r','female_bladder']:['deltoid_right','vastus_right','skull','humerus_right','heart','liver','colon','femur_right','tibia_left']).map(id=><Label key={id} id={id}/>)}
 {!quiz&&s.view==='body'&&<HoverTooltip/>}
 {s.sex==='male'&&s.overlay!=='none'&&!quiz&&s.view==='body'&&landmarks.filter(m=>m.category===s.overlay).map(m=><Marker key={m.id} mark={m} onSelect={onLandmark}/>)}
 {s.view==='body'&&<gridHelper args={[12,32,'#314039','#29342f']} position={[0,-2.67,0]} material-transparent material-opacity={.32}/>}
 {s.view==='body'&&<mesh position={[0,-2.663,.02]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.8,.804,80]}/><meshBasicMaterial color="#647269" transparent opacity={.38}/></mesh>}
 </group><CameraRig/>{quiz&&s.quiz?.format==='click'&&<><FindCamera/><FindInteraction key={`${s.quiz.index}:${s.quiz.questions[s.quiz.index].id}`}/><FindHighlights key={`${s.quiz.index}:${s.quiz.questions[s.quiz.index].id}`}/></>}{isolated&&s.quiz&&<IdentifyScene key={`${s.quiz.index}:${s.quiz.questions[s.quiz.index].id}`} id={s.quiz.questions[s.quiz.index].id}/>}
 </>
}
function Loading(){const {progress,active}=useProgress();const s=useUiStore();if(isIdentifySceneActive(s))return null;const waiting=requiredSystems(s).filter(id=>!s.loaded.includes(`${s.sex}-${id}`)&&!s.loadErrors.includes(`${s.sex}-${id}`));if(!active&&!waiting.length)return null;return <div className="model-loading" role="status"><div className="loading-bones"><i/><i/><i/></div><LoaderCircle className="spin" size={20}/><strong>Preparing your anatomy lab</strong><span>Loading body systems · {Math.round(progress)}%</span><Progress value={progress} aria-label="Model loading progress"/></div>}
export default function Viewport({panelOpen,onOpenInfo}:{panelOpen:boolean;onOpenInfo:()=>void}){
 const s=useUiStore();const canvasWrap=useRef<HTMLDivElement>(null);const explorationControls=useRef<HTMLDivElement>(null);const [mark,setMark]=useState<Landmark|null>(null);const [webgl]=useState(()=>{try{return !!document.createElement('canvas').getContext('webgl2')}catch{return false}});
 const fallback=<div className="no-webgl"><AlertCircle/><h3>Explore with the structure list</h3><p>3D needs WebGL 2. You can still study with the text-only structure list in Learn. Visual identification quizzes need the 3D model.</p><button onClick={()=>{s.set({mode:'learn'});document.getElementById('structure-list')?.click()}}>Open structure list <ArrowUpRight size={16}/></button></div>;
 useEffect(()=>{const node=canvasWrap.current;if(!node)return;const observer=new ResizeObserver(([entry])=>{node.parentElement?.style.setProperty('--study-width',`${entry.contentRect.width}px`);const columns=entry.contentRect.width>=900?4:entry.contentRect.width>=580?3:2;const current=useStore.getState();if(current.view==='board'&&current.boardColumns!==columns)current.set({boardColumns:columns,boardPage:0})});observer.observe(node);return ()=>observer.disconnect()},[]);
 useEffect(()=>{useHoverStore.getState().setHovered(null);document.body.style.cursor='auto'},[s.view,s.selected,s.active,s.boardSystem,s.boardPage,s.boardQuery]);
 const quiz=s.mode==='quiz'&&s.quiz&&!s.quiz.finished;
 const framedQuestion=isIdentifySceneActive(s)||!!quiz&&s.quiz?.format==='click';
 useLayoutEffect(()=>{
  const controls=explorationControls.current,viewport=controls?.parentElement;if(quiz||!controls||!viewport)return;
  const board=viewport.querySelector<HTMLElement>('.board-browser-controls');
  const fit=()=>{
   viewport.style.setProperty('--exploration-bottom',`${controls.offsetTop+controls.offsetHeight}px`);
   if(board)viewport.style.setProperty('--board-content-top',`${board.offsetTop+board.offsetHeight+14}px`);
  };
  const observer=new ResizeObserver(fit);observer.observe(controls);observer.observe(viewport);if(board)observer.observe(board);fit();
  return()=>observer.disconnect();
 },[quiz,s.view]);
 useLayoutEffect(()=>{if(!framedQuestion||!canvasWrap.current)return;const node=canvasWrap.current,viewport=node.parentElement!,panel=viewport.parentElement?.querySelector('.quiz-panel');if(!panel)return;
  const fit=()=>{const v=viewport.getBoundingClientRect(),p=panel.getBoundingClientRect();if(window.matchMedia('(max-width:570px)').matches){node.style.setProperty('bottom',`${Math.max(0,v.bottom-p.top+12)}px`);node.style.setProperty('right','0px');}else{node.style.removeProperty('bottom');node.style.setProperty('right',`${Math.max(0,v.right-p.left+12)}px`);}};
  const observer=new ResizeObserver(fit);observer.observe(panel);observer.observe(viewport);fit();return ()=>{observer.disconnect();node.style.removeProperty('bottom');node.style.removeProperty('right')};
 },[framedQuestion,s.quiz?.feedback]);
 return <section className={`viewport ${panelOpen?'has-info':''} view-${isIdentifySceneActive(s)?'body':s.view} ${isIdentifySceneActive(s)?'identify-question':''} ${quiz&&s.quiz?.format==='click'?'find-question':''}`} aria-label="Interactive human anatomy model">
 {!quiz?<div ref={explorationControls} className="viewport-exploration-controls" role="region" aria-label="Model and view controls">
  <div className="viewport-heading"><span className="eyebrow"><span className="live-dot"/> ANATOMY EXPLORER</span><h1>The human body<span>.</span></h1><p>Select a structure. Explore it in 360°.</p></div>
  <div className="viewport-model-row"><div className="viewport-model-switch" role="group" aria-label="Choose anatomy reference view">{(['male','female'] as const).map(sex=><button key={sex} aria-pressed={s.sex===sex} disabled={s.quizBusy||!!s.quiz&&!s.quiz.finished} onClick={()=>s.set({sex})}>{sex==='male'?'Whole-body anatomy':'Female reproductive anatomy'}</button>)}</div><div className="viewport-top-tools"><button aria-label="Toggle structure labels" title="Labels" className={s.labels?'active':''} disabled={!!quiz||s.view!=='body'} onClick={()=>s.set({labels:!s.labels})} aria-pressed={s.labels}><span className="label-icon">A</span><span>Labels</span><kbd>L</kbd></button><button aria-label="Reset view" title="Reset view" disabled={isIdentifySceneActive(s)} onClick={s.reset}><RotateCcw size={15}/><span>Reset view</span><kbd>R</kbd></button></div></div>
  {s.sex==='female'&&<FemaleReferenceNote/>}
  {s.quiz&&!s.quiz.finished&&<p className="viewport-atlas-note">End the practice session to switch models.</p>}
  {<div className="atlas-toolbar"><Tabs value={s.view==='inspect'?s.returnView:s.view} onValueChange={view=>s.setView(view as 'body'|'board')}><TabsList aria-label="Anatomy arrangement"><TabsTrigger value="body">Body</TabsTrigger><TabsTrigger value="board"><LayoutGrid size={15}/>Study board</TabsTrigger></TabsList></Tabs>{s.selected&&s.view==='body'&&<button className="inspect-button" onClick={()=>s.setView('inspect')}><Expand size={15}/>Inspect 360°</button>}</div>}
  <div className="model-context"><span>{s.sex==='male'?'Male model':'NIH 3D · Female reproductive reference organs'}</span><i/>{quiz?'Practice session':s.view==='inspect'?'360° structure view':s.view==='board'?'Flat study board':s.camera.part?'Focused view':({anterior:'Anterior',posterior:'Posterior',left:'Left lateral',right:'Right lateral',superior:'Superior'} as Record<string,string>)[s.camera.preset]+' view'}</div>
  {s.view==='body'&&<div className="viewport-layers"><LayerControls compact/></div>}
  {!panelOpen&&s.selected&&!quiz&&s.view!=='board'&&<button className="reopen-info" onClick={onOpenInfo}><Eye size={16}/> Structure details</button>}
  {s.solo&&s.view!=='inspect'&&!isIdentifySceneActive(s)&&<button className="solo-status" onClick={()=>s.set({solo:null})}>Isolating {anatomy[s.solo].displayName} <span>Show surroundings ×</span></button>}
 </div>:<><div className="viewport-heading"><span className="eyebrow"><span className="live-dot"/> ANATOMY EXPLORER</span><h1>The human body<span>.</span></h1><p>Select a structure. Explore it in 360°.</p></div><div className="model-context"><span>{s.sex==='male'?'Male model':'NIH 3D · Female reproductive reference organs'}</span><i/>{quiz?'Practice session':s.view==='inspect'?'360° structure view':s.view==='board'?'Flat study board':s.camera.part?'Focused view':({anterior:'Anterior',posterior:'Posterior',left:'Left lateral',right:'Right lateral',superior:'Superior'} as Record<string,string>)[s.camera.preset]+' view'}</div><div className="viewport-top-tools"><button aria-label="Toggle structure labels" title="Labels" className={s.labels?'active':''} disabled={!!quiz||s.view!=='body'} onClick={()=>s.set({labels:!s.labels})} aria-pressed={s.labels}><span className="label-icon">A</span><span>Labels</span><kbd>L</kbd></button><button aria-label="Reset view" title="Reset view" disabled={isIdentifySceneActive(s)} onClick={s.reset}><RotateCcw size={15}/><span>Reset view</span><kbd>R</kbd></button></div></>}
 {s.view==='board'&&!quiz&&<BoardControls/>}
 {s.view==='inspect'&&s.selected&&!quiz&&<div className="inspection-controls"><span className="eyebrow">360° INSPECTION</span><h2>{anatomy[s.selected].displayName}</h2><p>Drag to turn · Scroll or pinch to zoom</p><div><button onClick={s.returnToAtlas}><ArrowLeft size={16}/>Return to {s.returnView==='board'?'study board':'body'}</button><button aria-pressed={s.autoRotate} onClick={()=>s.set({autoRotate:!s.autoRotate})}>{s.autoRotate?<Pause size={16}/>:<Play size={16}/>}Auto-rotate</button></div></div>}

 <div ref={canvasWrap} className="canvas-wrap" onContextMenu={e=>e.preventDefault()}>{webgl?<CanvasBoundary fallback={fallback}><Canvas frameloop="demand" dpr={s.quality==='smooth'?1:[1,1.75]} camera={{position:[0,.2,8.2],fov:42,near:.001,far:250}} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} onCreated={({raycaster,gl})=>{raycaster.firstHitOnly=true;gl.domElement.setAttribute("role","img");gl.domElement.setAttribute("aria-label","Interactive 3D anatomy. Use the Structure library for keyboard and screen reader study.")}} onPointerMissed={()=>useHoverStore.getState().setHovered(null)}>{s.view==='board'&&!quiz?<ModelBoundary id={`${s.sex}-${s.boardSystem}`} key={`${s.sex}-${s.boardSystem}`}><BoardScene/></ModelBoundary>:<Scene key={s.sex} onLandmark={setMark}/>}</Canvas></CanvasBoundary>:s.view==='board'?null:fallback}{s.view==='board'&&!quiz&&<BoardCards/>}</div>
 {webgl&&<Loading/>}
 {quiz&&s.view==='body'&&!isIdentifySceneActive(s)&&<div className="viewport-layers"><LayerControls compact/></div>}



 {s.view==='body'&&<><div className="anatomy-side left">R</div><div className="anatomy-side right">L</div></>}
 {s.loadErrors.length>0&&<div className="load-warning" role="alert"><AlertCircle size={16}/> A model could not load. <button onClick={()=>location.reload()}>Reload models</button></div>}
 {s.sex==='male'&&mark&&!quiz&&s.view==='body'&&s.overlay===mark.category&&<div className="landmark-note"><button className="note-close" onClick={()=>setMark(null)} aria-label="Close landmark">×</button><span className="eyebrow">NURSING LANDMARK</span><h3>{mark.name}</h3><p>{mark.note}</p>{mark.view&&<button className="text-link" onClick={()=>s.set({camera:{preset:mark.view!,part:null,token:s.camera.token+1}})}>View from {mark.view} <ArrowUpRight size={14}/></button>}</div>}
 {s.view!=='board'&&!isIdentifySceneActive(s)&&<div className="camera-bar" aria-label="Camera angle presets">{[['anterior','Front'],['posterior','Back'],['left','Left'],['right','Right'],['superior','Top']].map(([id,title])=><button key={id} title={{anterior:'Anterior',posterior:'Posterior',left:'Left lateral',right:'Right lateral',superior:'Superior'}[id]} className={s.camera.preset===id&&!s.camera.part?'active':''} onClick={()=>s.set({camera:{preset:id,part:null,token:s.camera.token+1}})}><span className={`angle-icon ${id}`}><span/></span>{title}</button>)}<span className="camera-divider"/><button className="frame-button" onClick={()=>s.selected?s.select(s.selected,true):s.reset()} title="Frame selected structure"><Focus size={18}/></button></div>}
 {s.view!=='board'&&<div className="viewport-bottom"><div className="gesture-help"><span><MousePointer2 size={13}/> Drag to rotate</span><span><ZoomIn size={13}/> Scroll to zoom</span><span><Hand size={13}/> Right-drag to pan</span></div><a className="model-disclaimer" href={atlasInfo(s.sex).credits} target="_blank" rel="noreferrer" style={{pointerEvents:'auto'}}>{s.sex==='female'?'NIH 3D HRA · Visible Human Female · CC BY 4.0':'Z-Anatomy · CC BY-SA'}</a></div>}
 </section>
}
