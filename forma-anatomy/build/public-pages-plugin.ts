import fs from 'node:fs/promises';
import path from 'node:path';
import type {Plugin,Connect} from 'vite';
import {loadEnv} from 'vite';
import {ROUTES,siteConfig,staticPage,appHead,isPage,routePath,robots,sitemap} from '../shared/site';

// Marketing/legal pages contain actual HTML and never import the WebGL app.
// The lab retains its existing SPA entry and is compiled once by Vite.
export function publicPages():Plugin{
 let root=process.cwd(),config=siteConfig(process.env.SITE_ORIGIN);
 const handler:Connect.NextHandleFunction=async(req,res,next)=>{
  if(!['GET','HEAD'].includes(req.method||'GET'))return next();
  const url=new URL(req.url||'/','http://localhost'),route=routePath(url.pathname);
  if(route==='/robots.txt'||route==='/sitemap.xml'){
   res.setHeader('Content-Type',route==='/robots.txt'?'text/plain; charset=utf-8':'application/xml; charset=utf-8');
   res.end(req.method==='HEAD'?'':route==='/robots.txt'?robots(config.origin,false):sitemap(config.origin));return;
  }
  if(['/learn','/quiz'].includes(route))return next();
  if(isPage(route)||route==='/404'||!path.extname(route)&&!/^\/(?:src|@|node_modules|api|models|draco|assets)\b/.test(route)){
   res.statusCode=isPage(route)?200:404;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex, nofollow');
   res.end(req.method==='HEAD'?'':staticPage(route,config.origin,false));return;
  }
  next();
 };
 return {name:'forma-public-pages',configResolved(c){root=c.root;config=siteConfig(loadEnv(c.mode,root,'SITE_').SITE_ORIGIN||process.env.SITE_ORIGIN)},configureServer(server){server.middlewares.use(handler)},
  transformIndexHtml:{order:'post',handler(html,ctx){
   // Vite rewrites SPA requests to /index.html before this hook. Retain the
   // original requested route, including during direct /quiz navigation.
   const route=routePath(new URL(ctx.originalUrl||ctx.path,'http://localhost').pathname);
   return ctx.server?appHead(html,route,config.origin,false):html;
  }},
  async closeBundle(){
   const dir=path.join(root,'dist'),shell=await fs.readFile(path.join(dir,'index.html'),'utf8');
   for(const route of ROUTES){
    const html=['/learn','/quiz'].includes(route)?appHead(shell,route,config.origin,config.indexable):staticPage(route,config.origin,config.indexable);
    const file=path.join(dir,route==='/'?'index.html':route.slice(1)+'.html');await fs.writeFile(file,html);
   }
   await fs.writeFile(path.join(dir,'404.html'),staticPage('/404',config.origin,false));
   await fs.writeFile(path.join(dir,'robots.txt'),robots(config.origin,config.indexable));await fs.writeFile(path.join(dir,'sitemap.xml'),sitemap(config.origin));
   const headers=await fs.readFile(path.join(root,'public/_headers'),'utf8');
   await fs.writeFile(path.join(dir,'_headers'),headers+(!config.indexable?'\n/*\n  X-Robots-Tag: noindex, nofollow\n':''));
  }
 };
}
