begin;
alter table public.quiz_runs add column ready boolean not null default true;
alter table public.quiz_runs add column skipped text[] not null default '{}';
create function public.ready_identify_question(p_user_id uuid,p_quiz_id uuid,p_index integer) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;t timestamptz:=clock_timestamp();begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.format<>'identify' or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) or q.created_at<t-interval '24 hours' then raise exception 'Invalid question' using errcode='22023';end if;
 if q.ready then return q.active_at;end if;
 update public.quiz_runs set ready=true,active_at=t where id=q.id;return t;
end$$;
revoke all on function public.ready_identify_question(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.ready_identify_question(uuid,uuid,integer) to service_role;
create function public.replace_identify_question(p_user_id uuid,p_quiz_id uuid,p_index integer,p_expected text,p_question jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare q public.quiz_runs%rowtype;begin
 select * into q from public.quiz_runs where id=p_quiz_id and user_id=p_user_id for update;
 if not found or q.format<>'identify' or q.cursor<>p_index or p_index<>jsonb_array_length(q.answers) or q.plan->p_index->>'id'<>p_expected or cardinality(q.skipped)>=20 or q.created_at<now()-interval '24 hours' then raise exception 'Invalid question' using errcode='22023';end if;
 update public.quiz_runs set plan=jsonb_set(plan,array[p_index::text],p_question),skipped=array_append(skipped,p_expected),ready=false where id=q.id;
end$$;
revoke all on function public.replace_identify_question(uuid,uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.replace_identify_question(uuid,uuid,integer,text,jsonb) to service_role;
commit;
