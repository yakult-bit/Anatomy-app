import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
// Real PostgreSQL engine in WASM. Only Supabase's auth schema/helper is stubbed;
// application migrations, constraints, permissions and RLS run unchanged.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
for(const name of (await fs.readdir('supabase/migrations')).sort())await db.exec(await fs.readFile('supabase/migrations/'+name,'utf8'));
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const tables=['profiles','bookmarks','structure_progress','study_days','quiz_runs','review_queue'];
const part=(await db.query('select id from public.anatomy_structures order by id limit 1')).rows[0].id;
const part2=(await db.query('select id from public.anatomy_structures order by id offset 1 limit 1')).rows[0].id;
const plan=JSON.stringify([{id:part,options:[part,part2]},{id:part2,options:[part,part2]}]);
for(const uid of [A,B]){
 await db.query(`insert into auth.users values($1,$2,'{"provider":"google"}','{"full_name":"Test student"}')`,[uid,'test@example.invalid']);
 await db.query('insert into bookmarks values($1,$2)',[uid,part]);
 await db.query('insert into review_queue values($1,$2)',[uid,part]);
 await db.query('insert into structure_progress(user_id,structure_id) values($1,$2)',[uid,part]);
 await db.query("insert into study_days values($1,'2026-09-06')",[uid]);
 await db.query('insert into quiz_runs(user_id,plan,format,timer) values($1,$2,\'identify\',0)',[uid,plan]);
}
async function asUser(uid){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')}
async function denied(sql,args=[]){await assert.rejects(()=>db.query(sql,args),e=>['42501','22023'].includes(e.code))}
await asUser(A);
for(const table of tables){const r=await db.query(`select user_id from public.${table}`);assert.ok(r.rows.length);assert.ok(r.rows.every(r=>r.user_id===A),`${table} leaked B`);assert.equal((await db.query(`select user_id from public.${table} where user_id=$1`,[B])).rows.length,0)}
await denied('insert into bookmarks values($1,$2)',[B,part2]);
assert.equal((await db.query('delete from bookmarks where user_id=$1 returning structure_id',[B])).rows.length,0);
await denied('update profiles set display_name=$1 where user_id=$2',['Changed',B]);
await denied('update structure_progress set correct=999 where user_id=$1',[A]);
await denied('insert into structure_progress(user_id,structure_id) values($1,$2)',[A,part2]);
await denied('delete from study_days where user_id=$1',[B]);
await denied('delete from quiz_runs where user_id=$1',[B]);
await denied('select queue_review($1,$2)',[B,part2]);
await denied('insert into review_queue values($1,$2)',[A,part2]);
await denied('insert into anatomy_structures(id,display_name,system,region) values($1,$2,$3,$4)',['fake','fake','fake','fake']);
const own=(await db.query('select id from quiz_runs')).rows[0].id;
await denied('select public.grade_answer($1,$2,0,true)',[A,own]);
// Test RLS itself for UPDATE/DELETE/INSERT in a rolled-back grant fixture,
// independent of the stricter production column/table permission layer.
await db.exec('reset role;begin;grant insert,update,delete on profiles,structure_progress,study_days,quiz_runs,bookmarks,review_queue to authenticated;set role authenticated;');
for(const table of tables){assert.equal((await db.query(`update ${table} set user_id=$1 where user_id=$2 returning user_id`,[A,B])).rows.length,0);assert.equal((await db.query(`delete from ${table} where user_id=$1 returning user_id`,[B])).rows.length,0)}
await db.exec('rollback');await asUser(A);
await db.query('insert into bookmarks values($1,$2)',[A,part2]);assert.equal((await db.query('delete from bookmarks where user_id=$1 and structure_id=$2 returning structure_id',[A,part2])).rows.length,1);
await asUser(B);assert.equal((await db.query('select user_id from bookmarks')).rows[0].user_id,B);
await db.exec('reset role;set role anon');assert.equal((await db.query('select id from anatomy_structures')).rows.length,3465);for(const table of tables)await denied(`select user_id from ${table}`);
await db.exec('reset role;set role service_role');
const before=(await db.query('select attempts from structure_progress where user_id=$1 and structure_id=$2',[A,part])).rows[0].attempts;
const first=(await db.query('select grade_answer($1,$2,0,true) as answer',[A,own])).rows[0].answer;
assert.equal(first.correct,true);
await db.query('select grade_answer($1,$2,0,false)',[A,own]);
assert.equal((await db.query('select attempts from structure_progress where user_id=$1 and structure_id=$2',[A,part])).rows[0].attempts,before+1,'replay incremented score');
await denied('select grade_answer($1,$2,1,true)',[A,own]);
await db.query('select activate_question($1,$2,1)',[A,own]);await denied('select grade_answer($1,$2,1,true)',[A,own]);await db.query('select ready_identify_question($1,$2,1)',[A,own]);await db.query('select grade_answer($1,$2,1,false)',[A,own]);
const timed=(await db.query("insert into quiz_runs(user_id,plan,format,timer,active_at) values($1,$2,'identify',30,now()-interval '1 minute') returning id",[A,plan])).rows[0].id;
assert.equal((await db.query('select grade_answer($1,$2,0,true) as answer',[A,timed])).rows[0].answer.correct,false,'expired answer was credited');
await denied('select grade_answer($1,$2,0,true)',[B,timed]);
const click=(await db.query("insert into quiz_runs(user_id,plan,format,timer,ready) values($1,$2,'click',30,false) returning id",[A,plan])).rows[0].id;
await denied('select grade_answer($1,$2,0,true,false)',[A,click]);
await db.query('select ready_identify_question($1,$2,0)',[A,click]);
await db.query('select queue_review($1,$2)',[A,part]);
const revealed=(await db.query('select grade_answer($1,$2,0,true,true) as a',[A,click])).rows[0].a;
assert.equal(revealed.correct,false);assert.equal(revealed.revealed,true);
const saved=(await db.query('select attempts,correct,revealed from structure_progress where user_id=$1 and structure_id=$2',[A,part])).rows[0];assert.equal(saved.revealed,1);
assert.equal((await db.query('select structure_id from review_queue where user_id=$1 and structure_id=$2',[A,part])).rows.length,0);
await db.query('select grade_answer($1,$2,0,true,false)',[A,click]);assert.equal((await db.query('select revealed from structure_progress where user_id=$1 and structure_id=$2',[A,part])).rows[0].revealed,1,'replayed reveal changed outcome');
await db.query('select queue_review($1,$2)',[A,part]);
// Recall/Function now use the same server clock and safe replacement path.
for(const format of ['recall','function']){
 const run=(await db.query("insert into quiz_runs(user_id,plan,format,timer,ready) values($1,$2,$3,30,false) returning id",[A,plan,format])).rows[0].id;
 await denied('select grade_answer($1,$2,0,true,false)',[A,run]);
 await denied('select ready_identify_question($1,$2,0)',[B,run]);
 await db.query('select replace_identify_question($1,$2,0,$3,$4)',[A,run,part,JSON.stringify({id:part2,options:[part2,part]})]);
 await db.query('select ready_identify_question($1,$2,0)',[A,run]);
 const correct=(await db.query('select grade_answer($1,$2,0,true,false) as a',[A,run])).rows[0].a;assert.equal(correct.correct,true);
 await db.query('select activate_question($1,$2,1)',[A,run]);
 await denied('select grade_answer($1,$2,1,true,false)',[A,run]);
 await db.query('select ready_identify_question($1,$2,1)',[A,run]);
 await db.query('select grade_answer($1,$2,1,true,false)',[A,run]);
}
// The new public female catalogue must satisfy the same foreign keys and RLS.
await db.exec('reset role');
assert.equal((await db.query("select count(*)::int as n from anatomy_structures where id like 'female_%'")).rows[0].n,276);
assert.equal((await db.query("select count(*)::int as n from anatomy_structures where id like 'female_%' and available")).rows[0].n,44);
assert.equal((await db.query("select count(*)::int as n from anatomy_structures where source is null or license is null")).rows[0].n,0);
assert.equal((await db.query("select source->'geometry'->>'modelId' as id from anatomy_structures where id='female_uterus'")).rows[0].id,'3DPX-020996');
const femaleId='female_uterus';
await asUser(A);await db.query('insert into bookmarks values($1,$2)',[A,femaleId]);
await asUser(B);assert.equal((await db.query('select structure_id from bookmarks where user_id=$1 and structure_id=$2',[A,femaleId])).rows.length,0);
await denied('insert into bookmarks values($1,$2)',[A,'female_ovary_l']);
await db.exec('reset role;set role service_role');
const femaleRun=(await db.query("insert into quiz_runs(user_id,plan,format,timer,ready) values($1,$2,'identify',0,false) returning id",[A,JSON.stringify([{id:femaleId,options:[femaleId,'female_bladder','female_vagina','female_cervix_of_uterus']}])])).rows[0].id;
await db.query('select ready_identify_question($1,$2,0)',[A,femaleRun]);
await db.query('select grade_answer($1,$2,0,true,false)',[A,femaleRun]);
assert.equal((await db.query('select correct from structure_progress where user_id=$1 and structure_id=$2',[A,femaleId])).rows[0].correct,1);
await asUser(B);assert.equal((await db.query('select structure_id from structure_progress where user_id=$1 and structure_id=$2',[A,femaleId])).rows.length,0);
await db.exec('reset role');
await db.query('delete from auth.users where id=$1',[A]);for(const table of tables)assert.equal((await db.query(`select user_id from ${table} where user_id=$1`,[A])).rows.length,0,`${table} did not cascade`);
assert.equal((await db.query('select count(*)::int as n from profiles where user_id=$1',[B])).rows[0].n,1);
await db.close();console.log('PASS PostgreSQL RLS: A/B/anonymous isolation, mass assignment denial, own bookmarks, grade replay, sequence, timer, female catalogue progress and account cascade.');
