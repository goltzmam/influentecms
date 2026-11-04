begin;
alter table public.portal_ai_jobs add column visual_status text not null default 'pending' check(visual_status in ('pending','processing','ready','failed'));
alter table public.portal_ai_jobs add column visual_started_at timestamptz;
create function public.claim_ai_visuals(p_job uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.portal_ai_jobs set visual_status='processing',visual_started_at=now() where id=p_job and user_id=auth.uid() and public.is_organization_owner(organization_id) and status='created' and generated_portal_id is not null and (visual_status in ('pending','failed') or (visual_status='processing' and visual_started_at<now()-interval '5 minutes'));
 return found;
end;$$;
create function public.finish_ai_visuals(p_job uuid,p_ready boolean,p_warnings jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.portal_ai_jobs set visual_status=case when p_ready then 'ready' else 'failed' end,warnings=coalesce(p_warnings,'[]'::jsonb),updated_at=now() where id=p_job and user_id=auth.uid() and public.is_organization_owner(organization_id) and visual_status='processing';
 if not found then raise exception 'ai_visual_job_unavailable';end if;
end;$$;
revoke all on function public.claim_ai_visuals(uuid),public.finish_ai_visuals(uuid,boolean,jsonb) from public,anon;
grant execute on function public.claim_ai_visuals(uuid),public.finish_ai_visuals(uuid,boolean,jsonb) to authenticated;
commit;
