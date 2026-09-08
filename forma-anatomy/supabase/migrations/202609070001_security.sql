begin;
-- RLS is enabled in the same transaction as creation; no table is exposed first.
create table public.anatomy_structures (
 id text primary key check(length(id) between 1 and 160),
 display_name text not null check(length(display_name)<=240),
 system text not null, region text not null
);
alter table public.anatomy_structures enable row level security;
create policy public_anatomy_read on public.anatomy_structures for select to anon,authenticated using(true);
revoke all on public.anatomy_structures from anon,authenticated;
grant select on public.anatomy_structures to anon,authenticated;
grant all on public.anatomy_structures to service_role;

create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text check(length(email)<=320),
 display_name text not null check(length(display_name)<=120),
 avatar_url text check(length(avatar_url)<=2048 and avatar_url ~ '^https://lh[0-9]+\.googleusercontent\.com/')
);
alter table public.profiles enable row level security;
create table public.bookmarks (
 user_id uuid not null references auth.users(id) on delete cascade,
 structure_id text not null references public.anatomy_structures(id),
 primary key(user_id,structure_id)
);
alter table public.bookmarks enable row level security;
create table public.structure_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 structure_id text not null references public.anatomy_structures(id),
 attempts integer not null default 0 check(attempts>=0),
 correct integer not null default 0 check(correct>=0 and correct<=attempts),
 run integer not null default 0 check(run>=0 and run<=correct),
 due timestamptz not null default now(), last timestamptz not null default now(),
 primary key(user_id,structure_id)
);
alter table public.structure_progress enable row level security;
create table public.study_days (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, primary key(user_id,day)
);
alter table public.study_days enable row level security;
create table public.quiz_runs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 plan jsonb not null check(jsonb_typeof(plan)='array' and jsonb_array_length(plan) between 1 and 50),
 format text not null check(format in ('click','identify','recall','function')),
 timer integer not null check(timer in (0,30,60)),
 cursor integer not null default 0 check(cursor between 0 and 49),
 active_at timestamptz not null default now(),
 answers jsonb not null default '[]'::jsonb check(jsonb_typeof(answers)='array' and jsonb_array_length(answers)<=50),
 created_at timestamptz not null default now()
);
alter table public.quiz_runs enable row level security;
create index quiz_runs_owner on public.quiz_runs(user_id);
-- Dynamic identifiers below are a fixed migration-owned list, never user input.
do $$declare t text;begin
 foreach t in array array['profiles','bookmarks','structure_progress','study_days','quiz_runs'] loop
  execute format('create policy own_select on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
  execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id=(select auth.uid()))',t);
  execute format('create policy own_update on public.%I for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))',t);
  execute format('create policy own_delete on public.%I for delete to authenticated using (user_id=(select auth.uid()))',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end$$;
-- Only bookmarks are user-writable. Scores, profiles and quiz issuance use
-- narrowly scoped, server-only operations, even with a valid user JWT.
grant insert,delete on public.bookmarks to authenticated;

create function public.create_google_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'provider' is distinct from 'google' then
  raise exception 'Google identity required' using errcode='42501';
 end if;
 insert into public.profiles(user_id,email,display_name,avatar_url)
 values(new.id,left(new.email,320),left(coalesce(new.raw_user_meta_data->>'full_name','Student'),120),
 case when new.raw_user_meta_data->>'avatar_url' ~ '^https://lh[0-9]+\.googleusercontent\.com/' then left(new.raw_user_meta_data->>'avatar_url',2048) else null end);
 return new;
end$$;
revoke all on function public.create_google_profile() from public,anon,authenticated;
create trigger on_google_user_created after insert on auth.users for each row execute function public.create_google_profile();

create function public.grade_answer(p_user_id uuid,p_quiz_id uuid,p_index integer,p_correct boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype; part text; ok boolean; t timestamptz:=clock_timestamp(); result jsonb;
begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or p_index<0 or p_index>=jsonb_array_length(q.plan) then raise exception 'Invalid quiz' using errcode='22023'; end if;
 if p_index<jsonb_array_length(q.answers) then return q.answers->p_index; end if;
 if q.created_at<t-interval '24 hours' or not q.ready or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) then raise exception 'Inactive question' using errcode='22023'; end if;
 part:=q.plan->p_index->>'id';
 ok:=p_correct and (q.timer=0 or t<=q.active_at+make_interval(secs=>q.timer));
 insert into public.structure_progress as s(user_id,structure_id,attempts,correct,run,due,last)
 values(p_user_id,part,1,ok::integer,ok::integer,case when ok then t+interval '1 day' else t end,t)
 on conflict(user_id,structure_id) do update set
 attempts=s.attempts+1, correct=s.correct+ok::integer, run=case when ok then s.run+1 else 0 end,
 due=case when ok then t+make_interval(days=>(array[1,3,7,14,30])[least(s.run+1,5)]) else t end,last=t;
 insert into public.study_days(user_id,day) values(p_user_id,(t at time zone 'UTC')::date) on conflict do nothing;
 result:=jsonb_build_object('id',part,'correct',ok);
 update public.quiz_runs set answers=answers||jsonb_build_array(result) where id=q.id;
 return result;
end$$;
revoke all on function public.grade_answer(uuid,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function public.grade_answer(uuid,uuid,integer,boolean) to service_role;

create function public.activate_question(p_user_id uuid,p_quiz_id uuid,p_index integer)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;t timestamptz:=clock_timestamp();begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.created_at<t-interval '24 hours' or p_index<0 or p_index>=jsonb_array_length(q.plan) then raise exception 'Invalid quiz' using errcode='22023';end if;
 if q.cursor=p_index and p_index=jsonb_array_length(q.answers) then return q.active_at;end if;
 if p_index<>q.cursor+1 or p_index<>jsonb_array_length(q.answers) then raise exception 'Invalid sequence' using errcode='22023';end if;
 update public.quiz_runs set cursor=p_index,active_at=t,ready=(q.format<>'identify') where id=q.id;
 return t;
end$$;
revoke all on function public.activate_question(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.activate_question(uuid,uuid,integer) to service_role;
commit;
