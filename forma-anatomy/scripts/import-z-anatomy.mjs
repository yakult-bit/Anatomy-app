/** Import licensed, existing Z-Anatomy geometry. Never generate replacement anatomy. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {Document,NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import {draco,weld,prune,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
const sourceDir=process.argv[2]||'work/z-anatomy';
const outputDir='public/models/z-anatomy';
const raw=JSON.parse(await fs.readFile('src/data/anatomy.json','utf8'));
const anatomy=Object.fromEntries(Object.entries(raw).filter(([id])=>!id.startsWith('z_')));
const sourceFiles=JSON.parse(await fs.readFile(path.join(sourceDir,'fbx-list.json'),'utf8'));
const sourceCommit=JSON.parse(await fs.readFile(path.join(sourceDir,'commit.json'),'utf8')).sha;
const SOURCE='https://github.com/LluisV/Z-Anatomy';
const SCALE=5.48/171.35384583400383;
const transform=new T.Matrix4().makeScale(SCALE,SCALE,SCALE);transform.setPosition(0,-2.65,0);
const systems=['skeletal','muscular','cardiovascular','respiratory','digestive','nervous','urinary','reproductive','endocrine','lymphatic','integumentary'];
const palette={skeletal:'#d7cdb5',muscular:'#a75045',cardiovascular:'#b64443',respiratory:'#bd8792',digestive:'#b98e72',nervous:'#d6b675',urinary:'#a3656c',reproductive:'#c59aa1',endocrine:'#d2a96d',lymphatic:'#93ae71',integumentary:'#c69e87'};
const docs=Object.fromEntries(systems.map(s=>{const doc=new Document();doc.createBuffer();doc.createScene(s);doc.getRoot().getAsset().copyright='Z-Anatomy / BodyParts3D and credited contributors. CC BY-SA 4.0; upstream component licenses apply. See /credits/z-anatomy.html.';return [s,doc]}));
const bounds={},sourceBounds={},sources={},mapped={},materials={};
const importedNodes=[];
const counters={included:0,excluded:0,trianglesBefore:0,trianglesAfter:0};
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
await MeshoptSimplifier.ready;
globalThis.window={URL:globalThis.URL,innerWidth:1000,innerHeight:1000};
// FBX files use flat materials; do not fetch any untrusted external texture references.
T.TextureLoader.prototype.load=function(){return new T.Texture()};
const baseSide=(n)=>n.endsWith('l')?'left':n.endsWith('r')?'right':null;
function classify(n,file,mats,b){
 if(!b||b.isEmpty()||/j\d*$/.test(n)||/^Cross_Section|\?|path$/i.test(n)||mats.every(m=>m.name==='__DEFAULT'))return null;
 let system='skeletal',id=null,layer=4;
 const low=n.toLowerCase(),side=baseSide(n),append=x=>side?`${x}_${side}`:null;
 if(file==='SkeletalSystem100.fbx'){
  if(mats.some(m=>/^(Origin|End)/.test(m.name)))return null;
  if(!mats.some(m=>/Bone|Teeth|Cartilage|Suture/.test(m.name)))return null;
  layer=5;
  const basic={tibia:'tibia',fibula:'fibula',femur:'femur',patella:'patella',humerus:'humerus',radius:'radius',ulna:'ulna',clavicle:'clavicle',scapula:'scapula'};
  for(const [prefix,key] of Object.entries(basic))if(low===prefix+'l'||low===prefix+'r')id=append(key);
  if(/rib[lr]$|^costal_cartilage/.test(low))id='ribs';
  if(/sternum|^xiphoid_process$/.test(low))id='sternum';
  if(/^vertebra_|^atlas_\(c1\)|^axis_\(c2\)/.test(low))id='spine';
  if(/^hip_bone|^sacrum$|^coccyx$/.test(low))id='pelvis';
  if(/^(proximal|middle|distal)_phalanx_of_.*_hand[lr]$|metacarpal_bone[lr]$|^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)_bone[lr]$/.test(low))id=append('hand');
  if(/^(proximal|middle|distal)_phalanx_of_.*_foot[lr]$|metatarsal_bone[lr]$|^(calcaneus|talus)[lr]$|^(cuboid|navicular|.*cuneiform)_bone[lr]$|^sesamoid_bones_of_foot[lr]$/.test(low))id=append('foot');
  if(n==='Mandible'||/^Lower_(.*incisor|.*canine|.*premolar|.*molar_tooth)/.test(n))id='mandible';
  else if(!id&&b.min.y>148&&!/Hyoid|Arytenoid|Thyroid_cartilage|Cricoid|Corniculate/.test(n))id='skull';
  if(/arytenoid|thyroid_cartilage|cricoid|corniculate/.test(low)){system='respiratory';layer=4;}
 }else if(file==='MuscularSystem100.fbx'){

  system='muscular';layer=/deltoid|biceps_brachii|triceps_brachii|pectoralis_major|gastrocnemius|vastus_|rectus_femoris|sartorius|trapezius|latissimus|sternocleidomastoid|rectus_abdominis|external_abdominal|gluteus_maximus|tibialis_anterior|brachioradialis|masseter|temporalis|orbicularis/.test(low)?2:3;
  if(/part_of_deltoid_muscle/.test(low))id=append('deltoid');
  if(/head_of_biceps_brachii/.test(low))id=append('biceps');
  if(/head_of_triceps_brachii/.test(low))id=append('triceps');
  if(/pectoralis_major_muscle/.test(low))id=append('pectoralis');
  if(/^vastus_lateralis_muscle/.test(low))id=append('vastus');
  if(/^gluteus_medius_muscle/.test(low))id=append('gluteus');
  if(/head_of_gastrocnemius/.test(low))id=append('gastrocnemius');
  if(n==='Diaphragm')id='diaphragm';
 }else if(file==='Joints100.fbx'){
  system='skeletal';layer=5;
 }else if(file==='CardioVascular41.fbx'){
  system='cardiovascular';
  if(['Aortic_arch','Ascending_aorta','Thoracic_aorta','Abdominal_aorta'].includes(n))id='aorta';
  else if(/ventricle|atrium|leaflet|papillary|coronary|cardiac_vein|interventricular_artery|circumflex_artery_of_heart/.test(low))id='heart';
  else if(/vein|vena_cava|venous|sinus|hemi-azygos/.test(low))id='veins';
  else if(!/pulmonary|lung/.test(low))id='arteries';
 }else if(file==='LymphoidOrgans100.fbx'){
  system='lymphatic';if(n==='Spleen')id='spleen';else if(/node/.test(low))id='lymph_nodes';
 }else if(file==='NervousSystem100.fbx'){
  system='nervous';
  if(/^Sciatic_nerve/.test(n))id=append('sciatic');
  else if(/spinal_cord|horn_of_spinal|^Spinal_reticular/.test(n)||(/tract/i.test(n)&&b.min.y<145))id='spinal_cord';
  else if(b.min.y>148&&mats.some(m=>/Brain|lobe|Cerebellum|matter|Nucleus|sulci|Limbic|Cerebral|Hypothalamus/.test(m.name)))id='brain';
 }else if(file==='VisceralSystem100.fbx'){

  const exact={Liver:['liver','digestive'],Gallbladder:['gallbladder','digestive'],Pancreas:['pancreas','endocrine'],Stomach:['stomach','digestive'],Oesophagus:['esophagus','digestive'],Jejunum:['small_intestine','digestive'],Duodenum:['small_intestine','digestive'],Urinary_bladder:['bladder','urinary'],Thyroid_gland:['thyroid','endocrine'],Prostate:['prostate','reproductive'],Trachea:['trachea','respiratory']};
  system='digestive';if(exact[n])[id,system]=exact[n];
  else if(/_colon$/.test(n)){id='colon';system='digestive';}
  else if(/^Kidney/.test(n)){id=append('kidney');system='urinary';}
  else if(/^Ureter[rl]$/.test(n)){id=append('ureter');system='urinary';}
  else if(/^Suprarenal_gland/.test(n)){id=append('adrenal');system='endocrine';}
  else if(/^Testis/.test(n)){id='testes';system='reproductive';}
  else if(/lobe_of_left_lung/.test(n)){id='lungs_left';system='respiratory';}
  else if(/lobe_of_right_lung/.test(n)){id='lungs_right';system='respiratory';}
  else if(/bronch|nasal_cavity|pharynx|epiglottis|pleura/.test(low))system='respiratory';
  else if(/renal_pelvis|urethra/.test(low))system='urinary';
  else if(/penis|deferens|epididymis|ejaculatory|seminal/.test(low))system='reproductive';
  else if(/parathyroid|pineal|hypophysis/.test(low))system='endocrine';
 }else if(file==='Regions of human body100.fbx'){
  if(!mats.some(m=>/Skin|Nail|Black/.test(m.name)))return null;
  system='integumentary';id='skin';layer=0;
 }
 if(id&&anatomy[id])layer=anatomy[id].layer;
 const covering=/fascia|aponeurosis|pleura|omentum|mesocolon|meso-appendix|dura|falx_|tentorium|meninge|segment_of_liver/.test(low);
 return {id,system,layer,covering};
}
function pretty(n,names){let s=n,side='';if(/[rl]$/.test(n)&&names.has(n.slice(0,-1)+(n.endsWith('l')?'r':'l'))){side=n.endsWith('l')?'Left ':'Right ';s=n.slice(0,-1)}return side+s.replace(/_/g,' ').replace(/\*/g,'').replace(/\s+/g,' ').trim()}
function region(b){const y=b.getCenter(new T.Vector3()).y,x=Math.abs(b.getCenter(new T.Vector3()).x);if(y>148)return 'head-neck';if(y<80)return 'lower-limb';if(y<100&&x<20)return 'pelvis';if(x>20)return 'upper-limb';if(y<120)return 'abdomen';return 'thorax'}
function getMaterial(doc,sys,sourceMat,name){let color=palette[sys];const m=sourceMat.name||'';if(sys==='skeletal'){if(/Cartilage/.test(m))color='#b8c3bd';if(/Suture/.test(m))color='#9b9184';if(/Teeth/.test(m))color='#e6dfcb';}
 if(sys==='muscular'&&/Tendon|Fascia|Ligament|Aponeurosis/.test(m))color='#d2c3ab';
 if(sys==='cardiovascular'){if(/vein|vena|venous|sinus|pulmonary_(trunk|arter)/i.test(name))color='#5b7f9e';}
 if(sys==='digestive'&&/colon|jejunum|duodenum/i.test(name))color='#c09b83';
 if(sys==='digestive'&&/gallbladder|bile/i.test(name))color='#8b9b66';
 if(sys==='nervous'&&/Brain|lobe|Cerebellum|Nucleus|sulci/.test(m))color='#bd9d95';
 if(sys==='integumentary'&&/Black/.test(m))color='#3e302c';
 if(sys==='integumentary'&&/Nail/.test(m))color='#d3b2a1';
 const key=sys+'|'+color;return materials[key]??=(doc.createMaterial(m).setBaseColorFactor([...new T.Color(color).toArray(),1]).setRoughnessFactor(sys==='skeletal'?.65:.73).setMetallicFactor(0).setDoubleSided(true));}
