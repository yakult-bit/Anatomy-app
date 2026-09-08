import {z} from 'zod';
import {config,configurationFailure,type Env} from './config';
import {body,empty,fail,HttpError,json,sameOrigin,cookieName,setCookie} from './http';
import {beginSignIn,completeSignIn,saveSession,identity,revokeSessions,type Identity} from './auth';
import {limit,failure,success,clientIp} from './redis';
import {userDb,admin} from './supabase';
import {structureId,settingsSchema,createPlan,questionSchema,answerSchema,grade,replacementQuestion,validReroll,type Plan} from './quiz';
import {studyData,exportData} from './data';
import {audit,report} from './logging';
export async function handleApi(request:Request,raw:unknown){
 const headers=new Headers();const requestId=crypto.randomUUID();let e:Env|undefined;const rateKeys:string[]=[];let stage='configuration';
 try{
  e=config(raw);const url=new URL(request.url),path=url.pathname;
  if(url.origin!==e.APP_ORIGIN)fail(403,'origin_rejected');
  const ip=clientIp(request,e);
  rateKeys.push(await limit(e,path==='/api/auth/callback'?'callback':path==='/api/auth/start'?'signin':'api','ip',ip,path==='/api/auth/start'?5:path==='/api/auth/callback'?15:120));
  if(request.method==='OPTIONS')fail(405,'method_rejected');
  const write=request.method==='POST';if(write)sameOrigin(request,e.APP_ORIGIN);
  if(!write&&request.method!=='GET')fail(405,'method_rejected');
  if(path!=='/api/auth/callback'&&url.search)fail(400,'query_rejected');
  stage=['/api/config','/api/auth/start','/api/auth/callback','/api/session','/api/auth/signout','/api/bookmarks','/api/review','/api/quiz/start','/api/quiz/answer','/api/quiz/next','/api/quiz/ready','/api/quiz/reroll','/api/account/export','/api/account/delete'].includes(path)?path:'unknown_route';
  if(path==='/api/config'&&request.method==='GET')return json({signInAvailable:true,turnstileSiteKey:e.TURNSTILE_SITE_KEY},200,headers);
  if(path==='/api/auth/start'&&write){
   const input=await body(request,z.object({turnstileToken:z.string().min(1).max(2048)}).strict());
   const redirect=await beginSignIn(e,request,input.turnstileToken,headers);audit('auth_started',requestId,200,stage);return json({redirect},200,headers);
  }
  if(path==='/api/auth/callback'&&request.method==='GET'){
   const signed=await completeSignIn(e,request,headers);
   rateKeys.push(await limit(e,'callback','user',signed.user.id,10));
   await saveSession(e,signed.session,signed.user,headers);for(const k of rateKeys)await success(e,k);
   audit('auth_signed_in',requestId,303,stage);headers.set('Location',e.APP_ORIGIN+'/');headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');return new Response(null,{status:303,headers});
  }
  const knownSessionCookie=request.headers.get('Cookie')?.includes('forma_session=');
  if(path==='/api/session'&&request.method==='GET'&&!knownSessionCookie)return json({profile:null,bookmarks:[],reviewDue:[],stats:{},studyDays:[]},200,headers);
  const id=await identity(e,request);
  rateKeys.push(await limit(e,'api','user',id.user.id,write?60:120));
  let result:unknown;
  if(path==='/api/session'&&request.method==='GET')result=await studyData(e,id);
  else if(path==='/api/auth/signout'&&write){await body(request,empty);await revokeSessions(e,id,headers);audit('auth_signed_out',requestId,200,stage);result={ok:true}}
  else if(path==='/api/bookmarks'&&write){
   const input=await body(request,z.object({structureId,saved:z.boolean()}).strict());const db=userDb(e,id.token);
   const response=input.saved?await db.from('bookmarks').upsert({user_id:id.user.id,structure_id:input.structureId},{onConflict:'user_id,structure_id',ignoreDuplicates:true}):await db.from('bookmarks').delete().eq('user_id',id.user.id).eq('structure_id',input.structureId);
   if(response.error)fail(503,'bookmark_write_failed');result={ok:true};
  }else if(path==='/api/review'&&write){
   const input=await body(request,z.object({structureId}).strict());const saved=await admin(e).rpc('queue_review',{p_user_id:id.user.id,p_structure_id:input.structureId});if(saved.error)fail(503,'review_write_failed');result={ok:true};
  }else if(path==='/api/quiz/start'&&write){
   const settings=await body(request,settingsSchema),{plan,format}=createPlan(settings);
   const db=admin(e); // Identity always comes from getUser, never request fields.
   await db.from('quiz_runs').delete().eq('user_id',id.user.id).lt('created_at',new Date(Date.now()-86400000).toISOString());
   const q=await db.from('quiz_runs').insert({user_id:id.user.id,plan,format,timer:settings.timer,ready:false,click_difficulty:settings.clickDifficulty||'beginner'}).select('id,active_at').single();
   if(q.error)fail(503,'quiz_create_failed');result={ticket:q.data!.id,questions:plan,format,timer:settings.timer,activeAt:Date.parse(q.data!.active_at)};
  }else if(path==='/api/quiz/ready'&&write){
   const input=await body(request,questionSchema);const ready=await admin(e).rpc('ready_identify_question',{p_user_id:id.user.id,p_quiz_id:input.ticket,p_index:input.index});if(ready.error)fail(409,'question_not_ready');result={activeAt:Date.parse(ready.data)};
  }else if(path==='/api/quiz/reroll'&&write){
   const input=await body(request,questionSchema.extend({reason:z.enum(['missing_geometry_bounds','fewer_than_three_region_distractors','framing_clamped','footprint_too_small','footprint_too_large','below_click_size_floor','disconnected_fragments','not_a_major_structure','missing_geometry','missing_precomputed_geometry','no_supported_viewport','unsupported_viewport','setup_timeout','model_unavailable']),aspect:z.number().finite().min(.05).max(10)}).strict());
   const q=await userDb(e,id.token).from('quiz_runs').select('plan,format,skipped,click_difficulty,active_at,ready').eq('id',input.ticket).eq('user_id',id.user.id).single();if(q.error||!['identify','click','recall','function'].includes(q.data?.format))fail(404,'quiz_not_found');
   const loadingFailure=!q.data!.ready&&['setup_timeout','model_unavailable'].includes(input.reason);
   // Load failures are unscored, bounded by the database skip cap and rate limits.
   const target=(q.data!.plan as Plan)[input.index];if(!target||!loadingFailure&&!validReroll(target.id,input.aspect,input.reason,q.data!.format,q.data!.click_difficulty))fail(400,'reroll_not_verified');
   const question=replacementQuestion(target.id,[...(q.data!.plan as Plan).map(p=>p.id),...q.data!.skipped],input.aspect,q.data!.format,q.data!.click_difficulty,(q.data!.plan as Plan).map(p=>p.id));
   const replaced=await admin(e).rpc('replace_identify_question',{p_user_id:id.user.id,p_quiz_id:input.ticket,p_index:input.index,p_expected:target.id,p_question:question});if(replaced.error)fail(409,'reroll_not_accepted');result={question};
  }else if(path==='/api/quiz/answer'&&write){
   const input=await body(request,answerSchema);
   const q=await userDb(e,id.token).from('quiz_runs').select('plan,format').eq('id',input.ticket).eq('user_id',id.user.id).single();
   if(q.error||!q.data)fail(404,'quiz_not_found');const target=(q.data!.plan as Plan)[input.index];if(!target)fail(400,'question_not_found');
   const answer=await admin(e).rpc('grade_answer',{p_user_id:id.user.id,p_quiz_id:input.ticket,p_index:input.index,p_correct:grade(q.data!.format,target.id,input.answer),p_revealed:q.data!.format==='click'&&input.answer==='__revealed__'});
   if(answer.error)fail(409,'answer_not_accepted');result={feedback:{...answer.data,chosen:input.answer},...(await studyData(e,id))};
  }else if(path==='/api/quiz/next'&&write){
   const input=await body(request,questionSchema);const next=await admin(e).rpc('activate_question',{p_user_id:id.user.id,p_quiz_id:input.ticket,p_index:input.index});
   if(next.error)fail(409,'question_not_active');result={activeAt:Date.parse(next.data)};
  }else if(path==='/api/account/export'&&write){await body(request,empty);headers.set('Content-Disposition','attachment; filename="forma-data.json"');result=await exportData(e,id);audit('account_exported',requestId,200,stage)}
  else if(path==='/api/account/delete'&&write){
   await body(request,z.object({confirmation:z.literal('DELETE')}).strict());
   if(Date.now()-id.record.created>300000)fail(403,'recent_sign_in_required');
   await revokeSessions(e,id,headers,true);audit('account_deleted',requestId,200,stage);result={ok:true};
  }else fail(404,'route_not_found');
  for(const k of rateKeys)await success(e,k);return json(result,200,headers);
 }catch(error){
  if(stage==='configuration'&&!e)return configurationFailure(request,raw);
  const status=error instanceof HttpError?error.status:503,code=error instanceof HttpError?error.code:'unexpected_failure';
  if(e&&status>=400&&status<500&&status!==429&&status!==409){for(const key of rateKeys)try{await failure(e,key)}catch{/* dependency is already failing closed */}}
  if(status===401&&e)setCookie(headers,cookieName(e.APP_ENV==='production','session'),'',0,e.APP_ENV==='production');
  audit('request_failed',requestId,status,stage,code);if(status>=500)report(code);
  if(error instanceof HttpError&&error.retryAfter)headers.set('Retry-After',String(error.retryAfter));
  // Only fixed safe messages, no provider text or stack traces in responses.
  return json({error:status===401?'Please sign in to save your data.':code==='recent_sign_in_required'?'Please sign out and sign in again before deleting your account.':status===429?'Too many attempts. Please wait and try again.':'This request could not be completed. Please try again.',code:code==='session_refresh_busy'?'retry':undefined},status,headers);
 }
}
