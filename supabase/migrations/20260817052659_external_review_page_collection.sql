-- Treat external review pages as a first-class ordered collection.

create or replace function private.is_safe_external_review_page_url(p_link text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_match text[];
  v_authority text;
  v_host text;
  v_port text;
begin
  if p_link <> btrim(p_link)
    or length(p_link) not between 1 and 2048
    or p_link ~ '[[:cntrl:][:space:]\\]'
  then return false; end if;

  v_match := regexp_match(p_link, '^https://([^/?#]+)(?:[/?#].*)?$', 'i');
  if v_match is null then return false; end if;

  v_authority := v_match[1];
  if v_authority like '%@%'
    or length(v_authority) - length(replace(v_authority, ':', '')) > 1
  then return false; end if;

  v_host := split_part(v_authority, ':', 1);
  v_port := nullif(split_part(v_authority, ':', 2), '');
  if v_host !~* '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$'
    or v_host like '%..%'
    or v_host like '%.-%'
    or v_host like '%-.%'
    or (v_port is not null and (
      v_port !~ '^[0-9]{1,5}$'
      or v_port::integer not between 1 and 65535
    ))
  then return false; end if;

  return true;
end;
$$;

delete from public.external_review_pages
where nullif(btrim(link), '') is null
  or not private.is_safe_external_review_page_url(btrim(link));

update public.external_review_pages set link = btrim(link);

alter table public.external_review_pages
  drop constraint if exists external_review_pages_user_id_unique,
  add column rank integer,
  add column enabled boolean not null default true;

with ordered as (
  select id,
         row_number() over (partition by user_id order by id desc) as position
  from public.external_review_pages
)
update public.external_review_pages pages
set rank = ordered.position::integer
from ordered
where pages.id = ordered.id;

alter table public.external_review_pages
  alter column rank set default 1,
  alter column rank set not null,
  add constraint external_review_pages_rank_positive check (rank > 0),
  add constraint external_review_pages_link_safe
    check (private.is_safe_external_review_page_url(link));

create index external_review_pages_user_rank_idx
on public.external_review_pages (user_id, rank, id);

drop policy if exists "Enable read access for all users"
on public.external_review_pages;
drop policy if exists "Public can read enabled external review pages"
on public.external_review_pages;
drop policy if exists "Dashboard owners can read external review pages"
on public.external_review_pages;

create policy "Public can read enabled external review pages"
on public.external_review_pages for select to anon, authenticated
using (enabled = true);

create policy "Dashboard owners can read external review pages"
on public.external_review_pages for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_dashboard_admin())
);

drop function if exists public.save_dashboard_external_review_page(uuid, text);

create or replace function public.create_dashboard_external_review_page(
  p_user_id uuid,
  p_link text
)
returns setof public.external_review_pages
language plpgsql security definer set search_path = ''
as $$
declare v_row public.external_review_pages%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  if p_link is null or not private.is_safe_external_review_page_url(p_link)
  then raise exception 'Invalid review page link' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('external-review-pages:' || p_user_id::text, 0));
  insert into public.external_review_pages (user_id, link, rank, enabled)
  values (
    p_user_id,
    p_link,
    coalesce((select max(rank) from public.external_review_pages where user_id = p_user_id), 0) + 1,
    true
  )
  returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.update_dashboard_external_review_page(
  p_user_id uuid,
  p_id bigint,
  p_link text,
  p_enabled boolean
)
returns setof public.external_review_pages
language plpgsql security definer set search_path = ''
as $$
declare v_row public.external_review_pages%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  if p_link is null
    or not private.is_safe_external_review_page_url(p_link)
    or p_enabled is null
  then raise exception 'Invalid review page input' using errcode = '22023'; end if;

  update public.external_review_pages
  set link = p_link, enabled = p_enabled
  where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Review page not found' using errcode = 'P0002'; end if;
  return next v_row;
end;
$$;

create or replace function public.delete_dashboard_external_review_page(
  p_user_id uuid,
  p_id bigint
)
returns setof public.external_review_pages
language plpgsql security definer set search_path = ''
as $$
declare v_row public.external_review_pages%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('external-review-pages:' || p_user_id::text, 0));

  delete from public.external_review_pages
  where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Review page not found' using errcode = 'P0002'; end if;

  with ordered as (
    select id, row_number() over (order by rank, id) as position
    from public.external_review_pages
    where user_id = p_user_id
  )
  update public.external_review_pages pages
  set rank = ordered.position::integer
  from ordered
  where pages.id = ordered.id;
  return next v_row;
end;
$$;

create or replace function public.reorder_dashboard_external_review_pages(
  p_user_id uuid,
  p_ids bigint[]
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('external-review-pages:' || p_user_id::text, 0));

  select count(*) into v_count
  from public.external_review_pages
  where user_id = p_user_id;
  if p_ids is null
    or cardinality(p_ids) <> v_count
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists (
      select 1 from unnest(p_ids) id
      where not exists (
        select 1 from public.external_review_pages pages
        where pages.id = id and pages.user_id = p_user_id
      )
    )
  then raise exception 'Review page order is not exact' using errcode = '22023'; end if;

  update public.external_review_pages pages
  set rank = ordered.position::integer
  from unnest(p_ids) with ordinality ordered(id, position)
  where pages.id = ordered.id and pages.user_id = p_user_id;
end;
$$;

revoke all on function private.is_safe_external_review_page_url(text)
from public, anon, authenticated;
grant execute on function private.is_safe_external_review_page_url(text)
to service_role;
revoke all on function public.create_dashboard_external_review_page(uuid, text)
from public, anon;
revoke all on function public.update_dashboard_external_review_page(uuid, bigint, text, boolean)
from public, anon;
revoke all on function public.delete_dashboard_external_review_page(uuid, bigint)
from public, anon;
revoke all on function public.reorder_dashboard_external_review_pages(uuid, bigint[])
from public, anon;

grant execute on function public.create_dashboard_external_review_page(uuid, text)
to authenticated;
grant execute on function public.update_dashboard_external_review_page(uuid, bigint, text, boolean)
to authenticated;
grant execute on function public.delete_dashboard_external_review_page(uuid, bigint)
to authenticated;
grant execute on function public.reorder_dashboard_external_review_pages(uuid, bigint[])
to authenticated;
