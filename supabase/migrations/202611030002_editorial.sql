begin;
alter table public.portals add column settings jsonb not null default '{}'::jsonb;
alter table public.portals add column home_draft jsonb not null default '[]'::jsonb;
alter table public.portals add column home_published jsonb not null default '[]'::jsonb;
create table public.categories (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 name text not null check(length(name) between 1 and 100), slug text not null,
 unique(portal_id,slug), unique(portal_id,id),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.articles (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 title text not null check(length(title) between 1 and 200), slug text not null,
 subtitle text not null default '', content text not null default '', author text not null default '',
 cover_url text not null default '', cover_alt text not null default '', tags text[] not null default '{}',
 category_id uuid, seo_title text not null default '', seo_description text not null default '',
 status text not null default 'draft' check(status in ('draft','published','scheduled')),
 publish_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(portal_id,slug), unique(portal_id,id),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade,
 foreign key(portal_id,category_id) references public.categories(portal_id,id),
 check(status='draft' or publish_at is not null)
);
create index articles_public_idx on public.articles(portal_id,status,publish_at desc);
create table public.media (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 name text not null, path text not null unique, url text not null, size integer not null, created_at timestamptz not null default now(),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 name text not null, image_url text not null, link text not null, position text not null check(position in ('header','sidebar','footer')),
 starts_at timestamptz, ends_at timestamptz, active boolean not null default true,
 check(ends_at is null or starts_at is null or ends_at>starts_at),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.partners (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 name text not null, image_url text not null, link text not null, active boolean not null default true,
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.pages (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 title text not null, slug text not null, content text not null default '', published boolean not null default false,
 unique(portal_id,slug), foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
create table public.domains (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null, portal_id uuid not null,
 hostname text not null unique check(hostname=lower(hostname) and hostname ~ '^[a-z0-9][a-z0-9.-]+[a-z]$'),
 verified boolean not null default false, provider_status jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(organization_id,portal_id) references public.portals(organization_id,id) on delete cascade
);
do $$ declare t text; begin
 foreach t in array array['categories','articles','media','campaigns','partners','pages','domains'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select,insert,delete on public.%I to authenticated',t);
  execute format('create policy owner_select on public.%I for select to authenticated using(public.is_organization_owner(organization_id))',t);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check(public.is_organization_owner(organization_id))',t);
  execute format('create policy owner_delete on public.%I for delete to authenticated using(public.is_organization_owner(organization_id))',t);
  if t <> 'domains' then
   execute format('grant update on public.%I to authenticated',t);
   execute format('create policy owner_update on public.%I for update to authenticated using(public.is_organization_owner(organization_id)) with check(public.is_organization_owner(organization_id))',t);
  end if;
 end loop;
end $$;
-- Domain verification is written exclusively by the server after official provider verification.
revoke insert on public.domains from authenticated;
grant insert(organization_id,portal_id,hostname) on public.domains to authenticated;
grant select on public.portals, public.categories, public.articles, public.campaigns, public.partners, public.pages, public.domains to anon;
create policy public_portals on public.portals for select to anon,authenticated using(true);
create policy public_categories on public.categories for select to anon,authenticated using(true);
create policy public_articles on public.articles for select to anon,authenticated using(status in ('published','scheduled') and publish_at <= now());
create policy public_campaigns on public.campaigns for select to anon,authenticated using(active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy public_partners on public.partners for select to anon,authenticated using(active);
create policy public_pages on public.pages for select to anon,authenticated using(published);
create policy public_domains on public.domains for select to anon,authenticated using(verified);
-- Draft homepage data is private; expose a safe public view and restrict column grants.
revoke select on public.portals from anon,authenticated;
grant select(id,organization_id,name,slug,template,created_at,settings,home_published) on public.portals to anon,authenticated;
-- Owners retrieve draft through this invoker-checked RPC rather than a public column grant.
create function public.get_home_draft(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; begin
 select home_draft into result from public.portals where id=target and public.is_organization_owner(organization_id);
 if not found then raise exception 'Forbidden'; end if; return result;
end; $$;
revoke all on function public.get_home_draft(uuid) from public,anon;
grant execute on function public.get_home_draft(uuid) to authenticated;
-- Prevent changing portal ownership even when an account later owns multiple organizations.
create function public.keep_portal_organization() returns trigger language plpgsql set search_path='' as $$
begin if new.organization_id<>old.organization_id then raise exception 'Portal organization is immutable'; end if; return new; end; $$;
create trigger portal_organization_immutable before update on public.portals for each row execute function public.keep_portal_organization();
grant all on public.categories,public.articles,public.media,public.campaigns,public.partners,public.pages,public.domains to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portal-media','portal-media',true,5242880,array['image/webp']) on conflict(id) do nothing;
create policy media_upload on storage.objects for insert to authenticated with check(bucket_id='portal-media' and exists(select 1 from public.portals p where p.organization_id::text=(storage.foldername(storage.objects.name))[1] and p.id::text=(storage.foldername(storage.objects.name))[2] and public.is_organization_owner(p.organization_id)));
create policy media_remove on storage.objects for delete to authenticated using(bucket_id='portal-media' and public.is_organization_owner(((storage.foldername(storage.objects.name))[1])::uuid));
create policy media_list on storage.objects for select to authenticated using(bucket_id='portal-media' and public.is_organization_owner(((storage.foldername(storage.objects.name))[1])::uuid));
commit;
