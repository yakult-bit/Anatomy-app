import {useEffect} from 'react';
import {useUiStore,useStore} from './store';
import {routeMeta} from '../shared/site';

export default function RouteSync(){
 const mode=useUiStore().mode;
 useEffect(()=>{
  const route=mode==='quiz'?'/quiz':'/learn';
  if(location.pathname!==route)history.pushState(null,'',route+location.search);
  const m=routeMeta[route];document.title=m.title;
  for(const [selector,value] of [['meta[name="description"]',m.description],['meta[property="og:title"]',m.title],['meta[property="og:description"]',m.description],['meta[name="twitter:title"]',m.title],['meta[name="twitter:description"]',m.description]])document.querySelector(selector)?.setAttribute('content',value);
  const canonical=document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const origin=canonical?new URL(canonical.href).origin:location.origin;
  canonical?.setAttribute('href',origin+route);document.querySelector('meta[property="og:url"]')?.setAttribute('content',origin+route);
 },[mode]);
 useEffect(()=>{const back=()=>{if(['/learn','/quiz'].includes(location.pathname))useStore.getState().set({mode:location.pathname==='/quiz'?'quiz':'learn'})};window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)},[]);
 return null;
}
