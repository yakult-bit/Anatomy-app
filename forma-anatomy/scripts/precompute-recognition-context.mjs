// Build-only: preserve atlas coordinates, merge reference geometry into two
// draw batches, and select nearby bone bounds without any runtime vertex work.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import {draco as compress} from '@gltf-transform/functions';
import draco from 'draco3dgltf';
import * as T from 'three';

const female=process.argv.includes('--female'),prefix=female?'female-':'',folder=female?'hra-female':'z-anatomy';
const dataPath=`src/data/${prefix}anatomy.json`,geometryPath=`src/data/${prefix}recognition-geometry.json`;
const output=`src/data/${prefix}recognition-context.json`,asset=`public/models/${folder}/recognition-context.glb`,reportPath=`public/data/${prefix}recognition-context-skips.json`;
const data=JSON.parse(await fs.readFile(dataPath,'utf8'));
const geometry=JSON.parse(await fs.readFile(geometryPath,'utf8'));
const meta=JSON.parse(await fs.readFile(`src/data/${prefix}model-info.json`,'utf8'));
const files=meta.files.filter(f=>['skeletal','integumentary'].includes(f.system));
const hash=createHash('sha256');
for(const path of ['scripts/precompute-recognition-context.mjs',dataPath,geometryPath,...files.map(f=>'public'+f.path)])hash.update(path).update(await fs.readFile(path));
const sourceHash=hash.digest('hex');
let previous;try{previous=JSON.parse(await fs.readFile(output,'utf8'))}catch{}
if(previous?.sourceHash===sourceHash){
 const actual=createHash('sha256').update(await fs.readFile(asset)).digest('hex');
 const report=JSON.parse(await fs.readFile(reportPath,'utf8'));
 if(actual===previous.assetHash&&report.sourceHash===sourceHash){console.log('Recognition context is current.');process.exit(0)}
}
if(process.argv.includes('--check'))throw Error('Recognition context is stale. Run npm run quiz:precompute');
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule(),'draco3d.encoder':await draco.createEncoderModule()});
const doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene('Recognition anatomical references');
doc.getRoot().getAsset().copyright=female?'NIH 3D Human Reference Atlas / Visible Human Female; Kristen Browne, Heidi Schlehlein; Forma adaptations, CC BY 4.0. See /credits/hra-female.html. Original coordinates retained.':'Z-Anatomy / BodyParts3D and contributors. CC BY-SA 4.0; see /credits/z-anatomy.html. Derived from the atlas GLBs by merging meshes; original anatomical coordinates retained.';
const bones=[],batches=[];
function isBone(name){return !/ligament|cartilage|suture|disc|membrane|capsule|tendon|sinus|articular|bursa|fat_pad/i.test(name)&&/bone|femur|tibia|fibula|radius|ulna|humerus|patella|clavicle|scapula|vertebra|atlas_|axis_|sternum|sacrum|coccyx|mandible|maxilla|vomer|calcaneus|talus|incus|stapes|malleus|rib[lr]$|phalanx|hyoid|xiphoid/i.test(name)}
for(const file of files){
 const source=await io.read('public'+file.path),pieces=[],names=[];
 let vertices=0,indices=0;
 for(const node of source.getRoot().listNodes()){
  if(!node.getMesh())continue;
  const extras=node.getExtras(),name=extras.sourceMeshName||node.getName();
  if(file.system==='skeletal'&&!female&&!isBone(name))continue;
  const matrix=new T.Matrix4().fromArray(node.getWorldMatrix()),normalMatrix=new T.Matrix3().getNormalMatrix(matrix),box=new T.Box3(),v=new T.Vector3();
  for(const p of node.getMesh().listPrimitives()){
   const positions=Float32Array.from(p.getAttribute('POSITION').getArray()),normals=Float32Array.from(p.getAttribute('NORMAL').getArray());
   for(let i=0;i<positions.length;i+=3){v.fromArray(positions,i).applyMatrix4(matrix);box.expandByPoint(v);v.toArray(positions,i);v.fromArray(normals,i).applyMatrix3(normalMatrix).normalize().toArray(normals,i)}
   const index=p.getIndices()?.getArray()||Uint32Array.from({length:positions.length/3},(_,i)=>i);
   pieces.push({positions,normals,index});vertices+=positions.length/3;indices+=index.length;
  }
  names.push(name);
  if(file.system==='skeletal'){const p=data[extras.detailId||extras.partId];bones.push({name,id:extras.detailId||extras.partId,region:p?.region,displayName:p?.displayName||name,min:box.min.toArray(),max:box.max.toArray()})}
 }
 const position=new Float32Array(vertices*3),normal=new Float32Array(vertices*3),index=new Uint32Array(indices);
 let v=0,i=0;for(const p of pieces){position.set(p.positions,v*3);normal.set(p.normals,v*3);for(const n of p.index)index[i++]=n+v;v+=p.positions.length/3}
 const kind=file.system==='skeletal'?'skeleton':'surface';
 const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(position).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(normal).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(index).setBuffer(buffer));
 scene.addChild(doc.createNode(kind).setMesh(doc.createMesh(kind).addPrimitive(primitive)).setExtras({recognitionContext:kind}));
 batches.push({kind,sourceMeshes:names,triangles:indices/3});
}
await doc.transform(compress());await io.write(asset,doc);
const assetHash=createHash('sha256').update(await fs.readFile(asset)).digest('hex');
const structures={};
const regions={'head-neck':'Head and neck',thorax:'Chest',abdomen:'Abdomen',pelvis:'Pelvis','upper-limb':'Upper limb','lower-limb':'Lower limb'};
const direction=new T.Vector3(.12,.05,1).normalize();
function span(p,g,radius,aspect){
 const camera=new T.PerspectiveCamera(42,aspect,.000001,250),center=new T.Vector3(...g.center);
 const distance=radius/Math.sin(Math.atan(Math.tan(42*Math.PI/360)*Math.min(1,aspect)))*1.6;
 camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld();
 const box=new T.Box3();for(let bits=0;bits<8;bits++)box.expandByPoint(new T.Vector3(...[0,1,2].map(i=>(bits>>i)&1?p.bounds.max[i]:p.bounds.min[i])).project(camera));
 const size=box.getSize(new T.Vector3());return Math.max(size.x,size.y)/2;
}
for(const p of Object.values(data)){
 const g=geometry.structures[p.meshName];if(!g||!p.bounds||!g.radius)continue;
 const center=new T.Vector3(...g.center),target=new Set(p.sourceMeshNames||[]),neighborhood=new T.Box3().setFromCenterAndSize(center,new T.Vector3().setScalar(g.radius*5));
 const right=/\bright\b/i.test(p.displayName),left=/\bleft\b/i.test(p.displayName),side=right?'Right ':left?'Left ':'';
 const compatible=b=>!target.has(b.name)&&!(right&&/\bleft\b/i.test(b.displayName))&&!(left&&/\bright\b/i.test(b.displayName))&&
  (p.region==='upper-limb'?['upper-limb','thorax'].includes(b.region):p.region==='lower-limb'?['lower-limb','pelvis'].includes(b.region):!['upper-limb','lower-limb'].includes(b.region));
 const nearby=bones.filter(compatible).map(b=>({...b,box:new T.Box3(new T.Vector3(...b.min),new T.Vector3(...b.max))})).map(b=>({...b,distance:b.box.distanceToPoint(center)})).sort((a,b)=>a.distance-b.distance).slice(0,6);
 const context=new T.Box3(new T.Vector3(...p.bounds.min),new T.Vector3(...p.bounds.max));
 for(const bone of nearby){const local=bone.box.clone().intersect(neighborhood);if(!local.isEmpty())context.union(local)}
 let radius=g.radius*1.65;
 for(let bits=0;bits<8;bits++){const corner=new T.Vector3(...[0,1,2].map(i=>(bits>>i)&1?context.max.getComponent(i):context.min.getComponent(i)));radius=Math.max(radius,center.distanceTo(corner))}
 // Keep local bone ends around a joint without framing the entire length of
 // the radius/ulna for a wrist ligament. Full bones still render outside it.
 radius=Math.min(radius,g.radius*2.8);
 const names=nearby.map(b=>b.name).join(' ');
 let cue=regions[p.region]||'Body';
 if(p.region==='upper-limb'&&/scaphoid|lunate|triquetr|pisiform|trapez|capitate|hamate/i.test(names)&&g.radius<.15)cue='wrist';
 else if(p.region==='upper-limb'&&/phalanx|metacarpal/i.test(names)&&g.radius<.15)cue='hand';
 else if(p.region==='lower-limb'&&/talus|calcaneus|navicular|cuboid/i.test(names)&&g.radius<.18)cue='ankle and foot';
 else if(p.region==='head-neck'&&/vitreous|retina|lens|ocular|eyeball/i.test(p.displayName))cue='eye region';
 else cue=cue.toLowerCase();
 // Static bins keep setup a lookup. Use target span (longest screen dimension),
 // not filled pixel area: a long bone naturally has a small filled area.
 const frames=geometry.aspects.slice(0,-1).map((a,i)=>{
  const samples=[a,(a+geometry.aspects[i+1])/2,geometry.aspects[i+1]];
  let r=radius;
  for(let pass=0;pass<4;pass++){
   const values=samples.map(aspect=>span(p,g,r,aspect)),min=Math.min(...values),max=Math.max(...values);
   if(min<.16)r=Math.max(g.radius*1.35,r*min/.17);
   else if(max>.4)r*=max/.39;
   else break;
  }
  const values=samples.map(aspect=>span(p,g,r,aspect)),min=Math.min(...values),max=Math.max(...values);
  return [r,min,max,min<.15?'context_target_too_small':max>.405?'context_target_too_large':null];
 });
 structures[p.meshName]={radius,localRadius:Math.max(radius*2.2,g.radius*4),neighbors:nearby.filter(b=>b.distance<g.radius*5).map(b=>b.name),cue:side+cue,frames};
}
const round=(_,v)=>typeof v==='number'?Number(v.toFixed(8)):v;
await fs.writeFile(output,JSON.stringify({version:1,sourceHash,assetHash,path:`/models/${folder}/recognition-context.glb`,aspects:geometry.aspects,batches,structures},round)+'\n');
await fs.writeFile(reportPath,JSON.stringify({sourceHash,skipped:Object.entries(structures).flatMap(([meshName,e])=>e.frames.some(f=>f[3])?[{meshName,frames:e.frames.flatMap((f,i)=>f[3]?[{minAspect:geometry.aspects[i],maxAspect:geometry.aspects[i+1],reason:f[3],minSpan:f[1],maxSpan:f[2]}]:[])}]:[])},round,2)+'\n');
console.log(`Built ${batches.length} context batches from real atlas meshes; ${bones.length} bone references; ${Object.keys(structures).length} contextual frames.`);
