begin;
-- Infrastructure failures do not consume the portal generation allowance.
create or replace function public.start_portal_ai_job(p_organization uuid,p_brief text,p_references text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare job uuid;begin
 if not public.is_organization_owner(p_organization) then raise exception 'ai_forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_organization::text,4));
 if (select count(*) from public.portal_ai_jobs where organization_id=p_organization and created_at>now()-interval '1 hour' and not (status='failed' and warnings ?| array['provider_error','provider_timeout','provider_model']))>=5 then raise exception 'ai_rate_limit';end if;
 if exists(select 1 from public.portal_ai_jobs where organization_id=p_organization and status='generating' and created_at>now()-interval '5 minutes') then raise exception 'ai_busy';end if;
 insert into public.portal_ai_jobs(organization_id,user_id,brief,reference_urls) values(p_organization,auth.uid(),p_brief,coalesce(p_references,'{}')) returning id into job;return job;
end;$$;

commit;
