import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:`export * from './shared/site';export {publicPages} from './build/public-pages-plugin';export {secure} from './functions/_middleware';export {securityHeaders} from './server/headers';export {atlasContent} from './shared/atlas';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/public-pages-test.mjs',logLevel:'silent'});
const m=await import('../work/public-pages-test.mjs'),origin='https://forma.example',env={APP_ENV:'production',APP_ORIGIN:origin};
async function asset(requestPath){
 const route=new URL(requestPath,origin).pathname,rel=route==='/'?'index.html':route.slice(1);
 for(const name of [rel,rel+'.html']){try{const b=await fs.readFile(path.join('dist',name));return new Response(b,{headers:{'Content-Type':/\.html$/.test(name)?'text/html':/\.glb$/.test(name)?'model/gltf-binary':'application/octet-stream'}})}catch{}}
 // Deliberately reproduce a host's dangerous SPA fallback for the middleware.
 return new Response(await fs.readFile('dist/index.html'),{headers:{'Content-Type':'text/html'}});
}
const get=(pathname,host=origin)=>m.secure({request:new Request(host+pathname),env,next:()=>asset(pathname)});
const titles=new Set();let links=0,related=0;
for(const route of m.ROUTES){
 const response=await get(route);assert.equal(response.status,200,route);const html=await response.text();
 assert(html.includes('<title>'+m.routeMeta[route].title+'</title>'));titles.add(m.routeMeta[route].title);
 assert(html.includes(`content="${origin}/social-preview.png"`));assert(html.includes('content="summary_large_image"'));
 assert(html.includes(`rel="canonical" href="${origin+route}"`));assert(!html.includes('unsafe-inline'));
 if(!['/learn','/quiz'].includes(route)){assert(!/<script\b/i.test(html),route+' loads app JavaScript');assert(html.match(/<p>/g).length>=2,'no initial prose')}
 const generated=await fs.readFile(path.join('dist',route==='/'?'index.html':route.slice(1)+'.html'),'utf8');
 assert(generated.includes(m.routeMeta[route].title));assert(generated.includes('noindex,nofollow'),'default private build must not index');
}
assert.equal(titles.size,m.ROUTES.length);
// Vite supplies the rewritten entry path and original URL separately.
const plugin=m.publicPages();
for(const route of ['/learn','/quiz']){
 const html=plugin.transformIndexHtml.handler('<html><head><title>shell</title></head></html>',{path:'/index.html',originalUrl:route+'?account=1',server:{}});
 assert(html.includes('<title>'+m.routeMeta[route].title+'</title>'),'Vite lost the original route');
}
for(const missing of ['/not-a-page','/not-a-page/','/unknown.html','/assets/missing.js','/404','/server/config.ts','/.env'])assert.equal((await get(missing)).status,404,missing+' soft 404');
assert((await (await get('/missing')).text()).includes('Open the anatomy lab'));
assert.equal((await get('/learn.html')).status,301);assert.equal((await get('/learn/')).headers.get('Location'),origin+'/learn');
const robot=await get('/robots.txt'),xml=await get('/sitemap.xml');assert.equal(robot.status,200);assert.equal(xml.status,200);
assert((await robot.text()).includes('Allow: /\nSitemap: '+origin+'/sitemap.xml'));
const urls=await xml.text();for(const route of m.ROUTES)assert(urls.includes('<loc>'+origin+route+'</loc>'));
const preview=await get('/learn','https://preview.pages.dev');assert.equal(preview.status,301);assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');
assert(!m.siteConfig().indexable);assert(m.siteConfig(origin).indexable);assert.throws(()=>m.siteConfig('https://forma.example/path'));
const model=JSON.parse(await fs.readFile('src/data/model-info.json','utf8')).files[0];
const cached=await get(model.path+'?v='+model.sha256.slice(0,12));assert.equal(cached.headers.get('Cache-Control'),'public, max-age=31536000, immutable');
assert(m.securityHeaders('nonce',origin).get('Content-Security-Policy').includes("img-src 'self'"));

async function walk(dir){const all=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name==='.openai')continue;const p=path.join(dir,e.name);if(e.isDirectory())all.push(...await walk(p));else all.push(p)}return all}
const files=await walk('dist'),missing=[];
for(const file of files.filter(p=>p.endsWith('.html'))){
 const html=await fs.readFile(file,'utf8'),base=new URL('/'+path.relative('dist',file).replaceAll('\\','/'),origin);
 for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  const url=new URL(match[1].replaceAll('&amp;','&'),base);if(url.origin!==origin||url.hash)continue;links++;
  const rel=url.pathname.slice(1)||'index.html';let found=m.isPage(url.pathname);
  if(!found)for(const candidate of [rel,rel+'.html',path.join(rel,'index.html')]){try{if((await fs.stat(path.join('dist',candidate))).isFile())found=true}catch{}}
  if(!found)missing.push({file,url:url.pathname});
 }
}
for(const p of Object.values(m.atlasContent).filter(p=>p.available!==false))for(const id of p.relatedIds||[]){assert(m.atlasContent[id],p.id+' broken related ID '+id);related++;}
const manifest=JSON.parse(await fs.readFile('dist/site.webmanifest','utf8'));
for(const icon of manifest.icons)await fs.access('dist'+icon.src);
assert.deepEqual(missing,[]);
await fs.mkdir('work/reports',{recursive:true});
await fs.writeFile('work/reports/public-pages.json',JSON.stringify({routes:m.ROUTES,initialHtml:true,routeStatusChecks:'200,301,404 verified through production middleware; deliberately mocked SPA fallback rejected',internalHtmlLinksChecked:links,missing,relatedStructureLinksChecked:related,previewNoindex:true,cspImageHost:'self',browserCrawl:'not run'},null,2));
console.log(`PASS: ${m.ROUTES.length} route titles, initial HTML, ${links} internal HTML links, ${related} related IDs, real 404s, crawler files, immutable model cache and preview noindex. Browser crawl remains separate.`);
