begin;
alter table public.campaigns drop constraint campaigns_position_check;
alter table public.campaigns add constraint campaigns_position_check check(position in ('header','sidebar','footer','between','category','sponsored'));
create table public.portal_contacts(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,portal_id uuid not null,
 name text not null,email text not null,phone text not null default '',address text not null default '',neighborhood text not null default '',
 subject text not null,kind text not null,message text not null,created_at timestamptz not null default now(),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.portal_subscribers(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,portal_id uuid not null,
 email text not null,created_at timestamptz not null default now(),unique(portal_id,email),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create index contacts_portal_date on public.portal_contacts(portal_id,created_at);
create index subscribers_portal_date on public.portal_subscribers(portal_id,created_at);
alter table public.portal_contacts enable row level security;
alter table public.portal_subscribers enable row level security;
revoke all on public.portal_contacts,public.portal_subscribers from anon,authenticated;
grant select,delete on public.portal_contacts,public.portal_subscribers to authenticated;
grant all on public.portal_contacts,public.portal_subscribers to service_role;
create policy owner_contacts on public.portal_contacts for select to authenticated using(public.is_organization_owner(organization_id));
create policy owner_contacts_delete on public.portal_contacts for delete to authenticated using(public.is_organization_owner(organization_id));
create policy owner_subscribers on public.portal_subscribers for select to authenticated using(public.is_organization_owner(organization_id));
create policy owner_subscribers_delete on public.portal_subscribers for delete to authenticated using(public.is_organization_owner(organization_id));
create function public.submit_portal_contact(p_portal uuid,p_name text,p_email text,p_phone text,p_address text,p_neighborhood text,p_subject text,p_kind text,p_message text)
returns void language plpgsql security definer set search_path='' as $$
declare org uuid; begin
 select organization_id into org from public.portals where id=p_portal and coalesce((settings->>'contactEnabled')::boolean,true);
 if org is null then raise exception 'Unavailable'; end if;
 if length(trim(p_name)) not between 2 and 120 or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(p_phone)>50 or length(p_address)>300 or length(p_neighborhood)>100 or length(trim(p_subject)) not between 1 and 160 or p_kind not in ('Sugestão','Elogio','Crítica','Outro') or length(trim(p_message)) not between 10 and 5000 then raise exception 'Invalid input'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_portal::text,0));
 if (select count(*) from public.portal_contacts where portal_id=p_portal and created_at>now()-interval '1 hour' and email=lower(trim(p_email)))>=3 or (select count(*) from public.portal_contacts where portal_id=p_portal and created_at>now()-interval '1 hour')>=100 then raise exception 'Rate limited';end if;
 insert into public.portal_contacts(organization_id,portal_id,name,email,phone,address,neighborhood,subject,kind,message) values(org,p_portal,trim(p_name),lower(trim(p_email)),p_phone,p_address,p_neighborhood,p_subject,p_kind,p_message);
end;$$;
create function public.subscribe_portal(p_portal uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$
declare org uuid;begin
 select organization_id into org from public.portals where id=p_portal and coalesce((settings->>'newsletterEnabled')::boolean,true);
 if org is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'Invalid input';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_portal::text,1));
 if (select count(*) from public.portal_subscribers where portal_id=p_portal and created_at>now()-interval '1 hour')>=100 then raise exception 'Rate limited';end if;
 insert into public.portal_subscribers(organization_id,portal_id,email) values(org,p_portal,lower(trim(p_email))) on conflict(portal_id,email) do nothing;
end;$$;
revoke all on function public.submit_portal_contact(uuid,text,text,text,text,text,text,text,text) from public;
revoke all on function public.subscribe_portal(uuid,text) from public;
grant execute on function public.submit_portal_contact(uuid,text,text,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.subscribe_portal(uuid,text) to anon,authenticated;
commit;
