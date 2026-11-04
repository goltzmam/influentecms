begin;
alter table public.portals drop constraint portals_template_check;
alter table public.portals add constraint portals_template_check check(template in ('classic','modern','daily'));
create table public.portal_editors(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,portal_id uuid not null,
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 254),
 user_id uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),unique(portal_id,email),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
alter table public.portal_editors enable row level security;
revoke all on public.portal_editors from anon,authenticated;
grant select,insert,delete on public.portal_editors to authenticated;
grant all on public.portal_editors to service_role;
create function public.is_portal_editor(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_editors where portal_id=target and user_id=auth.uid());
$$;
revoke all on function public.is_portal_editor(uuid) from public,anon;
grant execute on function public.is_portal_editor(uuid) to authenticated;
create policy editors_read on public.portal_editors for select to authenticated using(public.is_organization_owner(organization_id) or user_id=auth.uid());
create policy editors_add on public.portal_editors for insert to authenticated with check(public.is_organization_owner(organization_id) and user_id is null);
create policy editors_remove on public.portal_editors for delete to authenticated using(public.is_organization_owner(organization_id));
create function public.claim_portal_invitations() returns void language plpgsql security definer set search_path='' as $$
declare mail text;begin
 mail:=lower(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'email',''));
 if auth.uid() is null or mail='' then return;end if;
 update public.portal_editors set user_id=auth.uid() where email=mail and (user_id is null or user_id=auth.uid());
end;$$;
revoke all on function public.claim_portal_invitations() from public,anon;
grant execute on function public.claim_portal_invitations() to authenticated;
create policy editors_portal_update on public.portals for update to authenticated using(public.is_portal_editor(id)) with check(public.is_portal_editor(id));
do $$declare t text;begin
 foreach t in array array['categories','articles','media','campaigns','partners','pages','domains'] loop
  execute format('create policy editor_read on public.%I for select to authenticated using(public.is_portal_editor(portal_id))',t);
  execute format('create policy editor_insert on public.%I for insert to authenticated with check(public.is_portal_editor(portal_id))',t);
  execute format('create policy editor_delete on public.%I for delete to authenticated using(public.is_portal_editor(portal_id))',t);
  if t<>'domains' then execute format('create policy editor_update on public.%I for update to authenticated using(public.is_portal_editor(portal_id)) with check(public.is_portal_editor(portal_id))',t);end if;
 end loop;
end;$$;
create or replace function public.get_home_draft(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 select home_draft into result from public.portals where id=target and (public.is_organization_owner(organization_id) or public.is_portal_editor(id));
 if not found then raise exception 'Forbidden';end if;return result;
end;$$;
create policy editor_media_insert on storage.objects for insert to authenticated with check(bucket_id='portal-media' and exists(select 1 from public.portals p where p.organization_id::text=(storage.foldername(storage.objects.name))[1] and p.id::text=(storage.foldername(storage.objects.name))[2] and public.is_portal_editor(p.id)));
create policy editor_media_read on storage.objects for select to authenticated using(bucket_id='portal-media' and exists(select 1 from public.portals p where p.organization_id::text=(storage.foldername(storage.objects.name))[1] and p.id::text=(storage.foldername(storage.objects.name))[2] and public.is_portal_editor(p.id)));
create policy editor_media_delete on storage.objects for delete to authenticated using(bucket_id='portal-media' and exists(select 1 from public.portals p where p.organization_id::text=(storage.foldername(storage.objects.name))[1] and p.id::text=(storage.foldername(storage.objects.name))[2] and public.is_portal_editor(p.id)));
create policy editor_contacts on public.portal_contacts for select to authenticated using(public.is_portal_editor(portal_id));
create policy editor_contacts_delete on public.portal_contacts for delete to authenticated using(public.is_portal_editor(portal_id));
create policy editor_subscribers on public.portal_subscribers for select to authenticated using(public.is_portal_editor(portal_id));
create policy editor_subscribers_delete on public.portal_subscribers for delete to authenticated using(public.is_portal_editor(portal_id));
commit;
