// Invoke the production middleware/API directly, with no listening sockets,
// provider mocks, or external requests. test:pages covers actual Wrangler HTTP.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import fs from 'node:fs/promises';
await build({stdin:{contents:`export {secure} from './functions/_middleware';export {handleApi} from './server/api';export * from './server/config';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/pages-config-under-test.mjs'});
const m=await import('../work/pages-config-under-test.mjs');
const raw={APP_ENV:'development',APP_ORIGIN:'http://localhost:8788'};
const request=new Request(raw.APP_ORIGIN+'/');
const context={request,env:raw,next:async()=>new Response('<html><head></head><body>App</body></html>',{headers:{'Content-Type':'text/html'}})};
const response=await m.secure(context);assert.equal(response.status,200);
assert.equal(response.headers.get('X-Frame-Options'),'DENY');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
assert((await response.text()).includes('csp-nonce'));assert(!response.headers.get('Content-Security-Policy').includes('unsafe-inline'));
const favicon=await m.secure({...context,request:new Request(raw.APP_ORIGIN+'/favicon.ico'),next:async()=>new Response('icon')});assert.equal(favicon.status,200);
const missing=await m.secure({...context,env:{}});assert.equal(missing.status,503);
const missingBody=await missing.json();assert.deepEqual(new Set(missingBody.missing),new Set(['APP_ENV','APP_ORIGIN']));
const api=await m.handleApi(new Request(raw.APP_ORIGIN+'/api/config'),raw);assert.equal(api.status,503);
const details=await api.json();assert(details.missing.includes('SUPABASE_URL'));assert(details.missing.includes('UPSTASH_REDIS_REST_TOKEN'));assert(details.error.includes('.dev.vars'));
const invalid=await m.secure({...context,env:{...raw,APP_ORIGIN:'not a url'}});assert.equal(invalid.status,503);assert.deepEqual((await invalid.json()).invalid,['APP_ORIGIN']);
const prod=await m.secure({...context,request:new Request('https://forma.example'),env:{APP_ENV:'production'}});assert.deepEqual(await prod.json(),{error:'Service configuration is incomplete.'});
const other=await m.secure({...context,request:new Request('http://127.0.0.1:8788/favicon.ico')});assert.equal(other.status,301);assert.equal(other.headers.get('Location'),raw.APP_ORIGIN+'/favicon.ico');
const config=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),pkg=JSON.parse(await fs.readFile('package.json','utf8'));
assert(config.compatibility_date);assert(config.compatibility_flags.includes('nodejs_compat'));
assert(!pkg.scripts['dev:full'].includes('--config'));assert(!pkg.scripts['deploy:pages'].includes('--config'));
await assert.rejects(fs.access('wrangler.pages.jsonc'));
console.log('PASS production Pages handlers: public root/favicon 200, API fails closed with missing names, invalid names safe, production errors generic, canonical redirect, root Wrangler config and deploy script.');
