import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as THREE from 'three';
import {projectedCoverage} from './projected-coverage.mjs';
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const data=JSON.parse(await fs.readFile('src/data/anatomy.json','utf8')),meta=JSON.parse(await fs.readFile('src/data/model-info.json','utf8')),groups=new Map();
for(const file of meta.files){const doc=await io.read('public'+file.path);for(const n of doc.getRoot().listNodes()){if(!n.getMesh())continue;const {partId,detailId}=n.getExtras(),box=new THREE.Box3(),pieces=[];let triangles=0;for(const p of n.getMesh().listPrimitives()){const a=p.getAttribute('POSITION');box.union(new THREE.Box3(new THREE.Vector3(...a.getMin([])),new THREE.Vector3(...a.getMax([]))));triangles+=p.getIndices().getCount()/3;const positions=Float32Array.from(a.getArray()),matrix=new THREE.Matrix4().fromArray(n.getWorldMatrix()),v=new THREE.Vector3();for(let i=0;i<positions.length;i+=3){v.fromArray(positions,i).applyMatrix4(matrix);v.toArray(positions,i)}pieces.push({positions,indices:p.getIndices().getArray()})}box.applyMatrix4(new THREE.Matrix4().fromArray(n.getWorldMatrix()));for(const id of new Set([partId,detailId].filter(Boolean))){const meshes=groups.get(id)||[];meshes.push({triangles,box,pieces});groups.set(id,meshes)}}}
let count=0;
for(const [id,meshes] of groups){if(!data[id])continue;const pieces=meshes.flatMap(m=>m.pieces),views=[.45,1,2.4].flatMap(aspect=>[1,1.4].map(scale=>projectedCoverage(pieces,data[id].bounds,aspect,scale)));
 const dominant=Math.min(...views.map(v=>v.dominantFraction));data[id].clickGeometry={meshes:meshes.length,clusters:Math.max(...views.map(v=>v.clusters)),dominantFraction:dominant,coverage:Math.max(0,Math.min(...views.map(v=>v.coverage))-.005)};if(++count%500===0)console.log('Measured',count,'structure silhouettes');}

await fs.writeFile('src/data/anatomy.json',JSON.stringify(data,null,2)+'\n');console.log('Derived real-triangle silhouette clickability metadata for',groups.size,'structures. Coverage is conservatively sampled at six framing combinations.');
