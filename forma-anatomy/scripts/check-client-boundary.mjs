import fs from 'node:fs';
import path from 'node:path';
const violations=[];
function walk(root, built=false){
 for(const e of fs.readdirSync(root,{withFileTypes:true})){
  const p=path.join(root,e.name);
  if(e.isDirectory())walk(p,built);
  else if(/\.(?:[cm]?[jt]sx?|html)$/.test(p)){
   const s=fs.readFileSync(p,'utf8');
   if(/SUPABASE_SERVICE_ROLE_KEY|UPSTASH_REDIS_REST_TOKEN|TURNSTILE_SECRET_KEY|RATE_LIMIT_HMAC_KEY|sb_secret_[A-Za-z0-9_-]+/.test(s))violations.push(p);
   if(!built&&/from\s*['"].*(?:server\/|@supabase\/supabase-js|@sentry\/cloudflare|@upstash\/redis)/.test(s))violations.push(p);
   if(/dangerouslySetInnerHTML|\beval\s*\(/.test(s)&&!built)violations.push(p);
  }
 }
}
for(const k of Object.keys(process.env))if(k.startsWith('VITE_')&&process.env[k]&&!['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].includes(k))violations.push('Forbidden public environment variable: '+k);
walk('src');
if(fs.existsSync('dist/assets'))walk('dist/assets',true);
if(violations.length){console.error('Client boundary violations:',[...new Set(violations)]);process.exit(1)}
console.log('Client/server credential boundary passed.');
