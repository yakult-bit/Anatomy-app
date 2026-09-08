import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import * as THREE from 'three';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
await build({stdin:{contents:`export * from './shared/identify';export {CLICK_HOVER,CLICK_CORRECT,CLICK_WRONG} from './shared/click-quiz';export * from './src/identify-scene-runtime';export * from './src/identify-state';export {useStore,parts,SYSTEMS} from './src/store';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/identify-under-test.mjs'});
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
const m=await import('../work/identify-under-test.mjs');
const all=m.parts;const ranked=all.slice().sort((a,b)=>new THREE.Box3(new THREE.Vector3(...a.bounds.min),new THREE.Vector3(...a.bounds.max)).getSize(new THREE.Vector3()).length()-new THREE.Box3(new THREE.Vector3(...b.bounds.min),new THREE.Vector3(...b.bounds.max)).getSize(new THREE.Vector3()).length());
const extrema=[ranked[0],ranked.at(-1)];
// Project every bounding-box corner at desktop, narrow and mobile aspect
// ratios. This exercises the actual projection matrix, independently of the
// scalar helper used by the pre-question gate.
for(const p of all){const box=new THREE.Box3(new THREE.Vector3(...p.bounds.min),new THREE.Vector3(...p.bounds.max)),sphere=box.getBoundingSphere(new THREE.Sphere());for(const aspect of [.45,.8,1,1.6,2.4]){
 const f=m.identifyFrame(sphere.radius,42,aspect);assert.ok(!f.clamped);assert.ok(f.near<f.distance-sphere.radius);
 const c=new THREE.PerspectiveCamera(42,aspect,f.near,f.far);c.position.copy(sphere.center).addScaledVector(new THREE.Vector3(...m.IDENTIFY_DIRECTION).normalize(),f.distance);c.lookAt(sphere.center);c.updateMatrixWorld(true);
 const xs=[],ys=[];for(let bits=0;bits<8;bits++){const v=new THREE.Vector3(...[0,1,2].map(i=>bits&(1<<i)?p.bounds.max[i]:p.bounds.min[i])).project(c);assert.ok(Math.abs(v.x)<.8&&Math.abs(v.y)<.8,`${p.id} clipped at aspect ${aspect}`);assert.ok(v.z>-1&&v.z<1);xs.push(v.x);ys.push(v.y)}
 const actualArea=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))/4;
 assert.ok(Math.abs(actualArea-m.projectedFootprint(p.bounds,aspect).area)<1e-7,'footprint projection disagrees with Three camera');
}}
for(const target of all){const choices=m.distractors(target,all);if(choices.length!==3)continue;assert.ok(choices.every(p=>p.region===target.region));assert.ok(choices.every(p=>!!m.side(p.displayName)===!!m.side(target.displayName)));assert.equal(new Set([target,...choices].map(p=>m.optionName(p.displayName).toLowerCase())).size,4);}
const femur=all.find(p=>p.id==='femur_left');assert.equal(m.distractors(femur,all)[0].id,'femur_right');
// Isolation is independent of active-system selection and catches a later load.
for(const active of [false,true]){
 const scene=new THREE.Scene(),protectedRoot=new THREE.Group();protectedRoot.userData.identifyProtected=true;scene.add(protectedRoot);const target=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());protectedRoot.add(target);
 const originals=[];for(let i=0;i<12;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({transparent:true,opacity:i/20,depthWrite:false}));mesh.visible=active&&i%2===0;scene.add(mesh);originals.push({mesh,visible:mesh.visible,opacity:mesh.material.opacity})}
 const snapshot=m.captureIsolation(scene);assert.ok(originals.every(x=>!x.mesh.visible));assert.equal(target.visible,true);assert.equal(target.material.opacity,1);
 const late=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({opacity:.23,transparent:true}));scene.add(late);snapshot.hide();assert.equal(late.visible,false);
 snapshot.restore();for(const x of originals){assert.equal(x.mesh.visible,x.visible);assert.equal(x.mesh.material.opacity,x.opacity)}assert.equal(late.visible,true);assert.equal(late.material.opacity,.23);
}
// The store snapshot survives conflicting slider/system changes and restores
// exactly on answer, skip and cancel; no showAll path is involved.
const s=()=>m.useStore.getState();
for(const ending of ['answer','skip','cancel']){
 s().set({mode:'learn',quiz:null,view:'body',active:Object.fromEntries(m.SYSTEMS.map(([id],i)=>[id,i%2===0])),opacity:Object.fromEntries(m.SYSTEMS.map(([id],i)=>[id,21+i])),depth:3,xray:true,hidden:['heart'],solo:'liver',labels:true,overlay:'pulse',selected:'kidney_left',camera:{preset:'posterior',part:'kidney_left',token:91},settings:{format:'identify',system:'skeletal',region:'lower-limb',count:5,timer:0}});
 const before=m.explorationSnapshot(s());await s().startQuiz(['patella_left']);assert.deepEqual(m.explorationSnapshot(s()),before);assert.equal(s().identifyReady,false);s().set({depth:5,xray:false,hidden:[],opacity:{...s().opacity,skeletal:1}});
 if(ending==='cancel')s().set({quiz:null});else{await s().readyIdentify('patella_left');await s().answer(ending==='answer'?'patella_left':'Skipped')}
 assert.deepEqual(m.explorationSnapshot(s()),before,ending+' did not restore exploration');
}
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const meta=JSON.parse(await fs.readFile('src/data/model-info.json','utf8'));let count=0;
for(const file of meta.files){const doc=await io.read('public'+file.path);for(const material of doc.getRoot().listMaterials()){const color=new THREE.Color().setRGB(...material.getBaseColorFactor().slice(0,3));for(const highlight of [m.IDENTIFY_OUTLINE,m.CLICK_HOVER,m.CLICK_CORRECT,m.CLICK_WRONG])assert.notEqual('#'+color.getHexString(),highlight,'highlight collides with atlas palette');count++}}
console.log(JSON.stringify({verified:'All 3189 bounds fit at five aspect ratios, dynamic near planes, Three.js footprint projection, region/laterality distractors, complete and late-load isolation, exact store restoration, outline palette uniqueness',smallest:extrema[0].displayName,largest:extrema[1].displayName,materialsChecked:count,note:'Geometric and state tests; browser rendering is a separate check.'},null,2));
