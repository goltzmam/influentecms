begin;
alter table public.portals add column design_draft jsonb;
create function public.get_home_design(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 select design_draft into result from public.portals where id=target and (public.is_organization_owner(organization_id) or public.is_portal_editor(id));
 if not found then raise exception 'Forbidden';end if;return result;
end;$$;
revoke all on function public.get_home_design(uuid) from public,anon;
grant execute on function public.get_home_design(uuid) to authenticated;
commit;
