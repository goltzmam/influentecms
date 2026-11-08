begin;
alter table public.domains drop constraint domains_organization_id_portal_id_fkey;
alter table public.domains alter column portal_id drop not null;
alter table public.domains add constraint domains_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete cascade;
alter table public.domains add constraint domains_organization_id_portal_id_fkey foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete set null(portal_id);
create index domains_registry on public.domains(organization_id,portal_id,created_at);
drop policy public_domains on public.domains;
create policy public_domains on public.domains for select to anon,authenticated using(verified and portal_id is not null);
create function public.assign_portal_domain(p_domain uuid,p_portal uuid default null,p_transfer boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare d public.domains;
begin
 select * into d from public.domains where id=p_domain for update;
 if not found or not public.is_organization_owner(d.organization_id) then raise exception 'domain_unavailable';end if;
 if p_portal is not null and not exists(select 1 from public.portals where id=p_portal and organization_id=d.organization_id) then raise exception 'portal_unavailable';end if;
 if d.portal_id is not null and p_portal is not null and d.portal_id<>p_portal and not p_transfer then raise exception 'domain_in_use';end if;
 update public.domains set portal_id=p_portal where id=p_domain;
end;$$;
create function public.release_portal_domain(p_domain uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.domains;
begin
 select * into d from public.domains where id=p_domain for update;
 if not found or not (public.is_organization_owner(d.organization_id) or (d.portal_id is not null and public.is_portal_editor(d.portal_id))) then raise exception 'domain_unavailable';end if;
 update public.domains set portal_id=null where id=p_domain;
end;$$;
create function public.create_portal_with_domain(p_name text,p_slug text,p_template text,p_settings jsonb,p_domain uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid;portal uuid;
begin
 select organization_id into org from public.organization_members where user_id=auth.uid() and role='owner';
 if org is null then raise exception 'owner_required';end if;
 insert into public.portals(organization_id,name,slug,template,settings) values(org,p_name,p_slug,p_template,p_settings) returning id into portal;
 if p_domain is not null then perform public.assign_portal_domain(p_domain,portal,false);end if;
 return portal;
end;$$;
create function public.create_ai_portal_with_domain(p_job uuid,p_plan jsonb,p_publish_articles boolean default false,p_domain uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare portal uuid;
begin
 portal:=public.create_portal_from_ai(p_job,p_plan,p_publish_articles);
 if p_domain is not null then perform public.assign_portal_domain(p_domain,portal,false);end if;
 return portal;
end;$$;
revoke all on function public.assign_portal_domain(uuid,uuid,boolean),public.release_portal_domain(uuid),public.create_portal_with_domain(text,text,text,jsonb,uuid),public.create_ai_portal_with_domain(uuid,jsonb,boolean,uuid) from public,anon;
grant execute on function public.assign_portal_domain(uuid,uuid,boolean),public.release_portal_domain(uuid),public.create_portal_with_domain(text,text,text,jsonb,uuid),public.create_ai_portal_with_domain(uuid,jsonb,boolean,uuid) to authenticated;
commit;