for(const file of sourceFiles){
 if(['References100.fbx'].includes(file.name))continue;
 console.log('Importing',file.name);
 const buf=await fs.readFile(path.join(sourceDir,file.name));const sha=crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');if(sha!==file.sha)throw new Error('Source integrity mismatch: '+file.name);
 const root=new FBXLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'');root.updateMatrixWorld(true);
 const names=new Set();root.traverse(o=>{if(o.isMesh)names.add(o.name)});
 root.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.position?.count)return;const mats=Array.isArray(o.material)?o.material:[o.material];o.geometry.computeBoundingBox();const sourceBox=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);const spec=classify(o.name,file.name,mats,sourceBox);if(!spec){counters.excluded++;return;}
  let {id,system,layer,covering}=spec;const isCore=!!id;
  if(!id){id='z_'+system+'_'+o.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');if(anatomy[id])id+='_'+crypto.createHash('sha1').update(file.name+o.name+String(counters.included)).digest('hex').slice(0,5);const displayName=pretty(o.name,names);anatomy[id]={id,meshName:id,displayName,latinName:'',system,region:region(sourceBox),description:`${displayName} is shown in its original anatomical position in the Z-Anatomy male atlas.`,function:'Detailed function notes are not included for this atlas structure.',clinicalNotes:'Nursing notes and quiz questions are available for the core study structures. Use the Z-Anatomy reference for this additional structure.',relatedIds:[],layer,sex:'male',aliases:[o.name],quizEligible:false};}
  anatomy[id].available=true;anatomy[id].quizEligible=isCore;anatomy[id].source='Z-Anatomy';anatomy[id].covering=covering;
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld).applyMatrix4(transform);g.computeBoundingBox();bounds[id]??=new T.Box3();bounds[id].union(g.boundingBox);sourceBounds[o.name]={min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray(),center:g.boundingBox.getCenter(new T.Vector3()).toArray()};(sources[id]??=[]).push(o.name);mapped[o.name]={id,system,layer};
  const doc=docs[system],buffer=doc.getRoot().listBuffers()[0],scene=doc.getRoot().listScenes()[0];const mesh=doc.createMesh(o.name);const pos=doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.position.array)).setBuffer(buffer);const normal=doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.attributes.normal.array)).setBuffer(buffer);
  const groups=g.groups.length?g.groups:[{start:0,count:g.index?.count||g.attributes.position.count,materialIndex:0}];
  // FBX has many alternating face runs. Consolidate by material before glTF export.
  const byMaterial=new Map();for(const group of groups){if(group.count<3)continue;const mi=group.materialIndex||0;const list=byMaterial.get(mi)||[];for(let i=group.start;i<group.start+group.count;i++)list.push(g.index?g.index.array[i]:i);byMaterial.set(mi,list);}
  for(const [mi,list] of byMaterial){const primitive=doc.createPrimitive().setAttribute('POSITION',pos).setAttribute('NORMAL',normal).setMaterial(getMaterial(doc,system,mats[mi]||mats[0],o.name));const indices=new Uint32Array(list);primitive.setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer));mesh.addPrimitive(primitive);counters.trianglesBefore+=indices.length/3;}
  const node=doc.createNode(o.name).setMesh(mesh).setExtras({partId:id,sourceMeshName:o.name,source:'Z-Anatomy'});scene.addChild(node);importedNodes.push({node,id,name:o.name,box:g.boundingBox.clone(),label:pretty(o.name,names)});counters.included++;g.dispose();
 });
 root.traverse(o=>{if(o.isMesh)o.geometry.dispose()});
}
// Keep core teaching groups while making their individual source pieces selectable.
for(const r of importedNodes){if(!anatomy[r.id].quizEligible||sources[r.id].length<2)continue;
 const id='z_detail_'+r.id+'_'+r.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');const parent=anatomy[r.id];
 if(!anatomy[id]){anatomy[id]={...parent,id,meshName:id,displayName:r.label,latinName:'',parentId:r.id,description:`${r.label} is part of ${parent.displayName.toLowerCase()}, shown in its original position in the Z-Anatomy male atlas.`,function:`Group function — ${parent.function}`,clinicalNotes:`Group note (${parent.displayName}) — ${parent.clinicalNotes}`,relatedIds:[r.id],aliases:[r.name],quizEligible:false};sources[id]=[r.name];bounds[id]=r.box.clone();}
 else bounds[id].union(r.box);
 r.node.setExtras({...r.node.getExtras(),detailId:id});
}
await fs.mkdir(outputDir,{recursive:true});
const files=[];
for(const system of systems){const doc=docs[system];console.log('Compressing',system,doc.getRoot().listMeshes().length,'atlas meshes');await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.7,error:.00025,lockBorder:true}),prune(),draco({method:'edgebreaker',encodeSpeed:5,decodeSpeed:7,quantizePosition:16,quantizeNormal:12}));let triangles=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())triangles+=(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3;counters.trianglesAfter+=triangles;
 const filename=`male-${system}.glb`;await io.write(path.join(outputDir,filename),doc);const bytes=await fs.readFile(path.join(outputDir,filename));files.push({system,path:`/models/z-anatomy/${filename}`,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),triangles});}
