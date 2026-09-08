import {useLayoutEffect,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {useStore,useHoverStore} from './store';
export function isVisiblePickable(mesh:THREE.Object3D){if(!(mesh as THREE.Mesh).isMesh||!mesh.userData.pickable)return false;for(let o:THREE.Object3D|null=mesh;o;o=o.parent)if(!o.visible)return false;return true}
export function touchDecision(previous:string|null,current:string|null){return {commit:!!current&&previous===current,next:current}}
export function pickStructure(scene:THREE.Object3D,ray:THREE.Raycaster){const meshes:THREE.Object3D[]=[];scene.updateMatrixWorld(true);scene.traverse(o=>{if(isVisiblePickable(o))meshes.push(o)});const hit=ray.intersectObjects(meshes,false)[0];return (hit?.object.userData.structureId as string|undefined)||null}
export default function FindInteraction(){
 const {gl,scene,camera,setEvents,get,invalidate}=useThree();const touch=useRef<string|null>(null);
 useLayoutEffect(()=>{
  const canvas=gl.domElement,previousEvents=get().events.enabled;setEvents({enabled:false});
  const ray=new THREE.Raycaster();ray.firstHitOnly=true;const point=new THREE.Vector2();let timer:ReturnType<typeof setTimeout>|null=null,last=0,pending:PointerEvent|null=null;let down:{x:number;y:number}|null=null;const pointers=new Set<number>();let multi=false;
  const unlocked=()=>{const s=useStore.getState();return s.mode==='quiz'&&s.quiz?.format==='click'&&!s.quiz.feedback&&!s.quiz.finished&&!s.quizBusy&&s.findReady};
  const clear=()=>{if(timer)clearTimeout(timer);timer=null;pending=null;useHoverStore.getState().setHovered(null);canvas.style.cursor='default';touch.current=null;invalidate()};
  function pick(e:PointerEvent){if(!unlocked()||document.elementFromPoint(e.clientX,e.clientY)?.closest('.quiz-panel'))return null;const rect=canvas.getBoundingClientRect();point.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(point,camera);
   // Nearest visible geometry only; the requested answer has no pick priority.
   return pickStructure(scene,ray);
  }
  function update(){timer=null;if(!pending)return;last=performance.now();const id=pick(pending);if(useHoverStore.getState().hovered!==id){useHoverStore.getState().setHovered(id);invalidate()}canvas.style.cursor=id?'pointer':'default'}
  function move(e:PointerEvent){if(e.pointerType==='touch'||!unlocked())return;pending=e;if(performance.now()-last>=33)update();else if(!timer)timer=setTimeout(update,33-(performance.now()-last))}
  function start(e:PointerEvent){pointers.add(e.pointerId);multi=pointers.size>1;if(multi)clear();down={x:e.clientX,y:e.clientY}}
  function end(e:PointerEvent){const moved=!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6;pointers.delete(e.pointerId);if(multi||moved||e.button>0||!unlocked()){if(multi||moved)clear();if(!pointers.size)multi=false;return}const id=pick(e);if(e.pointerType==='touch'){const decision=touchDecision(touch.current,id);touch.current=decision.next;useHoverStore.getState().setHovered(id);invalidate();if(!decision.commit)return;}if(id){void useStore.getState().answer(id);clear()}}
  // Touch pointerleave fires after every tap. Keep the anonymous highlight and
  // first-tap identity until the next tap, rather than losing confirmation.
  function leave(e:PointerEvent){if(e.pointerType!=='touch')clear()}
  clear();document.body.style.cursor='auto';
  const changed=useStore.subscribe((s,previous)=>{if(s.quiz?.feedback||s.quiz?.finished||s.active!==previous.active||s.depth!==previous.depth||s.opacity!==previous.opacity||s.hidden!==previous.hidden)clear()});
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',clear);
  return ()=>{clear();changed();setEvents({enabled:previousEvents});canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointerup',end);canvas.removeEventListener('pointercancel',clear)};
 },[gl,scene,camera,setEvents,get,invalidate]);return null;
}
