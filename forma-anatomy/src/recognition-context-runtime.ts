import * as THREE from 'three';

export const CONTEXT_SURFACE_OPACITY=.12;
export const CONTEXT_BONE_OPACITY=.18;
export const noContextPick=()=>{};

// Two real, world-aligned anatomical batches, each with a depth-only prepass.
// The prepass prevents stacked transparent triangles from accumulating into
// opaque patches. Only the colour pass blends; it never writes depth.
export function createContextLayer(geometry:THREE.BufferGeometry,opacity:number,center:THREE.Vector3,radius:number,local:boolean){
 const scene=new THREE.Scene();
 const uniforms={contextCenter:{value:center},contextRadius:{value:radius},contextLocal:{value:local?1:0}};
 const material=new THREE.MeshBasicMaterial({color:'#c3c3c3',transparent:true,opacity,depthWrite:false,depthTest:true,side:THREE.DoubleSide,toneMapped:false,forceSinglePass:true});
 const depth=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:THREE.DoubleSide});
 for(const m of [depth,material]){
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 vContextPosition; varying vec3 vContextNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvContextPosition=(modelMatrix*vec4(position,1.0)).xyz; vContextNormal=normalize(normalMatrix*normal);');
   shader.fragmentShader='varying vec3 vContextPosition; varying vec3 vContextNormal; uniform vec3 contextCenter; uniform float contextRadius; uniform float contextLocal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float fade=contextLocal>.5?1.0-smoothstep(.72,1.0,distance(vContextPosition,contextCenter)/contextRadius):1.0;
    if(fade<.001)discard;
    diffuseColor.a*=fade;
    diffuseColor.rgb*=.58+.42*abs(dot(normalize(vContextNormal),normalize(vec3(.3,.6,1.0))));`);
  };
  m.customProgramCacheKey=()=> 'recognition-context-v1';
 }
 for(const m of [depth,material]){const mesh=new THREE.Mesh(geometry,m);mesh.raycast=noContextPick;mesh.userData.recognitionContext=true;scene.add(mesh)}
 return {scene,material,depth,dispose(){material.dispose();depth.dispose()}};
}

// Explicit compositing is essential: renderOrder alone cannot put transparent
// ghosts behind opaque targets because Three renders transparency afterwards.
// Clear depth between layers, then draw the target with its own self-occlusion.
export function renderRecognitionContext(gl:THREE.WebGLRenderer,camera:THREE.Camera,surface:THREE.Scene,skeleton:THREE.Scene,target:THREE.Scene){
 const autoClear=gl.autoClear;
 try{gl.autoClear=false;gl.clear();gl.render(surface,camera);gl.clearDepth();gl.render(skeleton,camera);gl.clearDepth();gl.render(target,camera)}finally{gl.autoClear=autoClear}
}
