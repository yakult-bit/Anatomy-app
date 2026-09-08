// Build-only conversion of individually reviewed official NIH 3D downloads.
// No male input; no nonuniform scaling, deformation, hole filling or shape repair.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import {draco as compress,mergeDocuments} from '@gltf-transform/functions';
import draco from 'draco3dgltf';
import * as T from 'three';
import {projectedCoverage} from './projected-coverage.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=async(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const sources=await read('src/data/nih-hra-sources.json'),lessons=await read('src/data/nih-hra-lessons.json');
const historical=await read('docs/female-audit/v12-inventory.json');
const old=JSON.parse(await fs.readFile('docs/female-audit/v12-content.json','utf8'));
const byName=new Map(Object.values(old).filter(p=>p.sourceMeshNames.length===1).map(p=>[p.sourceMeshNames[0],p]));
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.encoder':await draco.createEncoderModule(),'draco3d.decoder':await draco.createDecoderModule()});
const sha=b=>createHash('sha256').update(b).digest('hex');
const docs=new Map(),content={},boxes=new Map(),piecesById=new Map(),groups=new Map();
const palette={reproductive:'#c59aa1',urinary:'#ad8d75',skeletal:'#d7cdb5'};
// Files explicitly declare source_spatial_entity #VHFemaleOrgans and share the
// same original metre coordinate frame. Apply ONE uniform scene transform.
const scale=10,translation=[.086,-.59,.911],transform=new T.Matrix4().makeScale(scale,scale,scale).setPosition(...translation);
await fs.mkdir('public/models/nih-hra',{recursive:true});
const adapted=[];
function record(id,name,latin,system,names,key,parentId){
 const l=lessons[key]||{},source=sources.find(s=>s.id===l.modelId)||sources.find(s=>s.id===names.sourceId);
 if(!source)throw Error('Missing per-model licence: '+id);
 const description=l.description||'',fn=l.function||'',clinical=l.clinical_notes||'';
 const p={id,meshName:id,displayName:l.displayName||name,latinName:l.latinName||latin||'',system,region:'pelvis',description,function:fn,clinicalNotes:clinical,clinical_notes:clinical,landmarks:l.landmarks||description,relatedIds:l.related_ids||[],related_ids:l.related_ids||[],layer:system==='skeletal'?5:4,sex:'female',aliases:[name,...names.values],sourceMeshNames:names.values,available:true,quizEligible:l.major===true&&!!description&&!!fn&&!!clinical,...(parentId?{parentId}:{}),source:source.collection,sourceUrl:source.sourceUrl,sourceModelId:source.id,license:source.license,licenseUrl:source.licenseUrl,attribution:source.attribution,textSource:description||fn||clinical?'OpenStax Anatomy and Physiology 2e':'',textLicense:description||fn||clinical?'CC-BY-NC-SA-4.0':'',lessonSources:l.sources||[],contentStatus:description&&fn&&clinical?'complete':'missing_fields',...(l.annotationIssue?{annotationIssue:l.annotationIssue,quizExcluded:true}:{})};
 content[id]=p;return p;
}
for(const source of sources){
 if(source.license!=='CC-BY-4.0'||source.licenseUrl!=='https://creativecommons.org/licenses/by/4.0/')throw Error('Unapproved licence');
 const bytes=await fs.readFile('work/nih-hra/'+source.file.name);if(sha(bytes)!==source.file.sha256)throw Error('Source checksum mismatch');
 const input=await io.readBinary(bytes),doc=new Document(),buffer=doc.createBuffer(),scene=doc.createScene(source.title);
 const system=source.title.startsWith('Pelvis')?'skeletal':source.title.startsWith('Urinary')?'urinary':'reproductive';
 const group=source.id==='3DPX-020996'?'female_uterus':source.id==='3DPX-020995'?'female_bladder':source.id==='3DPX-020964'?'female_uterine_tube_left':source.id==='3DPX-020965'?'female_uterine_tube_right':null;
 doc.getRoot().getAsset().copyright=`${source.attribution} CC BY 4.0. NIH 3D ${source.id}. Forma: uniform scene transform, display material, Draco compression. /credits/hra-female.html`;
 const mat=doc.createMaterial(system).setBaseColorFactor([...new T.Color(palette[system]).toArray(),1]).setDoubleSided(true).setRoughnessFactor(.72);
 for(const original of input.getRoot().listNodes()){
  if(!original.getMesh())continue;
  const name=original.getName(),extra=original.getExtras();
  if(extra.source_spatial_entity!=='#VHFemaleOrgans')throw Error('Unverified source coordinate frame '+name);
  const prev=byName.get(name),id=prev?.id||'female_'+name.replace(/^VH_F_/,'').toLowerCase();
  const box=new T.Box3(),pieces=[],mesh=doc.createMesh(name),matrix=transform.clone().multiply(new T.Matrix4().fromArray(original.getWorldMatrix())),normalMatrix=new T.Matrix3().getNormalMatrix(matrix),v=new T.Vector3();
  let triangles=0,degenerateTriangles=0;
  for(const p of original.getMesh().listPrimitives()){
   const positions=Float32Array.from(p.getAttribute('POSITION').getArray());
   const indices=Uint32Array.from(p.getIndices()?.getArray()||Array.from({length:positions.length/3},(_,i)=>i));
   const geometry=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(positions,3)).setIndex(new T.BufferAttribute(indices,1));
   if(!p.getAttribute('NORMAL'))geometry.computeVertexNormals();
   const normals=Float32Array.from(p.getAttribute('NORMAL')?.getArray()||geometry.getAttribute('normal').array);
   for(let i=0;i<positions.length;i+=3){v.fromArray(positions,i).applyMatrix4(matrix);box.expandByPoint(v);v.toArray(positions,i);v.fromArray(normals,i).applyMatrix3(normalMatrix).normalize().toArray(normals,i)}
   const same=(a,b)=>[0,1,2].every(j=>positions[a*3+j]===positions[b*3+j]);for(let i=0;i<indices.length;i+=3)if(same(indices[i],indices[i+1])||same(indices[i],indices[i+2])||same(indices[i+1],indices[i+2]))degenerateTriangles++;
   mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer)).setMaterial(mat));
   triangles+=indices.length/3;pieces.push({positions,indices});
  }
  scene.addChild(doc.createNode(name).setMesh(mesh).setExtras({partId:group||id,...(group?{detailId:id}:{}),sourceMeshName:name,source:source.collection,sourceModelId:source.id,sourceUrl:source.sourceUrl,license:source.license,atlasSex:'female',sourceSpatialEntity:extra.source_spatial_entity}));
  const p=record(id,prev?.displayName||(extra.label!=='-'?extra.label:name.replace(/^VH_F_/,'').replaceAll('_',' ')),prev?.latinName,system,{values:[name],sourceId:source.id},name,group);p.sourceTriangles=triangles;p.sourceDegenerateTriangles=degenerateTriangles;boxes.set(id,box);piecesById.set(id,pieces);
  if(group){const ids=groups.get(group)||[];ids.push(id);groups.set(group,ids)}
 }
 const combined=docs.get(system)||new Document();mergeDocuments(combined,doc);docs.set(system,combined);
 await doc.transform(compress({quantizePosition:16,quantizeNormal:12}));const path=`/models/nih-hra/${source.id}.glb`;await io.write('public'+path,doc);const b=await fs.readFile('public'+path);adapted.push({...source,adapted:{path,bytes:b.length,sha256:sha(b)},modifications:'Original female coordinates retained; one uniform 10× scene-unit conversion and translation shared by all files; transforms baked; display material; Draco compression. No deformation, hole filling or male geometry.'});
}
for(const [id,ids] of groups){const first=content[ids[0]],sourceId=first.sourceModelId;record(id,lessons[id].displayName,lessons[id].latinName,first.system,{values:ids.flatMap(id=>content[id].sourceMeshNames),sourceId},id);const b=new T.Box3();ids.forEach(id=>b.union(boxes.get(id)));boxes.set(id,b);piecesById.set(id,ids.flatMap(id=>piecesById.get(id)));}
for(const p of Object.values(content)){
 const b=boxes.get(p.id);p.bounds={min:b.min.toArray(),max:b.max.toArray()};p.position=b.getCenter(new T.Vector3()).toArray();p.size=b.getSize(new T.Vector3()).length();
 p.relatedIds=p.relatedIds.filter(id=>content[id]);p.related_ids=p.relatedIds;
 const samples=[.45,1,2.4].flatMap(aspect=>[1,1.4].map(s=>projectedCoverage(piecesById.get(p.id),p.bounds,aspect,s)));
 p.clickGeometry={meshes:piecesById.get(p.id).length,dominantFraction:Math.min(...samples.map(s=>s.dominantFraction)),coverage:Math.max(0,Math.min(...samples.map(s=>s.coverage))-.005),clusters:Math.max(...samples.map(s=>s.clusters))};
}
const out='public/models/hra-female';await fs.mkdir(out,{recursive:true});for(const f of await fs.readdir(out))if(f.startsWith('female-')&&f.endsWith('.glb'))await fs.unlink(out+'/'+f);
const files=[];
for(const [system,doc] of docs){const buffer=doc.createBuffer();for(const a of doc.getRoot().listAccessors())a.setBuffer(buffer);for(const b of doc.getRoot().listBuffers())if(b!==buffer)b.dispose();const joined=doc.createScene(system);for(const scene of doc.getRoot().listScenes())if(scene!==joined){for(const n of scene.listChildren())joined.addChild(n);scene.dispose()}doc.getRoot().setDefaultScene(joined);doc.getRoot().getAsset().copyright='NIH 3D Human Reference Atlas / Visible Human Female. Individual creators and CC BY 4.0 terms: /credits/hra-female.html. Separate from Z-Anatomy.';await doc.transform(compress({quantizePosition:16,quantizeNormal:12}));const path=`/models/hra-female/female-${system}.glb`;await io.write('public'+path,doc);const b=await fs.readFile('public'+path);files.push({system,path,sha256:sha(b),bytes:b.length})}
const bounds=new T.Box3();for(const b of boxes.values())bounds.union(b);const sphere=bounds.getBoundingSphere(new T.Sphere());
const info={provider:'NIH 3D Human Reference Atlas',source:{name:'Visible Human Female',url:'https://3d.nih.gov/collections/hra'},sourceFiles:adapted.map(s=>({name:s.file.name,sha256:s.file.sha256,bytes:s.file.bytes,sourceModelId:s.id})),models:['female'],structureCount:Object.keys(content).length,sourceMeshCount:Object.keys(content).length-groups.size,coreStructureCount:Object.values(content).filter(p=>p.quizEligible).length,files,credits:'/credits/hra-female.html',license:'Per-model: CC BY 4.0 (all seven verified)',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},center:sphere.center.toArray(),radius:sphere.radius,scale,translation,availableStructures:['Uterus and cervix','Left and right ovaries','Left and right uterine tubes','Urinary bladder','Sacrum, coccyx and pelvic bones'],unavailableStructures:['Vagina','Complete urethra','External genitalia','Pelvic floor muscles','Whole-body skin, muscles, head and limbs'],coverageNotes:['Female reproductive reference organs with urinary bladder and pelvic bone context.','NIH 3D Human Reference Atlas, Visible Human Female: a separate reference set, not the same body as the Z-Anatomy male atlas.','Absent meshes reflect dataset coverage, not anatomical absence. Bladder-neck tissue is not a complete urethra.'],modifications:adapted[0].modifications};
await write('src/data/female-anatomy.json',content);await write('src/data/female-model-info.json',info);await write('public/credits/hra-female-provenance.json',info);await write('public/credits/nih-hra-models.json',adapted);
console.log(JSON.stringify({sources:adapted.map(s=>({id:s.id,before:s.file.bytes,after:s.adapted.bytes})),structures:info.structureCount,meshes:info.sourceMeshCount,files},null,2));
