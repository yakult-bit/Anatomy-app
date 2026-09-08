import {Redis} from '@upstash/redis';
import type {Env} from './config';
import {fail} from './http';
export function redis(e:Env){return new Redis({url:e.UPSTASH_REDIS_REST_URL,token:e.UPSTASH_REDIS_REST_TOKEN,retry:{retries:0},enableAutoPipelining:false})}
export async function identityKey(e:Env,kind:string,id:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(e.RATE_LIMIT_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);const h=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(kind+':'+id));return Array.from(new Uint8Array(h),v=>v.toString(16).padStart(2,'0')).join('')}
export function clientIp(req:Request,e:Env){const ip=req.headers.get('CF-Connecting-IP');if(e.APP_ENV==='production'&&!ip)fail(503,'edge_identity_missing');return ip||'local'}
// All state changes use atomic Redis scripts. A dependency outage fails closed.
const LIMIT=`local blocked=tonumber(redis.call('GET',KEYS[2]) or '0'); if blocked>tonumber(ARGV[1]) then return math.ceil((blocked-tonumber(ARGV[1]))/1000) end; local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; if n>tonumber(ARGV[2]) then return math.max(1,redis.call('TTL',KEYS[1])) end; return 0`;
export async function limit(e:Env,scope:string,kind:'ip'|'user',id:string,max:number){const key=`rate:${scope}:${await identityKey(e,kind,id)}`;const retry=await redis(e).eval<(number|string)[],number>(LIMIT,[key,key+':blocked'],[Date.now(),max]);if(retry>0)fail(429,'rate_limited',retry);return key}
export async function failure(e:Env,key:string){await redis(e).eval(`local n=redis.call('INCR',KEYS[1]);redis.call('EXPIRE',KEYS[1],900);local delay=math.min(300,2^math.min(n-1,9));redis.call('SET',KEYS[2],tonumber(ARGV[1])+delay*1000,'EX',900);return n`,[key+':failures',key+':blocked'],[Date.now()])}
export async function success(e:Env,key:string){await redis(e).del(key+':failures',key+':blocked')}
