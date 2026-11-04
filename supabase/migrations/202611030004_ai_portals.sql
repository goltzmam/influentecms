begin;
create table public.portal_ai_jobs(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,brief text not null check(length(brief) between 20 and 5000),reference_urls text[] not null default '{}',
 status text not null default 'generating' check(status in ('generating','ready','failed','created')),
 plan jsonb,model text,reference_results jsonb not null default '[]',warnings jsonb not null default '[]',
 generated_portal_id uuid references public.portals(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(cardinality(reference_urls)<=3)
);
create index ai_jobs_org_date on public.portal_ai_jobs(organization_id,created_at);
alter table public.portal_ai_jobs enable row level security;
revoke all on public.portal_ai_jobs from anon,authenticated;
grant select on public.portal_ai_jobs to authenticated;
grant all on public.portal_ai_jobs to service_role;
create policy owner_ai_jobs on public.portal_ai_jobs for select to authenticated using(public.is_organization_owner(organization_id));
create function public.start_portal_ai_job(p_organization uuid,p_brief text,p_references text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare job uuid;begin
 if not public.is_organization_owner(p_organization) then raise exception 'ai_forbidden';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_organization::text,4));
 if (select count(*) from public.portal_ai_jobs where organization_id=p_organization and created_at>now()-interval '1 hour')>=5 then raise exception 'ai_rate_limit';end if;
 if exists(select 1 from public.portal_ai_jobs where organization_id=p_organization and status='generating' and created_at>now()-interval '5 minutes') then raise exception 'ai_busy';end if;
 insert into public.portal_ai_jobs(organization_id,user_id,brief,reference_urls) values(p_organization,auth.uid(),p_brief,coalesce(p_references,'{}')) returning id into job;return job;
end;$$;
create function public.finish_portal_ai_job(p_job uuid,p_plan jsonb,p_model text,p_references jsonb,p_warnings jsonb,p_failed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_plan is not null and octet_length(p_plan::text)>300000 then raise exception 'ai_plan_too_large';end if;
 update public.portal_ai_jobs set status=case when p_failed then 'failed' else 'ready' end,plan=p_plan,model=p_model,reference_results=coalesce(p_references,'[]'),warnings=coalesce(p_warnings,'[]'),updated_at=now()
 where id=p_job and user_id=auth.uid() and public.is_organization_owner(organization_id) and status='generating';
 if not found then raise exception 'ai_job_unavailable';end if;
end;$$;
create function public.create_portal_from_ai(p_job uuid,p_plan jsonb,p_publish_articles boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare job public.portal_ai_jobs;portal uuid;item jsonb;cat uuid;mapping jsonb:='{}';sections jsonb:='[]';normalized jsonb;settings jsonb;
begin
 select * into job from public.portal_ai_jobs where id=p_job for update;
 if not found or job.user_id<>auth.uid() or not public.is_organization_owner(job.organization_id) then raise exception 'ai_forbidden';end if;
 if job.status='created' then
  if job.generated_portal_id is null then raise exception 'ai_portal_deleted';end if;return job.generated_portal_id;
 end if;
 if job.status<>'ready' then raise exception 'ai_job_not_ready';end if;
 if p_plan is null or octet_length(p_plan::text)>300000 or jsonb_typeof(p_plan)<>'object' or coalesce(jsonb_typeof(p_plan->'categories'),'null')<>'array' or coalesce(jsonb_typeof(p_plan->'sections'),'null')<>'array' or coalesce(jsonb_typeof(p_plan->'pages'),'null')<>'array' or coalesce(jsonb_typeof(p_plan->'articles'),'null')<>'array' or jsonb_array_length(p_plan->'categories') not between 2 and 8 or jsonb_array_length(p_plan->'sections') not between 3 and 18 or jsonb_array_length(p_plan->'pages')>5 or jsonb_array_length(p_plan->'articles')>6 then raise exception 'ai_invalid_plan';end if;
 settings:=p_plan->'settings';
 insert into public.portals(organization_id,name,slug,template,settings) values(job.organization_id,p_plan->>'name',p_plan->>'slug',p_plan->>'template',settings) returning id into portal;
 for item in select value from jsonb_array_elements(p_plan->'categories') loop
  insert into public.categories(organization_id,portal_id,name,slug) values(job.organization_id,portal,item->>'name',item->>'slug') returning id into cat;
  mapping:=mapping||jsonb_build_object(item->>'slug',cat);
 end loop;
 for item in select value from jsonb_array_elements(p_plan->'sections') loop
  normalized:=(item-'categorySlug')||jsonb_build_object('id',gen_random_uuid());
  if item->>'type'='category' then
   if not mapping ? (item->>'categorySlug') then raise exception 'ai_invalid_category';end if;
   normalized:=normalized||jsonb_build_object('categoryId',mapping->>(item->>'categorySlug'));
  end if;
  sections:=sections||jsonb_build_array(normalized);
 end loop;
 update public.portals set home_draft=sections,home_published=sections where id=portal;
 for item in select value from jsonb_array_elements(p_plan->'pages') loop
  insert into public.pages(organization_id,portal_id,title,slug,content,published) values(job.organization_id,portal,item->>'title',item->>'slug',item->>'content',coalesce((item->>'published')::boolean,false));
 end loop;
 for item in select value from jsonb_array_elements(p_plan->'articles') loop
  if not mapping ? (item->>'categorySlug') then raise exception 'ai_invalid_category';end if;
  insert into public.articles(organization_id,portal_id,title,slug,subtitle,content,author,cover_url,cover_alt,tags,category_id,seo_title,seo_description,status,publish_at)
  values(job.organization_id,portal,item->>'title',item->>'slug',item->>'subtitle',item->>'content','Redação',coalesce(item->>'cover_url',''),coalesce(item->>'cover_alt',''),array(select jsonb_array_elements_text(item->'tags')),(mapping->>(item->>'categorySlug'))::uuid,item->>'seoTitle',item->>'seoDescription',case when p_publish_articles then 'published' else 'draft' end,case when p_publish_articles then now() else null end);
 end loop;
 update public.portal_ai_jobs set status='created',generated_portal_id=portal,updated_at=now() where id=p_job;
 return portal;
end;$$;
revoke all on function public.start_portal_ai_job(uuid,text,text[]) from public,anon;
revoke all on function public.finish_portal_ai_job(uuid,jsonb,text,jsonb,jsonb,boolean) from public,anon;
revoke all on function public.create_portal_from_ai(uuid,jsonb,boolean) from public,anon;
grant execute on function public.start_portal_ai_job(uuid,text,text[]) to authenticated;
grant execute on function public.finish_portal_ai_job(uuid,jsonb,text,jsonb,jsonb,boolean) to authenticated;
grant execute on function public.create_portal_from_ai(uuid,jsonb,boolean) to authenticated;
commit;
