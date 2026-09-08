import {build} from 'esbuild';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('work',{recursive:true});
await build({stdin:{contents:`export * from './server/http';export * from './server/config';export * from './server/quiz';export * from './server/headers';export * from './server/privacy';export * from './server/auth';export * from './build/csp-drei-plugin';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',packages:'external',outfile:'work/security-under-test.mjs'});
const m=await import('../work/security-under-test.mjs');
const {z}=await import('zod');
const origin='https://forma.example';
const request=(data,headers={})=>new Request(origin+'/api/bookmarks',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Forma-Request':'1',...headers},body:JSON.stringify(data)});
assert.throws(()=>m.sameOrigin(request({}, {Origin:'https://evil.example'}),origin),e=>e.status===403);
assert.throws(()=>m.sameOrigin(request({}, {'X-Forma-Request':''}),origin),e=>e.status===403);
assert.throws(()=>m.sameOrigin(request({}, {'Sec-Fetch-Site':'cross-site'}),origin),e=>e.status===403);
assert.doesNotThrow(()=>m.sameOrigin(request({}),origin));
await assert.rejects(()=>m.body(request({role:'admin'}),z.object({}).strict()),e=>e.status===400);
await assert.rejects(()=>m.body(request({x:'x'.repeat(9000)}),z.any()),e=>e.status===413);
await assert.rejects(()=>m.body(request({}, {'Content-Type':'text/plain'}),z.any()),e=>e.status===415);
assert.equal(m.answerSchema.safeParse({ticket:crypto.randomUUID(),index:0,answer:'heart',correct:true,user_id:crypto.randomUUID()}).success,false);
assert.equal(m.settingsSchema.safeParse({format:'identify',system:'all',region:'all',count:100000,timer:0}).success,false);
const plan=m.createPlan({format:'identify',system:'muscular',region:'upper-limb',count:5,timer:30});assert.equal(plan.plan.length,5);for(const p of plan.plan){assert.equal(p.options.length,4);assert.ok(p.options.includes(p.id));assert.equal(new Set(p.options).size,4)}
const data=JSON.parse(await fs.readFile('src/data/anatomy.json','utf8'));
for(const p of Object.values(data).filter(x=>x.available!==false)){assert.equal(m.grade('identify',p.id,p.id),true);assert.equal(m.grade('identify',p.id,'Not a structure'),false);assert.equal(m.grade('recall',p.id,p.displayName),true)}
assert.equal(m.grade('recall','deltoid_right','deltoid'),false);
assert.doesNotThrow(()=>m.sessionExpiry({expires_at:Math.floor(Date.now()/1000)+600}));assert.throws(()=>m.sessionExpiry({expires_at:Math.floor(Date.now()/1000)+3600}),e=>e.status===503);assert.throws(()=>m.sessionExpiry({expires_at:0}));
const token=m.randomToken(),h=new Headers();assert.equal(token.length,43);m.setCookie(h,'__Host-forma_session',token,300,true);
assert.match(h.get('Set-Cookie'),/HttpOnly; SameSite=Lax; Max-Age=300; Secure/);assert.ok(!h.get('Set-Cookie').includes('Domain='));
assert.equal(m.cookie(new Request(origin,{headers:{Cookie:'__Host-forma_session='+token}}),'__Host-forma_session'),token);
assert.equal(m.cookie(new Request(origin,{headers:{Cookie:`__Host-forma_session=${token}; __Host-forma_session=${token}`}}),'__Host-forma_session'),null);
const csp=m.securityHeaders(token,origin);assert.ok(!csp.get('Content-Security-Policy').includes('unsafe-inline'));assert.ok(csp.get('Content-Security-Policy').includes("style-src-attr 'none'"));assert.equal(csp.get('X-Frame-Options'),'DENY');assert.equal(csp.get('Access-Control-Allow-Origin'),null);
const pii={user:{email:'private@example.invalid'},request:{headers:{cookie:token},url:origin+'?code='+token,data:{password:token}},extra:{token},breadcrumbs:[{message:'private@example.invalid'}],exception:{values:[{value:'private@example.invalid'}]},tags:{control:'database_read_failed',email:'private@example.invalid'}};
const scrub=JSON.stringify(m.scrubEvent(pii));assert.ok(!scrub.includes('private@'));assert.ok(!scrub.includes(token));assert.ok(scrub.includes('database_read_failed'));
const source=await fs.readFile('node_modules/@react-three/drei/web/Html.js','utf8');const transform=m.cspDrei().transform;
const fixed=transform(source,'/node_modules/@react-three/drei/web/Html.js');assert.ok(!fixed.code.includes('el.style.cssText'));assert.ok(fixed.code.includes('Object.assign(el.style'));assert.throws(()=>transform('changed upstream','/node_modules/@react-three/drei/web/Html.js'));
const env={APP_ORIGIN:origin,APP_ENV:'production',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+token,SUPABASE_SERVICE_ROLE_KEY:crypto.randomUUID(),TURNSTILE_SITE_KEY:crypto.randomUUID(),TURNSTILE_SECRET_KEY:crypto.randomUUID(),UPSTASH_REDIS_REST_URL:'https://redis.example',UPSTASH_REDIS_REST_TOKEN:crypto.randomUUID(),RATE_LIMIT_HMAC_KEY:crypto.randomUUID(),SENTRY_DSN:'https://public@sentry.example/1'};
assert.doesNotThrow(()=>m.config(env));assert.throws(()=>m.config({...env,APP_ORIGIN:'https://random.pages.dev'}));assert.throws(()=>m.config({...env,SUPABASE_PUBLISHABLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY}));
// Actual Supabase PKCE client + real handler, with deterministic provider/Redis
// transport fakes. These do not claim to validate external provider settings.
const realFetch=globalThis.fetch;const cache=new Map();let verifyMode='ok';let challenge='';
globalThis.fetch=async(input,options)=>{
 const u=new URL(typeof input==='string'?input:input.url||input.toString());
 if(u.hostname==='challenges.cloudflare.com'){const b=JSON.parse(options.body);assert.ok(b.secret);return Response.json({success:verifyMode==='ok',hostname:verifyMode==='wrong-host'?'evil.example':new URL(origin).hostname,action:'signin'})}
 if(u.hostname==='redis.example'){
  const cmd=JSON.parse(options.body),name=cmd[0].toUpperCase();let result=null;
  if(name==='SET'){cache.set(cmd[1],cmd[2]);result='OK'}else if(name==='GETDEL'){result=cache.get(cmd[1])??null;cache.delete(cmd[1])}else throw Error('Unexpected Redis command '+name);
  return Response.json({result});
 }
 if(u.hostname==='project.supabase.co'&&u.pathname==='/auth/v1/token'){
  const b=JSON.parse(options.body);const actual=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(b.code_verifier))).toString('base64url');assert.equal(actual,challenge,'PKCE verifier did not match issued challenge');
  if(b.auth_code==='valid-code')return Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001',app_metadata:{provider:'google'}}});
  return Response.json({error:'invalid_grant',error_description:'wrong code'},{status:400});
 }
 if(u.hostname==='project.supabase.co'&&u.pathname==='/auth/v1/user')return Response.json({id:'00000000-0000-4000-8000-000000000001',app_metadata:{provider:'google'}});
 throw Error('Unexpected network request');
};
try{
 const hh=new Headers();const redirect=await m.beginSignIn(env,new Request(origin,{headers:{'CF-Connecting-IP':'192.0.2.1'}}),'challenge-token',hh);
 const u=new URL(redirect);assert.equal(u.searchParams.get('provider'),'google');assert.equal(u.searchParams.get('redirect_to'),origin+'/api/auth/callback');challenge=u.searchParams.get('code_challenge');assert.ok(challenge);
 const oauthCookie=hh.get('Set-Cookie').split(';')[0];
 await assert.rejects(()=>m.completeSignIn(env,new Request(origin+'/api/auth/callback?code=valid-code'),new Headers()),e=>e.status===400);
 const signed=await m.completeSignIn(env,new Request(origin+'/api/auth/callback?code=valid-code',{headers:{Cookie:oauthCookie}}),new Headers());assert.equal(signed.user.app_metadata.provider,'google');
 await assert.rejects(()=>m.completeSignIn(env,new Request(origin+'/api/auth/callback?code=valid-code',{headers:{Cookie:oauthCookie}}),new Headers()),e=>e.status===400);
 verifyMode='wrong-host';await assert.rejects(()=>m.beginSignIn(env,new Request(origin,{headers:{'CF-Connecting-IP':'192.0.2.1'}}),'token',new Headers()),e=>e.status===403);
}finally{globalThis.fetch=realFetch}
console.log('PASS security controls: strict schemas, body limits, CSRF, grading, cookies, CSP, PII scrubbing, real SDK PKCE transaction/replay, Turnstile hostname.');
