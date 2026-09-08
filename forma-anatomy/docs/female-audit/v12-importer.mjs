// Adapt the premade HRA female meshes. No generated anatomy or male geometry.
// The pinned intermediate exports preserve HRA's original named structures.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import {draco as compress} from '@gltf-transform/functions';
import draco from 'draco3dgltf';
import * as T from 'three';
import {projectedCoverage} from './projected-coverage.mjs';

const commit='7e2c5cb866196d247c494539f443d759485ba69a';
const base=`https://raw.githubusercontent.com/Nurkan1/Anatria-3D/${commit}/public/anatomy/`;
const sourceDir='work/hra-source',out='public/models/hra-female';
const sha=b=>createHash('sha256').update(b).digest('hex');
await fs.mkdir(sourceDir,{recursive:true});await fs.mkdir(out,{recursive:true});
async function source(name){try{return await fs.readFile(`${sourceDir}/${name}`)}catch{const r=await fetch(base+name,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Source download failed: ${name}`);const b=Buffer.from(await r.arrayBuffer());await fs.writeFile(`${sourceDir}/${name}`,b);return b}}
const manifestBytes=await source('manifest_female.json'),manifest=JSON.parse(manifestBytes);
if(manifest.gender_model!=='female'||manifest.license!=='CC-BY-4.0')throw Error('Unexpected female source or licence');
const lessons=JSON.parse(await fs.readFile('src/data/female-lessons.json','utf8'));
const male=JSON.parse(await fs.readFile('src/data/anatomy.json','utf8'));
const palette={skeletal:'#d7cdb5',cardiovascular:'#b64443',digestive:'#b98e72',urinary:'#a3656c',reproductive:'#c59aa1',lymphatic:'#93ae71',integumentary:'#c69e87'};
const docs=new Map(),content={},groups=new Map(),boxes=new Map(),piecesById=new Map(),sourceFiles=[];
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.encoder':await draco.createEncoderModule(),'draco3d.decoder':await draco.createDecoderModule()});
// HRA uses metres, +X anatomical left, +Y superior, +Z anterior.
// Keep relative positions and scale intact; centre this separate torso atlas.
const scale=100*5.48/171.35384583400383;
const transform=new T.Matrix4().makeScale(scale,scale,scale);transform.setPosition(0,-.3355*scale,.0465*scale);
function groupFor(p){
 const root=p.path[0],side=p.organ_id.endsWith('_l')?'left':p.organ_id.endsWith('_r')?'right':null;
 if(root==='Uterus')return 'uterus';
 if(root==='Kidney'&&side)return 'kidney_'+side;
 if(root==='Breast'&&side)return 'breast_'+side;
 if(root==='Uterine tube'&&side)return 'uterine_tube_'+side;
 return {'Urinary bladder':'bladder',Liver:'liver',Pancreas:'pancreas',Spleen:'spleen'}[root]||null;
}
function regionOf(p){
 if(p.path[0]==='Vertebral column')return /atlas_c1|axis_c2|vertebra_c/.test(p.organ_id)?'head-neck':/vertebra_t/.test(p.organ_id)?'thorax':'abdomen';
 if(p.system==='reproductive'||['Pelvic girdle','Pelvic vessels','Urinary bladder'].includes(p.path[0])||p.organ_id==='rectum')return 'pelvis';
 return p.system==='integumentary'?'thorax':'abdomen';
}
function noteFor(key){
 const note=lessons[key]||{};
 const inherited=note.copyFrom?male[note.copyFrom]:{};
 return {description:note.description??inherited?.description??'',function:note.function??inherited?.function??'',clinicalNotes:note.clinicalNotes??inherited?.clinicalNotes??''};
}
function record(id,name,latin,system,region,layer,nodeNames,key,parentId){
 const notes=noteFor(key);
 content[id]={id,meshName:id,displayName:name,latinName:latin,system,region,...notes,landmarks:notes.description,clinical_notes:notes.clinicalNotes,relatedIds:[],related_ids:[],layer,sex:'female',aliases:nodeNames,available:true,quizEligible:!!lessons[key],...(parentId?{parentId}:{}),source:'Human Reference Atlas',sourceMeshNames:nodeNames,lessonSources:lessons[key]?.sources||[]};
 return content[id];
}
for(const sys of manifest.systems){
 const filename=`${sys.system}_female.glb`,bytes=await source(filename),doc=await io.readBinary(bytes);
 const system=sys.system==='renal'?'urinary':sys.system;docs.set(system,doc);
 sourceFiles.push({name:filename,sha256:sha(bytes),bytes:bytes.length});
 doc.getRoot().getAsset().copyright='Human Reference Atlas / HuBMAP Consortium / NIH; Visible Human Female, NLM. Anatria3D and Forma adaptations. CC BY 4.0. See /credits/hra-female.html.';
 const material=doc.createMaterial(system).setBaseColorFactor([...new T.Color(palette[system]).toArray(),1]).setMetallicFactor(0).setRoughnessFactor(.7).setDoubleSided(true);
 const byNode=new Map(manifest.organs.filter(p=>p.system===sys.system).map(p=>[p.node,p]));
 for(const node of doc.getRoot().listNodes()){
  if(!node.getMesh())continue;
  const p=byNode.get(node.getName());if(!p)throw Error(`Unmapped female mesh: ${node.getName()}`);
  const id='female_'+p.organ_id,group=groupFor(p),parentId=group?'female_'+group:undefined;
  const matrix=transform.clone().multiply(new T.Matrix4().fromArray(node.getWorldMatrix()));
  const normalMatrix=new T.Matrix3().getNormalMatrix(matrix),v=new T.Vector3(),box=new T.Box3(),pieces=[];let triangles=0,degenerateTriangles=0;
  for(const primitive of node.getMesh().listPrimitives()){
   const positions=Float32Array.from(primitive.getAttribute('POSITION').getArray()),normals=Float32Array.from(primitive.getAttribute('NORMAL').getArray());
   for(let i=0;i<positions.length;i+=3){v.fromArray(positions,i).applyMatrix4(matrix);box.expandByPoint(v);v.toArray(positions,i);v.fromArray(normals,i).applyMatrix3(normalMatrix).normalize().toArray(normals,i)}
   primitive.getAttribute('POSITION').setArray(positions);primitive.getAttribute('NORMAL').setArray(normals);primitive.setMaterial(material);triangles+=(primitive.getIndices()?.getCount()||positions.length/3)/3;
   const indices=primitive.getIndices()?.getArray()||Uint32Array.from({length:positions.length/3},(_,i)=>i);
   const same=(a,b)=>[0,1,2].every(j=>positions[a*3+j]===positions[b*3+j]);
   for(let i=0;i<indices.length;i+=3)if(same(indices[i],indices[i+1])||same(indices[i],indices[i+2])||same(indices[i+1],indices[i+2]))degenerateTriangles++;
   pieces.push({positions,indices});
  }
  node.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);
  node.setExtras({...node.getExtras(),partId:parentId||id,...(parentId?{detailId:id}:{}),sourceMeshName:p.node,source:'Human Reference Atlas',atlasSex:'female',sourceUrl:manifest.source.url});
  const surface=system==='integumentary'&&/body_of_breast|areola_|nipple_|areolar_tubercles/.test(p.organ_id);
  const layer=system==='skeletal'?5:surface?0:4;
  const entry=record(id,p.name_en,p.ta2_latin,system,regionOf(p),layer,[p.node],p.organ_id,parentId);
  boxes.set(id,box);piecesById.set(id,pieces);entry.sourceTriangles=triangles;entry.sourceDegenerateTriangles=degenerateTriangles;
  if(parentId){const members=groups.get(parentId)||[];members.push(id);groups.set(parentId,members)}
 }
}
for(const [id,members] of groups){
 const key=id.replace(/^female_/,''),first=content[members[0]],note=lessons[key];
 if(!note?.displayName||!note.latinName)throw Error(`Missing study group lesson ${key}`);
 record(id,note.displayName,note.latinName,first.system,first.region,Math.min(...members.map(id=>content[id].layer)),members.flatMap(id=>content[id].sourceMeshNames),key);
 const box=new T.Box3();members.forEach(id=>box.union(boxes.get(id)));boxes.set(id,box);piecesById.set(id,members.flatMap(id=>piecesById.get(id)));
}
for(const p of Object.values(content)){
 const b=boxes.get(p.id);p.bounds={min:b.min.toArray(),max:b.max.toArray()};p.position=b.getCenter(new T.Vector3()).toArray();p.size=b.getSize(new T.Vector3()).length();
 const lesson=lessons[p.id.replace(/^female_/,'')]||{};
 p.relatedIds=(lesson.related||[]).map(id=>'female_'+id).filter(id=>content[id]);
 if(!p.relatedIds.length)p.relatedIds=Object.values(content).filter(q=>q.id!==p.id&&q.system===p.system&&q.region===p.region&&q.quizEligible).slice(0,4).map(q=>q.id);
 if(p.parentId)p.relatedIds=[...new Set([p.parentId,...p.relatedIds])].slice(0,5);p.related_ids=p.relatedIds;
 const pieces=piecesById.get(p.id),samples=[.45,1,2.4].flatMap(aspect=>[1,1.4].map(scale=>projectedCoverage(pieces,p.bounds,aspect,scale)));
 p.clickGeometry={meshes:pieces.length,dominantFraction:Math.min(...samples.map(s=>s.dominantFraction)),coverage:Math.max(0,Math.min(...samples.map(s=>s.coverage))-.005),clusters:Math.max(...samples.map(s=>s.clusters))};
}
const files=[];
for(const [system,doc] of docs){await doc.transform(compress({quantizePosition:16,quantizeNormal:12}));const path=`${out}/female-${system}.glb`;await io.write(path,doc);const bytes=await fs.readFile(path);files.push({system,path:path.replace(/^public/,''),sha256:sha(bytes),bytes:bytes.length})}
const bounds=new T.Box3();for(const b of boxes.values())bounds.union(b);const sphere=bounds.getBoundingSphere(new T.Sphere());
await fs.writeFile('src/data/female-anatomy.json',JSON.stringify(content,null,2)+'\n');
await fs.writeFile('src/data/female-model-info.json',JSON.stringify({provider:'Human Reference Atlas',source:manifest.source,upstream:'https://github.com/Nurkan1/Anatria-3D',commit,sourceFiles,manifestSha256:sha(manifestBytes),models:['female'],structureCount:Object.keys(content).length,sourceMeshCount:manifest.organs.length,coreStructureCount:Object.values(content).filter(p=>p.quizEligible).length,files,credits:'/credits/hra-female.html',license:'CC BY 4.0',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},center:sphere.center.toArray(),radius:sphere.radius,scale,translation:[0,-.3355*scale,.0465*scale],coverageNotes:['Partial female atlas: spine, pelvic bones, abdominal organs, urinary and reproductive anatomy, vessels and breast structures.','No full-body skin, head, limbs, skeletal muscles, heart, lungs or nervous system. Breast surface is the only outer covering.','HRA and the male Z-Anatomy model represent different donors. They are never merged or relabelled.'],modifications:'Uniform scaling/centring, clinical display materials, stable separate female identifiers and study groups, Draco compression. Original source geometry and relative anatomical positions preserved.'},null,2)+'\n');
await fs.mkdir('public/credits',{recursive:true});
await fs.copyFile('src/data/female-model-info.json','public/credits/hra-female-provenance.json');
for(const name of ['NOTICE','LICENSE'])await fs.writeFile(`public/credits/hra-upstream-${name.toLowerCase()}.txt`,await source(name));
console.log(`Imported ${manifest.organs.length} female meshes and ${groups.size} study groups across ${files.length} systems.`);
