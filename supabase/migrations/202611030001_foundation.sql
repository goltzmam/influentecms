begin;
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 created_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'owner' check(role = 'owner'),
 primary key(organization_id,user_id), unique(user_id)
);
create table public.portals (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=63),
 template text not null default 'classic' check(template in ('classic','modern')),
 created_at timestamptz not null default now(),
 unique(organization_id,id)
);
create index portals_organization_idx on public.portals(organization_id);
create function public.is_organization_owner(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.organization_members where organization_id=target and user_id=(select auth.uid()) and role='owner');
$$;
revoke all on function public.is_organization_owner(uuid) from public,anon;
grant execute on function public.is_organization_owner(uuid) to authenticated;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.portals enable row level security;
revoke all on public.organizations,public.organization_members,public.portals from anon,authenticated;
grant select on public.organizations,public.organization_members to authenticated;
grant select,insert,update,delete on public.portals to authenticated;
create policy organizations_read on public.organizations for select to authenticated using(public.is_organization_owner(id));
create policy membership_read on public.organization_members for select to authenticated using(user_id=(select auth.uid()));
create policy portals_read on public.portals for select to authenticated using(public.is_organization_owner(organization_id));
create policy portals_insert on public.portals for insert to authenticated with check(public.is_organization_owner(organization_id));
create policy portals_update on public.portals for update to authenticated using(public.is_organization_owner(organization_id)) with check(public.is_organization_owner(organization_id));
create policy portals_delete on public.portals for delete to authenticated using(public.is_organization_owner(organization_id));
create function public.provision_owner(owner_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare workspace_id uuid;
begin
 perform pg_advisory_xact_lock(817432);
 select organization_id into workspace_id from public.organization_members where user_id=owner_id;
 if workspace_id is not null then return workspace_id; end if;
 if exists(select 1 from public.organizations) then raise exception 'Organização já provisionada'; end if;
 insert into public.organizations(name) values('Influente Comunicação') returning id into workspace_id;
 insert into public.organization_members(organization_id,user_id) values(workspace_id,owner_id);
 return workspace_id;
end;
$$;
revoke all on function public.provision_owner(uuid) from public,anon,authenticated;
grant execute on function public.provision_owner(uuid) to service_role;
commit;
