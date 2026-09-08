// Real Wrangler/Pages HTTP smoke test. No external services or real secrets.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const root=process.cwd(),fixture=path.join(root,'work','pages-smoke');
await fs.mkdir(fixture,{recursive:true});
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
assert(!pkg.scripts['dev:full'].includes('--config'));
assert(!pkg.scripts['deploy:pages'].includes('--config'));
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
assert(config.compatibility_date);assert(config.compatibility_flags.includes('nodejs_compat'));
for(const name of ['server','shared','src/data','functions'])await fs.cp(path.join(root,name),path.join(fixture,name),{recursive:true});
await fs.copyFile('wrangler.jsonc',path.join(fixture,'wrangler.jsonc'));
await fs.mkdir(path.join(fixture,'dist'),{recursive:true});
await fs.writeFile(path.join(fixture,'dist/index.html'),'<!doctype html><html><head></head><body>Pages local smoke test</body></html>');
await fs.writeFile(path.join(fixture,'dist/favicon.ico'),'test icon');
await build({stdin:{contents:`export * from './server/config';`,resolveDir:root},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/config-under-test.mjs'});
const {configurationFailure,configurationIssues}=await import('../work/config-under-test.mjs');
const prod=await configurationFailure(new Request('https://forma.example'),{APP_ENV:'production'}).json();
assert.deepEqual(prod,{error:'Service configuration is incomplete.'});
const invalid=configurationIssues({APP_ENV:'development',APP_ORIGIN:'bad-value'},'origin');assert.deepEqual(invalid.invalid,['APP_ORIGIN']);
const secret='never-log-this-sensitive-value';
assert(!(await configurationFailure(new Request('http://localhost:8788'),{APP_ENV:'development',SUPABASE_SERVICE_ROLE_KEY:secret}).text()).includes(secret));

async function run(port,vars,verify){
 await fs.writeFile(path.join(fixture,'.dev.vars'),vars);
 // Same Pages command as dev:full, with an isolated port/fixture. The standard
 // config is auto-discovered; no compatibility flags supplied on the CLI.
 const child=spawn(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'pages','dev','dist','--port',String(port),'--inspector-port','0'],{
  cwd:fixture,env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:path.join(fixture,'wrangler.log')},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
 try{
  const start=Date.now();let response;
  while(Date.now()-start<25000){
   if(child.exitCode!==null)throw Error('Wrangler exited: '+logs);
   try{response=await fetch(`http://localhost:${port}/`,{redirect:'manual',signal:AbortSignal.timeout(1000)});break}catch{}
   await new Promise(r=>setTimeout(r,100));
  }
  assert(response,'Wrangler did not become ready: '+logs);
  assert(!/No compatibility_date|node:async_hooks|does not support custom paths|Build failed/i.test(logs),logs);
  await verify(response);
 }finally{
  child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2000))]);
  if(child.exitCode===null)child.kill('SIGKILL');
 }
}
await run(8799,'',async response=>{
 assert.equal(response.status,503);const body=await response.json();assert(body.missing.includes('APP_ENV'));assert(body.missing.includes('APP_ORIGIN'));
});
await run(8800,'APP_ENV=development\nAPP_ORIGIN=http://localhost:8800\n',async response=>{
 assert.equal(response.status,200);assert((await response.text()).includes('Pages local smoke test'));
 assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert(!response.headers.get('Content-Security-Policy').includes('unsafe-inline'));
 assert.equal((await fetch('http://localhost:8800/favicon.ico')).status,200);
 const api=await fetch('http://localhost:8800/api/config');assert.equal(api.status,503);
 const body=await api.json();assert(body.missing.includes('SUPABASE_URL'));assert(body.missing.includes('UPSTASH_REDIS_REST_TOKEN'));assert(body.error.includes('.dev.vars'));
});
await fs.rm(fixture,{recursive:true,force:true});
console.log('PASS real Pages server: root config, Sentry/node compatibility, named missing variables, public / and favicon 200, unconfigured API 503, production diagnostics private.');
