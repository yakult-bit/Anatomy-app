import type {Plugin} from 'vite';
// Drei Html uses cssText for two DOM wrappers. CSP blocks cssText, while
// property assignments preserve the same styles under style-src-attr 'none'.
// Keep this narrow, version-checked transform until upstream uses CSSOM.
export function cspDrei():Plugin{return {name:'forma-csp-drei',enforce:'pre',transform(code,id){
 if(!id.replaceAll('\\','/').endsWith('/@react-three/drei/web/Html.js'))return;
 const a='el.style.cssText = `position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;`;';
 const b='el.style.cssText = `position:absolute;top:0;left:0;transform:translate3d(${vec[0]}px,${vec[1]}px,0);transform-origin:0 0;`;';
 if(!code.includes(a)||!code.includes(b))throw Error('Drei Html changed: review the CSP compatibility transform.');
 return {code:code.replace(a,"Object.assign(el.style,{position:'absolute',top:'0',left:'0',pointerEvents:'none',overflow:'hidden'});").replace(b,"Object.assign(el.style,{position:'absolute',top:'0',left:'0',transform:`translate3d(${vec[0]}px,${vec[1]}px,0)`,transformOrigin:'0 0'});"),map:null};
}}}
