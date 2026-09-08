import type {Env} from './config';
import type {Identity} from './auth';
import {userDb} from './supabase';
import {fail} from './http';
async function allRows(query:(from:number,to:number)=>any){const rows:any[]=[];for(let from=0;;from+=1000){const {data,error}=await query(from,from+999);if(error)fail(503,'database_read_failed');rows.push(...data);if(data.length<1000)break;if(from>100000)fail(503,'export_limit')}return rows}
export async function studyData(e:Env,id:Identity){
 const db=userDb(e,id.token);
 const [profile,bookmarks,stats,days,reviews]=await Promise.all([
  db.from('profiles').select('email,display_name,avatar_url').eq('user_id',id.user.id).single(),
  allRows((a,b)=>db.from('bookmarks').select('structure_id').eq('user_id',id.user.id).order('structure_id').range(a,b)),
  allRows((a,b)=>db.from('structure_progress').select('structure_id,attempts,correct,revealed,run,due,last').eq('user_id',id.user.id).order('structure_id').range(a,b)),
  allRows((a,b)=>db.from('study_days').select('day').eq('user_id',id.user.id).order('day').range(a,b)),
  allRows((a,b)=>db.from('review_queue').select('structure_id').eq('user_id',id.user.id).order('structure_id').range(a,b))
 ]);
 if(profile.error)fail(503,'profile_read_failed');
 return {profile:profile.data,reviewDue:reviews.map(x=>x.structure_id),bookmarks:bookmarks.map(x=>x.structure_id),stats:Object.fromEntries(stats.map(({structure_id,due,last,...s})=>[structure_id,{...s,due:Date.parse(due),last:Date.parse(last)}])),studyDays:days.map(x=>x.day)};
}
export async function exportData(e:Env,id:Identity){const data=await studyData(e,id);const quizzes=await allRows((a,b)=>userDb(e,id.token).from('quiz_runs').select('format,timer,plan,cursor,answers,active_at,created_at,ready,skipped,click_difficulty').eq('user_id',id.user.id).order('created_at').order('id').range(a,b));return {exportedAt:new Date().toISOString(),...data,quizzes}}
