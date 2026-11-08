begin;
create function public.resolve_portal_hostname(p_hostname text,p_base text default null) returns text language plpgsql stable security definer set search_path='' as $$
declare target uuid;ready boolean;candidate text;result text;
begin
 select portal_id,verified into target,ready from public.domains where hostname=lower(p_hostname);
 if found then
  if target is null or not ready then return null;end if;
  select slug into result from public.portals where id=target;return result;
 end if;
 if p_base is not null and p_base<>'' and right(lower(p_hostname),length(p_base)+1)='.'||lower(p_base) then
  candidate:=left(lower(p_hostname),length(p_hostname)-length(p_base)-1);
  if candidate~'^[a-z0-9]+(-[a-z0-9]+)*$' then select slug into result from public.portals where slug=candidate;return result;end if;
 end if;
 return null;
end;$$;
revoke all on function public.resolve_portal_hostname(text,text) from public;
grant execute on function public.resolve_portal_hostname(text,text) to anon,authenticated,service_role;
commit;
