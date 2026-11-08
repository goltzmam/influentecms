begin;
create table public.portal_clone_documents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 job_id uuid references public.portal_ai_jobs(id) on delete set null,
 portal_id uuid references public.portals(id) on delete cascade,
 source_url text not null,
 draft jsonb not null,
 published jsonb,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 unique(job_id), unique(portal_id),
 check(octet_length(draft::text)<=5000000),
 check(published is null or octet_length(published::text)<=5000000)
);
alter table public.portal_clone_documents enable row level security;
revoke all on public.portal_clone_documents from anon,authenticated;
grant select on public.portal_clone_documents to anon;
grant select,insert,update,delete on public.portal_clone_documents to authenticated;
grant all on public.portal_clone_documents to service_role;
create policy clone_owner on public.portal_clone_documents for all to authenticated
 using(public.is_organization_owner(organization_id)) with check(public.is_organization_owner(organization_id) and (portal_id is null or exists(select 1 from public.portals where id=portal_id and organization_id=portal_clone_documents.organization_id)));
create policy clone_editor_read on public.portal_clone_documents for select to authenticated using(public.is_portal_editor(portal_id));
create policy clone_editor_update on public.portal_clone_documents for update to authenticated using(public.is_portal_editor(portal_id)) with check(public.is_portal_editor(portal_id) and exists(select 1 from public.portals where id=portal_id and organization_id=portal_clone_documents.organization_id));
-- Drafts are never selected anonymously: expose only published documents via RPC.
revoke select on public.portal_clone_documents from anon;
create function public.get_public_clone(target uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select published from public.portal_clone_documents where portal_id=target and published is not null;
$$;
revoke all on function public.get_public_clone(uuid) from public;
grant execute on function public.get_public_clone(uuid) to anon,authenticated,service_role;
commit;
