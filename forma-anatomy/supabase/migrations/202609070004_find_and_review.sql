begin;
create table public.review_queue (
 user_id uuid not null references auth.users(id) on delete cascade,
 structure_id text not null references public.anatomy_structures(id),
 primary key(user_id,structure_id)
);
alter table public.review_queue enable row level security;
create policy own_select on public.review_queue for select to authenticated using(user_id=(select auth.uid()));
create policy own_insert on public.review_queue for insert to authenticated with check(user_id=(select auth.uid()));
create policy own_update on public.review_queue for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_delete on public.review_queue for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.review_queue from anon,authenticated;
grant select on public.review_queue to authenticated;
grant all on public.review_queue to service_role;
alter table public.structure_progress add column revealed integer not null default 0 check(revealed>=0 and revealed+correct<=attempts);
alter table public.quiz_runs add column click_difficulty text not null default 'beginner' check(click_difficulty in ('beginner','advanced'));
-- Replace the old signature rather than accidentally exposing an ambiguous overload.
drop function public.grade_answer(uuid,uuid,integer,boolean);
create function public.grade_answer(p_user_id uuid,p_quiz_id uuid,p_index integer,p_correct boolean,p_revealed boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype; part text; ok boolean; was_revealed boolean; t timestamptz:=clock_timestamp(); result jsonb;
begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or p_index<0 or p_index>=jsonb_array_length(q.plan) then raise exception 'Invalid quiz' using errcode='22023'; end if;
 if p_index<jsonb_array_length(q.answers) then return q.answers->p_index; end if;
 if q.created_at<t-interval '24 hours' or not q.ready or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) then raise exception 'Inactive question' using errcode='22023'; end if;
 part:=q.plan->p_index->>'id';
 was_revealed:=p_revealed and q.format='click';
 ok:=p_correct and not was_revealed and (q.timer=0 or t<=q.active_at+make_interval(secs=>q.timer));
 insert into public.structure_progress as s(user_id,structure_id,attempts,correct,revealed,run,due,last)
 values(p_user_id,part,1,ok::integer,was_revealed::integer,ok::integer,case when ok then t+interval '1 day' else t end,t)
 on conflict(user_id,structure_id) do update set
 attempts=s.attempts+1, correct=s.correct+ok::integer, revealed=s.revealed+was_revealed::integer, run=case when ok then s.run+1 else 0 end,
 due=case when ok then t+make_interval(days=>(array[1,3,7,14,30])[least(s.run+1,5)]) else t end,last=t;
 delete from public.review_queue where user_id=p_user_id and structure_id=part;
 insert into public.study_days(user_id,day) values(p_user_id,(t at time zone 'UTC')::date) on conflict do nothing;
 result:=jsonb_build_object('id',part,'correct',ok,'revealed',was_revealed);
 update public.quiz_runs set answers=answers||jsonb_build_array(result) where id=q.id;
 return result;
end$$;
revoke all on function public.grade_answer(uuid,uuid,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.grade_answer(uuid,uuid,integer,boolean,boolean) to service_role;

create or replace function public.activate_question(p_user_id uuid,p_quiz_id uuid,p_index integer)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;t timestamptz:=clock_timestamp();begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.created_at<t-interval '24 hours' or p_index<0 or p_index>=jsonb_array_length(q.plan) then raise exception 'Invalid quiz' using errcode='22023';end if;
 if q.cursor=p_index and p_index=jsonb_array_length(q.answers) then return q.active_at;end if;
 if p_index<>q.cursor+1 or p_index<>jsonb_array_length(q.answers) then raise exception 'Invalid sequence' using errcode='22023';end if;
 update public.quiz_runs set cursor=p_index,active_at=t,ready=(q.format not in ('identify','click')) where id=q.id;
 return t;
end$$;
revoke all on function public.activate_question(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.activate_question(uuid,uuid,integer) to service_role;

create or replace function public.ready_identify_question(p_user_id uuid,p_quiz_id uuid,p_index integer) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;t timestamptz:=clock_timestamp();begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.format not in ('identify','click') or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) or q.created_at<t-interval '24 hours' then raise exception 'Invalid question' using errcode='22023';end if;
 if q.ready then return q.active_at;end if;
 update public.quiz_runs set ready=true,active_at=t where id=q.id;return t;
end$$;
revoke all on function public.ready_identify_question(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.ready_identify_question(uuid,uuid,integer) to service_role;
create or replace function public.replace_identify_question(p_user_id uuid,p_quiz_id uuid,p_index integer,p_expected text,p_question jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.format not in ('identify','click') or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) or q.plan->p_index->>'id'<>p_expected or cardinality(q.skipped)>=20 or q.created_at<now()-interval '24 hours' then raise exception 'Invalid question' using errcode='22023';end if;
 update public.quiz_runs set plan=jsonb_set(plan,array[p_index::text],p_question),skipped=array_append(skipped,p_expected),ready=false where id=q.id;
end$$;
revoke all on function public.replace_identify_question(uuid,uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.replace_identify_question(uuid,uuid,integer,text,jsonb) to service_role;

-- A bookmark and a review request commit together. Neither edits earned scores.
create function public.queue_review(p_user_id uuid,p_structure_id text) returns void
language plpgsql security definer set search_path='' as $$begin
 insert into public.bookmarks(user_id,structure_id) values(p_user_id,p_structure_id) on conflict do nothing;
 insert into public.review_queue(user_id,structure_id) values(p_user_id,p_structure_id) on conflict do nothing;
end$$;
revoke all on function public.queue_review(uuid,text) from public,anon,authenticated;
grant execute on function public.queue_review(uuid,text) to service_role;
commit;