for(const [id,p] of Object.entries(anatomy)){if(bounds[id]){p.position=bounds[id].getCenter(new T.Vector3()).toArray();p.size=bounds[id].getSize(new T.Vector3()).length();p.bounds={min:bounds[id].min.toArray(),max:bounds[id].max.toArray()};p.sourceMeshNames=sources[id];}else{p.available=false;p.quizEligible=false;}}
for(const id of ['lungs_left','lungs_right'])anatomy[id].clinicalNotes='Compare breath sounds side to side and assess respiratory effort. The separate lung lobes are visible in this atlas.';
const core=Object.values(anatomy).filter(p=>p.available&&p.quizEligible);const all=Object.values(anatomy).filter(p=>p.available);const report={provider:'Z-Anatomy',source:SOURCE,commit:sourceCommit,sourceUrl:`${SOURCE}/tree/${sourceCommit}/Resources/Models/FBX`,sourceFiles:sourceFiles.filter(f=>!['References100.fbx'].includes(f.name)).map(f=>({name:f.name,gitBlobSha:f.sha,bytes:f.size})),models:['male'],unavailableCore:Object.values(anatomy).filter(p=>!p.available).map(p=>({id:p.id,name:p.displayName})),coreStructureCount:core.length,structureCount:all.length,sourceMeshCountBySystem:Object.fromEntries(systems.map(system=>[system,importedNodes.filter(r=>anatomy[r.id].system===system).length])),coverageNotes:['Male anatomy only; no female model or separate subcutaneous fat layer.','Atlas names can be practiced in identification and recall quizzes; reviewed nursing and function notes cover core groups.','Joints, ligaments, fascia, and covering membranes are included; covering membranes can be toggled.'],...counters,files,license:'CC BY-SA 4.0 with upstream component-specific terms',credits:'/credits/z-anatomy.html',modifications:'Converted FBX to GLB, baked original transforms, uniformly normalized scale, assigned clinical display colors, removed non-anatomical atlas annotation geometry, retained connective tissues and covering membranes, reduced redundant triangles within a small error tolerance, and applied Draco compression.'};
await fs.writeFile('src/data/anatomy.json',JSON.stringify(anatomy,null,2)+'\n');await fs.writeFile('src/data/model-info.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile('work/z-anatomy/source-bounds.json',JSON.stringify(sourceBounds,null,2));await fs.writeFile('work/z-anatomy/mapping.json',JSON.stringify(mapped,null,2));await fs.mkdir('public/credits',{recursive:true});await fs.writeFile('public/credits/z-anatomy-provenance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({core:core.length,atlasStructures:all.length,meshes:counters.included,trianglesBefore:counters.trianglesBefore,trianglesAfter:counters.trianglesAfter,megabytes:files.reduce((a,f)=>a+f.bytes,0)/1024/1024,unavailable:report.unavailableCore},null,2));
