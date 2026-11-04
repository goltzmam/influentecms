begin;
create table public.ad_events(
 id uuid primary key,portal_id uuid not null references public.portals(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 kind text not null check(kind in ('campaign','partner')),item_id uuid not null,item_name text not null,
 event text not null check(event in ('served','view','click','cta','video_start','video_25','video_50','video_75','video_complete','video_pause','video_seconds')),
 visitor_hash text not null,session_hash text not null,ip_hash text not null,page_view uuid not null,
 placement text not null,page_path text not null,source text not null,device text not null check(device in ('desktop','mobile','tablet')),
 value numeric not null default 0 check(value between 0 and 3600),created_at timestamptz not null default now()
);
create index ad_events_report on public.ad_events(portal_id,created_at,kind,item_id);
create index ad_events_rate on public.ad_events(portal_id,ip_hash,created_at);
create unique index ad_events_once on public.ad_events(portal_id,kind,item_id,event,visitor_hash,page_view,placement) where event in ('served','view','video_start','video_25','video_50','video_75','video_complete');
alter table public.ad_events enable row level security;
revoke all on public.ad_events from public,anon,authenticated;
grant select on public.ad_events to authenticated;grant all on public.ad_events to service_role;
create policy ad_events_read on public.ad_events for select to authenticated using(public.is_organization_owner(organization_id) or public.is_portal_editor(portal_id));
create function public.record_ad_events(p_portal uuid,p_ip text,p_events jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb;entry record;added integer:=0;current_count integer;subject uuid;subject_kind text;subject_name text;subject_org uuid;is_demo boolean;media text;etype text;
begin
 if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>12 or length(p_ip)<>64 then return 0;end if;
 if (select count(*) from public.ad_events where portal_id=p_portal and ip_hash=p_ip and created_at>now()-interval '1 minute')>600 then return 0;end if;
 for item in select value from jsonb_array_elements(p_events) loop
  subject:=(item->>'item')::uuid;subject_kind:=item->>'kind';etype:=item->>'event';subject_name:=null;
  if subject_kind='campaign' then
   select name,organization_id,coalesce(creative->>'demo','false')='true',creative->>'mediaType' into subject_name,subject_org,is_demo,media from public.campaigns where id=subject and portal_id=p_portal and active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now());
   if subject_name is null then
    select 'Google AdSense · '||coalesce(nullif(section->>'title',''),section->>'type'),p.organization_id,false,'google' into subject_name,subject_org,is_demo,media
    from public.portals p cross join lateral jsonb_array_elements(p.home_published) section cross join lateral jsonb_array_elements(coalesce(section->'adSlots','[]'::jsonb)) slot
    where p.id=p_portal and slot->>'id'=subject::text and slot->>'kind'='google' and coalesce((slot->>'enabled')::boolean,true) and coalesce((p.settings->'advertising'->>'enabled')::boolean,false) and slot->>'googleSlot'~'^\d{1,20}$' limit 1;
   end if;
  elsif subject_kind='partner' then
   select name,organization_id,coalesce(creative->>'demo','false')='true',creative->>'mediaType' into subject_name,subject_org,is_demo,media from public.partners where id=subject and portal_id=p_portal and active;
  end if;
  if subject_name is null or is_demo or (media='google' and etype in ('click','cta')) then continue;end if;
  if etype like 'video_%' and coalesce(media,'image')<>'video' then continue;end if;
  if media='google' and not exists(select 1 from public.portals where id=p_portal and coalesce((settings->'advertising'->>'enabled')::boolean,false)) then continue;end if;
  if etype in ('click','cta') and exists(select 1 from public.ad_events where portal_id=p_portal and item_id=subject and kind=subject_kind and event=etype and visitor_hash=item->>'visitor' and created_at>now()-interval '3 seconds') then continue;end if;
  insert into public.ad_events(id,portal_id,organization_id,kind,item_id,item_name,event,visitor_hash,session_hash,ip_hash,page_view,placement,page_path,source,device,value)
  values((item->>'id')::uuid,p_portal,subject_org,subject_kind,subject,subject_name,etype,item->>'visitor',item->>'session',p_ip,(item->>'pageView')::uuid,left(item->>'placement',100),left(item->>'path',300),left(item->>'source',120),item->>'device',least(3600,greatest(0,coalesce((item->>'value')::numeric,0)))) on conflict do nothing;
  get diagnostics current_count=row_count;added:=added+current_count;
 end loop;
 return added;
end;$$;
revoke all on function public.record_ad_events(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_ad_events(uuid,text,jsonb) to service_role;
create function public.ad_metrics_report(p_portal uuid,p_from timestamptz,p_until timestamptz,p_kind text default null,p_item uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.portals where id=p_portal and (public.is_organization_owner(organization_id) or public.is_portal_editor(id))) then raise exception 'Forbidden';end if;
 if p_until<=p_from or p_until-p_from>interval '181 days' then raise exception 'Invalid period';end if;
 with filtered as materialized (select * from public.ad_events where portal_id=p_portal and created_at>=p_from and created_at<p_until and (p_kind is null or kind=p_kind) and (p_item is null or item_id=p_item)),
 totals as (select count(*) filter(where event='served') as served,count(*) filter(where event='view') as views,count(*) filter(where event='click') as clicks,count(*) filter(where event='cta') as cta,count(distinct visitor_hash) filter(where event='view') as reach,count(distinct visitor_hash) filter(where event='click') as clickers,count(distinct session_hash) filter(where event='view') as sessions,count(*) filter(where event='video_start') as video_starts,count(*) filter(where event='video_25') as video25,count(*) filter(where event='video_50') as video50,count(*) filter(where event='video_75') as video75,count(*) filter(where event='video_complete') as completions,coalesce(sum(value) filter(where event='video_seconds'),0) as watch_seconds from filtered),
 daily as (select (created_at at time zone 'America/Sao_Paulo')::date as day,count(*) filter(where event='view') as views,count(*) filter(where event='click') as clicks from filtered group by 1 order by 1),
 dimensions as (select 'device' as dimension,device as label,count(*) filter(where event='view') as views,count(*) filter(where event='click') as clicks from filtered group by device union all select 'page',page_path,count(*) filter(where event='view'),count(*) filter(where event='click') from filtered group by page_path union all select 'source',source,count(*) filter(where event='view'),count(*) filter(where event='click') from filtered group by source union all select 'placement',placement,count(*) filter(where event='view'),count(*) filter(where event='click') from filtered group by placement),
 subjects as (select kind,item_id,max(item_name) as name,count(*) filter(where event='served') as served,count(*) filter(where event='view') as views,count(*) filter(where event='click') as clicks,count(distinct visitor_hash) filter(where event='view') as reach from filtered group by kind,item_id)
 select jsonb_build_object('totals',(select to_jsonb(totals) from totals),'daily',coalesce((select jsonb_agg(to_jsonb(daily)) from daily),'[]'::jsonb),'dimensions',coalesce((select jsonb_agg(to_jsonb(dimensions)) from dimensions),'[]'::jsonb),'items',coalesce((select jsonb_agg(to_jsonb(subjects)) from subjects),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.ad_metrics_report(uuid,timestamptz,timestamptz,text,uuid) from public,anon;
grant execute on function public.ad_metrics_report(uuid,timestamptz,timestamptz,text,uuid) to authenticated;
commit;
