import {sentryPagesPlugin} from '@sentry/cloudflare';
import type {Env} from '../server/config';
import {originConfig,configurationFailure} from '../server/config';
import {securityHeaders} from '../server/headers';
import {scrubEvent} from '../server/logging';
import {randomToken} from '../server/http';
import {isPage,routePath,robots,sitemap,staticPage,rewriteMetadata} from '../shared/site';
export const secure:PagesFunction<Env>=async context=>{
 let origin:string;try{origin=originConfig(context.env as unknown as Record<string,unknown>)}catch{return configurationFailure(context.request,context.env,'origin')}
 const url=new URL(context.request.url),nonce=randomToken(),headers=securityHeaders(nonce,origin);
 if(url.origin!==origin){headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Location',origin+url.pathname+(url.pathname.startsWith('/api/')?'':url.search));headers.set('Cache-Control','no-store');return new Response(null,{status:301,headers})}
 // Source manifests, server code and environment files must never be public.
 if(/(?:^|\/)\.(?!well-known(?:\/|$))/.test(url.pathname)||/^\/(?:server|functions|supabase|node_modules|work)(?:\/|$)/.test(url.pathname))return new Response('Not found',{status:404,headers});
 if(context.request.headers.has('Origin')&&context.request.headers.get('Origin')!==origin)return new Response('Forbidden',{status:403,headers});
 const indexable=context.env.APP_ENV==='production'&&!url.hostname.endsWith('.pages.dev'),route=routePath(url.pathname);
 if(!indexable)headers.set('X-Robots-Tag','noindex, nofollow');
 const alias=route==='/index.html'?'/':route.endsWith('.html')?route.slice(0,-5):route;
 if(isPage(alias)&&url.pathname!==alias){headers.set('Location',origin+alias+url.search);return new Response(null,{status:301,headers})}
 if(route==='/robots.txt'||route==='/sitemap.xml'){
  headers.set('Content-Type',route==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8');headers.set('Cache-Control','public, max-age=300');
  return new Response(context.request.method==='HEAD'?null:route==='/robots.txt'?robots(origin,indexable):sitemap(origin),{headers});
 }
 if(isPage(route)&&!['/learn','/quiz'].includes(route)){
  headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');
  const html=staticPage(route,origin,indexable).replace('<head>',`<head><meta name="csp-nonce" content="${nonce}">`);
  return new Response(context.request.method==='HEAD'?null:html,{headers});
 }
 const notFound=()=>{headers.set('Content-Type','text/html; charset=utf-8');headers.set('X-Robots-Tag','noindex, nofollow');headers.set('Cache-Control','no-store');return new Response(context.request.method==='HEAD'?null:staticPage('/404',origin,false),{status:404,headers})};
 // A SPA rewrite must not turn an unknown human-facing route into a 200.
 if(!isPage(route)&&!route.startsWith('/api/')&&!/\.[^/]+$/.test(route))return notFound();
 const response=await context.next();const out=new Headers(response.headers);
 headers.forEach((v,k)=>{if(k==='referrer-policy'&&out.get(k)==='no-referrer')return;out.set(k,v)});
 out.delete('Access-Control-Allow-Origin');out.delete('Access-Control-Allow-Credentials');
 if(context.request.headers.get('Origin')===origin){out.set('Access-Control-Allow-Origin',origin);out.set('Vary','Origin')}
 if(url.pathname.startsWith('/api/'))out.set('Cache-Control','no-store');
 if(/^\/models\/.*\.glb$/.test(route))out.set('Cache-Control',/^[a-f0-9]{12}$/.test(url.searchParams.get('v')||'')?'public, max-age=31536000, immutable':'public, max-age=600');
 if(/^\/assets\/.*-[A-Za-z0-9_-]+\.(?:js|css)$/.test(route))out.set('Cache-Control','public, max-age=31536000, immutable');
 if(out.get('Content-Type')?.includes('text/html')){
  const legacy=['/credits/z-anatomy.html','/credits/hra-female.html'].includes(route);
  if(!isPage(route)&&!legacy)return notFound();
  let html=await response.text();if(isPage(route))html=rewriteMetadata(html,route,origin,indexable);
  html=html.replace(/<head>/i,`<head><meta name="csp-nonce" content="${nonce}">`).replace(/<style(?=[\s>])/gi,`<style nonce="${nonce}"`);
  out.set('Cache-Control','no-store');out.delete('Content-Length');out.delete('ETag');return new Response(html,{status:response.status,headers:out});
 }
 return new Response(response.body,{status:response.status,headers:out});
};
export const onRequest=[sentryPagesPlugin<Env>(context=>({dsn:context.env.SENTRY_DSN||undefined,environment:context.env.SENTRY_ENVIRONMENT||context.env.APP_ENV,sendDefaultPii:false,defaultIntegrations:false,tracesSampleRate:0,beforeSend:scrubEvent,beforeBreadcrumb:()=>null})),secure];
