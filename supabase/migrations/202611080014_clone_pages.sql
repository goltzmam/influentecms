begin;
alter table public.portal_clone_documents add column catalog_initialized boolean not null default false;
create table public.portal_clone_pages(
 id uuid primary key default gen_random_uuid(),portal_id uuid not null references public.portals(id) on delete cascade,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 source_url text not null,path text not null,title text not null default '',kind text not null default 'page' check(kind in ('page','sitemap')),
 status text not null default 'pending' check(status in ('pending','processing','ready','failed')),
 draft jsonb,published jsonb,revision integer not null default 1,attempts integer not null default 0,
 updated_at timestamptz not null default now(),unique(portal_id,path),check(length(path)<=1500),
 check(draft is null or octet_length(draft::text)<=5000000),check(published is null or octet_length(published::text)<=5000000)
);
create index clone_pages_queue on public.portal_clone_pages(portal_id,status,updated_at);
alter table public.portal_clone_pages enable row level security;
revoke all on public.portal_clone_pages from anon,authenticated;
grant select,insert,update,delete on public.portal_clone_pages to authenticated;grant all on public.portal_clone_pages to service_role;
create policy clone_pages_access on public.portal_clone_pages for all to authenticated
 using(public.is_organization_owner(organization_id) or public.is_portal_editor(portal_id))
 with check((public.is_organization_owner(organization_id) or public.is_portal_editor(portal_id)) and exists(select 1 from public.portals p where p.id=portal_id and p.organization_id=portal_clone_pages.organization_id));
create function public.get_public_clone_page(target uuid,page_path text) returns jsonb language sql stable security definer set search_path='' as $$
 select published from public.portal_clone_pages where portal_id=target and path=page_path and kind='page' and published is not null;
$$;
revoke all on function public.get_public_clone_page(uuid,text) from public;grant execute on function public.get_public_clone_page(uuid,text) to anon,authenticated,service_role;
create function public.claim_clone_pages(target uuid,page_limit integer default 2,only_path text default null) returns setof public.portal_clone_pages language plpgsql security definer set search_path='' as $$
declare room integer;
begin
 perform pg_advisory_xact_lock(hashtext(target::text));
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' and not exists(select 1 from public.portals p where p.id=target and (public.is_organization_owner(p.organization_id) or public.is_portal_editor(p.id))) then raise exception 'not_allowed';end if;
 select 4-count(*) into room from public.portal_clone_pages where portal_id=target and status='processing' and updated_at>now()-interval '5 minutes';if room<=0 then return;end if;
 return query update public.portal_clone_pages set status='processing',attempts=attempts+1,updated_at=now() where id in (
 select id from public.portal_clone_pages where portal_id=target and (only_path is null or path=only_path) and (status='pending' or (status='processing' and updated_at<now()-interval '5 minutes')) order by case when kind='sitemap' then 0 else 1 end,attempts,updated_at for update skip locked limit greatest(1,least(page_limit,3,room))) returning *;
end;$$;
revoke all on function public.claim_clone_pages(uuid,integer,text) from public,anon;grant execute on function public.claim_clone_pages(uuid,integer,text) to authenticated,service_role;
commit;
