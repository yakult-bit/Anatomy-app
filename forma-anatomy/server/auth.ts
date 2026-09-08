import type {Session,User} from '@supabase/supabase-js';
import type {Env} from './config';
import {admin,oauthClient,userDb} from './supabase';
import {redis,identityKey,clientIp} from './redis';
import {cookie,cookieName,setCookie,randomToken,hash,fail} from './http';
export const SESSION_TTL=7*86400;
type StoredSession={userId:string;access:string;refresh:string;expires:number;created:number;last:number;epoch:string};
type Transaction={values:Record<string,string>;created:number};
export type Identity={user:User;token:string;key:string;record:StoredSession};
const production=(e:Env)=>e.APP_ENV==='production';
export function sessionExpiry(session:Pick<Session,'expires_at'>){const expires=(session.expires_at||0)*1000;if(!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+660000)fail(503,'short_token_lifetime_required');return expires}
const userKey=async(e:Env,id:string)=>`user:${await identityKey(e,'session-user',id)}`;
export async function beginSignIn(e:Env,request:Request,token:string,headers:Headers){
 const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:e.TURNSTILE_SECRET_KEY,response:token,remoteip:clientIp(request,e)}),signal:AbortSignal.timeout(8000)});
 const result=await verify.json() as {success?:boolean;hostname?:string;action?:string};
 if(!verify.ok||!result.success||result.hostname!==new URL(e.APP_ORIGIN).hostname||result.action!=='signin')fail(403,'challenge_failed');
 const values:Record<string,string>={};const client=oauthClient(e,values);
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:e.APP_ORIGIN+'/api/auth/callback',skipBrowserRedirect:true,scopes:'openid email profile'}});
 if(error||!data.url)fail(503,'oauth_start_failed');
 const url=new URL(data.url!);if(url.origin!==new URL(e.SUPABASE_URL).origin||url.pathname!=='/auth/v1/authorize'||url.searchParams.get('provider')!=='google'||url.searchParams.get('code_challenge_method')!=='s256')fail(503,'oauth_configuration_invalid');
 const state=randomToken();await redis(e).set(`oauth:${await hash(state)}`,{values,created:Date.now()} satisfies Transaction,{ex:300});
 setCookie(headers,cookieName(production(e),'oauth'),state,300,production(e));return data.url;
}
export async function completeSignIn(e:Env,request:Request,headers:Headers){
 const url=new URL(request.url);if(url.origin!==e.APP_ORIGIN||url.pathname!=='/api/auth/callback')fail(400,'redirect_rejected');
 const codes=url.searchParams.getAll('code');if(codes.length!==1||codes[0].length>2048||!codes[0]||url.searchParams.has('error'))fail(400,'oauth_callback_invalid');
 const state=cookie(request,cookieName(production(e),'oauth'));if(!state)fail(400,'oauth_state_missing');
 // Supabase validates Google's OAuth state. This one-time HttpOnly transaction
 // binds that exchange to this browser and the server-held PKCE verifier.
 const transaction=await redis(e).getdel<Transaction>(`oauth:${await hash(state!)}`);
 setCookie(headers,cookieName(production(e),'oauth'),'',0,production(e));
 if(!transaction||Date.now()-transaction.created>300000)fail(400,'oauth_state_expired');
 const {data,error}=await oauthClient(e,transaction!.values).auth.exchangeCodeForSession(codes[0]);
 if(error||!data.session)fail(401,'pkce_exchange_failed');
 const verified=await userDb(e,data.session!.access_token).auth.getUser(data.session!.access_token);
 if(verified.error||!verified.data.user||verified.data.user.app_metadata.provider!=='google')fail(401,'google_identity_required');
 return {session:data.session!,user:verified.data.user!};
}
export async function saveSession(e:Env,session:Session,user:User,headers:Headers){
 const token=randomToken(),key=`session:${await hash(token)}`,uk=await userKey(e,user.id),r=redis(e);
 const epoch=await r.get<string>(uk+':epoch')||'initial';
 const record:StoredSession={userId:user.id,access:session.access_token,refresh:session.refresh_token,expires:sessionExpiry(session),created:Date.now(),last:Date.now(),epoch};
 await r.set(key,record,{ex:SESSION_TTL});await r.sadd(uk+':sessions',key);await r.expire(uk+':sessions',SESSION_TTL+3600);
 setCookie(headers,cookieName(production(e),'session'),token,SESSION_TTL,production(e));
}
export async function identity(e:Env,request:Request):Promise<Identity>{
 const token=cookie(request,cookieName(production(e),'session'));if(!token)fail(401,'sign_in_required');
 const key=`session:${await hash(token!)}`,r=redis(e);let record=await r.get<StoredSession>(key);
 if(!record)fail(401,'session_expired');
 const uk=await userKey(e,record!.userId);
 if(record!.epoch!==(await r.get<string>(uk+':epoch')||'initial')||Date.now()-record!.created>SESSION_TTL*1000||Date.now()-record!.last>86400000){await r.del(key);fail(401,'session_expired')}
 if(record!.expires<Date.now()+60000){
  const lock=randomToken();if(!await r.set(key+':lock',lock,{nx:true,ex:20}))fail(409,'session_refresh_busy',1);
  try{
   record=await r.get<StoredSession>(key);if(!record)fail(401,'session_expired');
   if(record!.expires<Date.now()+60000){
    const refreshed=await userDb(e,record!.access).auth.refreshSession({refresh_token:record!.refresh});
    if(refreshed.error||!refreshed.data.session){await r.del(key);fail(401,'session_expired')}
    const s=refreshed.data.session!;record={...record!,access:s.access_token,refresh:s.refresh_token,expires:sessionExpiry(s)};
   }
   // XX prevents an in-flight refresh from resurrecting a signed-out session.
   await r.set(key,record!,{xx:true,ex:Math.max(1,Math.ceil((record!.created+SESSION_TTL*1000-Date.now())/1000))});
  }finally{await r.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",[key+':lock'],[lock])}
 }
 const verified=await userDb(e,record!.access).auth.getUser(record!.access);
 if(verified.error||verified.data.user?.id!==record!.userId||verified.data.user.app_metadata.provider!=='google')fail(401,'session_invalid');
 // Check again after refresh/getUser, including revocations from another request.
 if(!await r.exists(key)||record!.epoch!==(await r.get<string>(uk+':epoch')||'initial'))fail(401,'session_revoked');
 if(Date.now()-record!.last>60000){record!.last=Date.now();await r.eval("local s=redis.call('GET',KEYS[1]);if not s then return 0 end;local v=cjson.decode(s);v.last=tonumber(ARGV[1]);redis.call('SET',KEYS[1],cjson.encode(v),'KEEPTTL');return 1",[key],[Date.now()])}
 return {user:verified.data.user!,token:record!.access,key,record:record!};
}
export async function revokeSessions(e:Env,id:Identity,headers:Headers,deleteAccount=false){
 const uk=await userKey(e,id.user.id),r=redis(e);
 // Global epoch invalidates every BFF session immediately, even during refresh.
 await r.set(uk+':epoch',randomToken(),{ex:SESSION_TTL+3600});
 const keys=await r.smembers<string[]>(uk+':sessions');if(keys.length)await r.del(...keys);await r.del(uk+':sessions');
 setCookie(headers,cookieName(production(e),'session'),'',0,production(e));
 const result=await admin(e).auth.admin.signOut(id.token,'global');
 if(result.error)fail(503,'provider_revocation_failed');
 if(deleteAccount){const deleted=await admin(e).auth.admin.deleteUser(id.user.id,false);if(deleted.error)fail(503,'account_delete_failed');await r.del(uk+':epoch')}
}
