begin;
alter table public.campaigns add column creative jsonb not null default '{}'::jsonb;
alter table public.partners add column creative jsonb not null default '{}'::jsonb;
alter table public.campaigns drop constraint campaigns_position_check;
alter table public.campaigns add constraint campaigns_position_check check(position in ('header','sidebar','footer','between','category','sponsored','before-content','after-content','article-top','article-middle','article-bottom','page-top','page-bottom','inline'));
commit;
