import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {NodeIO} from '@gltf-transform/core';
import {KHRDracoMeshCompression} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
await build({entryPoints:['src/data/landmarks.ts'],outfile:'work/current-landmarks.cjs',bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const {landmarks}=createRequire(import.meta.url)('../work/current-landmarks.cjs');
const bounds=JSON.parse(await fs.readFile('work/z-anatomy/source-bounds.json','utf8'));
const io=new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const sourceMeshes=new Map();for(const system of ['skeletal','muscular','cardiovascular','respiratory']){const doc=await io.read(`public/models/z-anatomy/male-${system}.glb`);for(const n of doc.getRoot().listNodes())if(n.getMesh())sourceMeshes.set(n.getExtras().sourceMeshName,n.getMesh());}
function snap(name,push,offset=[0,0,.014]){const m=sourceMeshes.get(name);if(!m)throw Error('Missing landmark reference '+name);let best=Infinity,out=null;for(const prim of m.listPrimitives()){const a=prim.getAttribute('POSITION').getArray();for(let i=0;i<a.length;i+=3){const d=(a[i]-push[0])**2+(a[i+1]-push[1])**2+(a[i+2]-push[2])**2;if(d<best){best=d;out=[a[i]+offset[0],a[i+1]+offset[1],a[i+2]+offset[2]]}}}return out.map(v=>+v.toFixed(5));}
const fixed={
'im-deltoid':snap('Acromial_part_of_deltoid_muscler',[-.7,1.7,0],[-.016,0,0]),
'im-vastus':snap('Vastus_lateralis_muscler',[-.45,-.62,.14]),
'im-ventro':snap('Gluteus_medius_musclel',[.47,.29,-.04],[.016,0,0]),
'pulse-carotid':snap('Right_common_carotid_artery',[-.10,2.06,.075]),
'pulse-brachial':snap('Brachial_arteryr',[-.7,.86,-.03]),
'pulse-radial':snap('Radial_arteryr',[-.86,.20,.07]),
'pulse-femoral':snap('Femoral_arteryr',[-.23,.18,.17]),
'pulse-popliteal':snap('Popliteal_arteryr',[-.28,-1.27,-.22],[0,0,-.016]),
'pulse-tibial':snap('Posterior_tibial_arteryr',[-.18,-2.43,-.15],[.015,0,0]),
'pulse-pedis':snap('Dorsalis_pedis_arteryr',[-.25,-2.43,.12],[0,.015,0]),
'iv-cephalic':snap('Cephalic_veinr',[-.85,.4,.065]),
'iv-basilic':snap('Basilic_veinl',[.73,.47,.01]),
'iv-hand':snap('Dorsal_venous_network_of_handr',[-.85,-.04,.10]),
};
function space(upper,lower,side,x){const a=snap(`Costal_cartilage_of_${upper}_rib${side}`,[x,1.4,.5],[0,0,0]);const b=snap(`Costal_cartilage_of_${lower}_rib${side}`,[x,1.4,.5],[0,0,0]);return [x,(a[1]+b[1])/2,Math.max(a[2],b[2])+.024].map(v=>+v.toFixed(5));}
fixed['heart-aortic']=space('second','third','r',-.105);
fixed['heart-pulmonic']=space('second','third','l',.105);
fixed['heart-erb']=space('third','fourth','l',.105);
fixed['heart-tricuspid']=space('fourth','fifth','l',.105);
fixed['heart-mitral']=space('fifth','sixth','l',.27);
fixed['lung-apex-r']=snap('Superior_lobe_of_right_lung',[-.20,1.81,.13]);
fixed['lung-apex-l']=snap('Superior_lobe_of_left_lung',[.20,1.81,.13]);
fixed['lung-front-r']=snap('Middle_lobe_of_right_lung',[-.31,1.43,.29]);
fixed['lung-front-l']=snap('Superior_lobe_of_left_lung',[.34,1.44,.24]);
fixed['lung-back-r']=snap('Inferior_lobe_of_right_lung',[-.30,1.15,-.28],[0,0,-.016]);
fixed['lung-back-l']=snap('Inferior_lobe_of_left_lung',[.30,1.15,-.28],[0,0,-.016]);
for(const m of landmarks){if(!fixed[m.id])throw Error('Unmapped marker '+m.id);m.position=fixed[m.id];}
const type="export type Landmark={id:string;name:string;position:[number,number,number];category:string;note:string;view?:string};\n";
await fs.writeFile('src/data/landmarks.ts',type+'// Study markers aligned to the imported Z-Anatomy surfaces. Intercostal points remain approximate.\nexport const landmarks:Landmark[]='+JSON.stringify(landmarks,null,2)+';\n');
console.log('Aligned',landmarks.length,'nursing study markers to source anatomy.');
