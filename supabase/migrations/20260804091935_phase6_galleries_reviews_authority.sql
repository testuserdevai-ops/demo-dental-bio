-- Phase 6 gallery/review authority, atomic ordering, and tenant-scoped media.
-- Public reads remain unchanged; ordinary writes are available only through
-- the typed functions below.

insert into storage.buckets (id, name, public)
values
  ('gallery-images', 'gallery-images', true),
  ('review-images', 'review-images', true)
on conflict (id) do update set public = true;

create table private.dashboard_media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bucket text not null check (bucket in ('gallery-images', 'review-images')),
  object_path text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index dashboard_media_cleanup_pending_unique
on private.dashboard_media_cleanup_jobs (bucket, object_path)
where completed_at is null;
revoke all on table private.dashboard_media_cleanup_jobs from public, anon, authenticated;

create or replace function private.assert_dashboard_media_plan(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.users where id = p_user_id
      and (subscription_status in ('PRO', 'PREMIUM PRO') or trial_end > now())
  ) then raise exception 'Content requires an active plan' using errcode = '42501'; end if;
end;
$$;

create or replace function private.dashboard_media_path(
  p_url text, p_bucket text, p_user_id uuid, p_folder text
)
returns text language plpgsql stable security definer set search_path = ''
as $$
declare
  v_marker text := '/object/public/' || p_bucket || '/' || p_user_id::text || '/' || p_folder || '/';
  v_position integer;
  v_prefix text;
  v_issuer text;
  v_expected_prefix text;
  v_suffix text;
  v_path text;
begin
  v_position := strpos(coalesce(p_url, ''), v_marker);
  if v_position = 0 then return null; end if;
  v_prefix := substring(p_url from 1 for v_position - 1);
  v_issuer := nullif(
    coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'iss',
    ''
  );
  v_expected_prefix := regexp_replace(coalesce(v_issuer, ''), '/auth/v1/?$', '') || '/storage/v1';
  if v_prefix <> v_expected_prefix then return null; end if;
  v_suffix := substring(p_url from v_position + length(v_marker));
  if nullif(v_suffix, '') is null or v_suffix ~ '[?#]' or v_suffix like '%..%'
  then return null; end if;
  v_path := p_user_id::text || '/' || p_folder || '/' || v_suffix;
  if not exists (
    select 1 from storage.objects
    where bucket_id = p_bucket and name = v_path
  ) then return null; end if;
  return v_path;
end;
$$;

create or replace function private.enqueue_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text, p_object_path text
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_bucket not in ('gallery-images', 'review-images')
    or p_object_path not like p_user_id::text || '/%'
  then raise exception 'Invalid cleanup target' using errcode = '22023'; end if;
  insert into private.dashboard_media_cleanup_jobs (user_id, bucket, object_path)
  values (p_user_id, p_bucket, p_object_path)
  on conflict (bucket, object_path) where completed_at is null do nothing;
end;
$$;

create or replace function public.enqueue_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text, p_object_path text
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Cleanup target is not authorized' using errcode = '42501'; end if;
  perform private.enqueue_dashboard_media_cleanup(p_user_id, p_bucket, p_object_path);
end;
$$;

create or replace function public.claim_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text
)
returns table (job_id uuid, bucket text, object_path text)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Cleanup target is not authorized' using errcode = '42501'; end if;
  if p_bucket not in ('gallery-images', 'review-images')
  then raise exception 'Cleanup bucket is invalid' using errcode = '22023'; end if;
  return query
  with claimed as (
    select jobs.id from private.dashboard_media_cleanup_jobs jobs
    where jobs.user_id = p_user_id and jobs.bucket = p_bucket
      and jobs.completed_at is null
    order by jobs.created_at
    limit 50 for update skip locked
  )
  update private.dashboard_media_cleanup_jobs jobs
  set attempts = attempts + 1
  from claimed where jobs.id = claimed.id
  returning jobs.id, jobs.bucket, jobs.object_path;
end;
$$;

create or replace function public.complete_dashboard_media_cleanup(
  p_user_id uuid, p_job_ids uuid[]
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Cleanup target is not authorized' using errcode = '42501'; end if;
  update private.dashboard_media_cleanup_jobs set completed_at = now()
  where user_id = p_user_id and id = any(p_job_ids) and completed_at is null;
end;
$$;

revoke all on function public.enqueue_dashboard_media_cleanup(uuid, text, text) from public, anon;
revoke all on function public.claim_dashboard_media_cleanup(uuid, text) from public, anon;
revoke all on function public.complete_dashboard_media_cleanup(uuid, uuid[]) from public, anon;
grant execute on function public.enqueue_dashboard_media_cleanup(uuid, text, text) to authenticated;
grant execute on function public.claim_dashboard_media_cleanup(uuid, text) to authenticated;
grant execute on function public.complete_dashboard_media_cleanup(uuid, uuid[]) to authenticated;

with ranked as (
  select id,
         row_number() over (partition by user_id order by id) as occurrence
  from public.external_review_pages
)
delete from public.external_review_pages pages
using ranked
where pages.id = ranked.id and ranked.occurrence > 1;

alter table public.external_review_pages
  add constraint external_review_pages_user_id_unique unique (user_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'galleries', 'general_galleries', 'reviews', 'external_review_pages'
  ] loop
    execute format('drop policy if exists %I on public.%I',
      'Enable insert for authenticated users only', table_name);
    execute format('drop policy if exists %I on public.%I',
      'Enable update for users based on email', table_name);
    execute format('drop policy if exists %I on public.%I',
      'Enable delete for users based on user_id', table_name);
  end loop;
end;
$$;

create policy "Dashboard owners can insert galleries"
on public.galleries for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can update galleries"
on public.galleries for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can delete galleries"
on public.galleries for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));

create policy "Dashboard owners can insert general galleries"
on public.general_galleries for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can update general galleries"
on public.general_galleries for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can delete general galleries"
on public.general_galleries for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));

create policy "Dashboard owners can insert reviews"
on public.reviews for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can update reviews"
on public.reviews for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can delete reviews"
on public.reviews for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));

create policy "Dashboard owners can insert external review pages"
on public.external_review_pages for insert to authenticated
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can update external review pages"
on public.external_review_pages for update to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()))
with check (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));
create policy "Dashboard owners can delete external review pages"
on public.external_review_pages for delete to authenticated
using (user_id = (select auth.uid()) or (select public.is_dashboard_admin()));

revoke insert, update, delete on table
  public.galleries,
  public.general_galleries,
  public.reviews,
  public.external_review_pages
from anon, authenticated;

create or replace function public.create_dashboard_gallery(
  p_user_id uuid,
  p_title text,
  p_before_image_url text,
  p_after_image_url text,
  p_before_image_label text,
  p_after_image_label text
)
returns setof public.galleries
language plpgsql security definer set search_path = ''
as $$
declare v_row public.galleries%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_before_image_url), '') is null
    or nullif(btrim(p_after_image_url), '') is null
    or private.dashboard_media_path(btrim(p_before_image_url), 'gallery-images', p_user_id, 'gallery') is null
    or private.dashboard_media_path(btrim(p_after_image_url), 'gallery-images', p_user_id, 'gallery') is null
    or length(btrim(coalesce(p_before_image_label, ''))) > 50
    or length(btrim(coalesce(p_after_image_label, ''))) > 50
  then raise exception 'Invalid gallery input' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('galleries:' || p_user_id::text, 0));
  insert into public.galleries (
    user_id, title, before_image_url, after_image_url,
    before_image_label, after_image_label, rank, enabled
  ) values (
    p_user_id, btrim(p_title), btrim(p_before_image_url), btrim(p_after_image_url),
    btrim(coalesce(p_before_image_label, '')), btrim(coalesce(p_after_image_label, '')),
    coalesce((select max(rank) from public.galleries where user_id = p_user_id), 0) + 1,
    true
  ) returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.update_dashboard_gallery(
  p_user_id uuid,
  p_id bigint,
  p_title text,
  p_before_image_url text,
  p_after_image_url text,
  p_before_image_label text,
  p_after_image_label text,
  p_enabled boolean
)
returns setof public.galleries
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.galleries%rowtype;
  v_existing public.galleries%rowtype;
  v_path text;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  select * into v_existing from public.galleries
  where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_before_image_url), '') is null
    or nullif(btrim(p_after_image_url), '') is null
    or (btrim(p_before_image_url) is distinct from v_existing.before_image_url
      and private.dashboard_media_path(btrim(p_before_image_url), 'gallery-images', p_user_id, 'gallery') is null)
    or (btrim(p_after_image_url) is distinct from v_existing.after_image_url
      and private.dashboard_media_path(btrim(p_after_image_url), 'gallery-images', p_user_id, 'gallery') is null)
    or length(btrim(coalesce(p_before_image_label, ''))) > 50
    or length(btrim(coalesce(p_after_image_label, ''))) > 50
    or p_enabled is null
  then raise exception 'Invalid gallery input' using errcode = '22023'; end if;
  if btrim(p_before_image_url) is distinct from v_existing.before_image_url then
    v_path := private.dashboard_media_path(v_existing.before_image_url, 'gallery-images', p_user_id, 'gallery');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id, 'gallery-images', v_path); end if;
  end if;
  if btrim(p_after_image_url) is distinct from v_existing.after_image_url then
    v_path := private.dashboard_media_path(v_existing.after_image_url, 'gallery-images', p_user_id, 'gallery');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id, 'gallery-images', v_path); end if;
  end if;
  update public.galleries set
    title = btrim(p_title), before_image_url = btrim(p_before_image_url),
    after_image_url = btrim(p_after_image_url),
    before_image_label = btrim(coalesce(p_before_image_label, '')),
    after_image_label = btrim(coalesce(p_after_image_label, '')),
    enabled = p_enabled
  where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  return next v_row;
end;
$$;

create or replace function public.delete_dashboard_gallery(
  p_user_id uuid, p_id bigint
)
returns setof public.galleries
language plpgsql security definer set search_path = ''
as $$
declare v_row public.galleries%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('galleries:' || p_user_id::text, 0));
  delete from public.galleries where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  perform private.enqueue_dashboard_media_cleanup(p_user_id, 'gallery-images', path)
  from (values
    (private.dashboard_media_path(v_row.before_image_url, 'gallery-images', p_user_id, 'gallery')),
    (private.dashboard_media_path(v_row.after_image_url, 'gallery-images', p_user_id, 'gallery'))
  ) media(path) where path is not null;
  with ordered as (
    select id, row_number() over (order by rank nulls last, id) as position
    from public.galleries where user_id = p_user_id
  )
  update public.galleries gallery set rank = ordered.position::integer
  from ordered where gallery.id = ordered.id;
  return next v_row;
end;
$$;

create or replace function public.reorder_dashboard_galleries(
  p_user_id uuid, p_ids bigint[]
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('galleries:' || p_user_id::text, 0));
  select count(*) into v_count from public.galleries where user_id = p_user_id;
  if p_ids is null
    or cardinality(p_ids) <> v_count
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists (select 1 from unnest(p_ids) id where not exists (
      select 1 from public.galleries where galleries.id = id and user_id = p_user_id
    ))
  then raise exception 'Gallery order is not exact' using errcode = '22023'; end if;
  update public.galleries gallery set rank = ordered.position::integer
  from unnest(p_ids) with ordinality ordered(id, position)
  where gallery.id = ordered.id and gallery.user_id = p_user_id;
end;
$$;

create or replace function public.create_dashboard_general_gallery(
  p_user_id uuid, p_title text, p_image_url text
)
returns setof public.general_galleries
language plpgsql security definer set search_path = ''
as $$
declare v_row public.general_galleries%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_image_url), '') is null
    or private.dashboard_media_path(btrim(p_image_url), 'gallery-images', p_user_id, 'gallery') is null
  then raise exception 'Invalid gallery input' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('general-galleries:' || p_user_id::text, 0));
  insert into public.general_galleries (user_id, title, image_url, rank, enabled)
  values (
    p_user_id, btrim(p_title), btrim(p_image_url),
    coalesce((select max(rank) from public.general_galleries where user_id = p_user_id), 0) + 1,
    true
  ) returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.update_dashboard_general_gallery(
  p_user_id uuid, p_id bigint, p_title text, p_image_url text, p_enabled boolean
)
returns setof public.general_galleries
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.general_galleries%rowtype;
  v_existing public.general_galleries%rowtype;
  v_path text;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  select * into v_existing from public.general_galleries
  where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_image_url), '') is null
    or (btrim(p_image_url) is distinct from v_existing.image_url
      and private.dashboard_media_path(btrim(p_image_url), 'gallery-images', p_user_id, 'gallery') is null)
    or p_enabled is null
  then raise exception 'Invalid gallery input' using errcode = '22023'; end if;
  if btrim(p_image_url) is distinct from v_existing.image_url then
    v_path := private.dashboard_media_path(v_existing.image_url, 'gallery-images', p_user_id, 'gallery');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id, 'gallery-images', v_path); end if;
  end if;
  update public.general_galleries set title = btrim(p_title),
    image_url = btrim(p_image_url), enabled = p_enabled
  where id = p_id and user_id = p_user_id returning * into v_row;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  return next v_row;
end;
$$;

create or replace function public.delete_dashboard_general_gallery(
  p_user_id uuid, p_id bigint
)
returns setof public.general_galleries
language plpgsql security definer set search_path = ''
as $$
declare v_row public.general_galleries%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('general-galleries:' || p_user_id::text, 0));
  delete from public.general_galleries where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Gallery not found' using errcode = 'P0002'; end if;
  perform private.enqueue_dashboard_media_cleanup(p_user_id, 'gallery-images', path)
  from (values
    (private.dashboard_media_path(v_row.image_url, 'gallery-images', p_user_id, 'gallery'))
  ) media(path) where path is not null;
  with ordered as (
    select id, row_number() over (order by rank nulls last, id) as position
    from public.general_galleries where user_id = p_user_id
  )
  update public.general_galleries gallery set rank = ordered.position::integer
  from ordered where gallery.id = ordered.id;
  return next v_row;
end;
$$;

create or replace function public.reorder_dashboard_general_galleries(
  p_user_id uuid, p_ids bigint[]
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Gallery target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('general-galleries:' || p_user_id::text, 0));
  select count(*) into v_count from public.general_galleries where user_id = p_user_id;
  if p_ids is null
    or cardinality(p_ids) <> v_count
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists (select 1 from unnest(p_ids) id where not exists (
      select 1 from public.general_galleries where general_galleries.id = id and user_id = p_user_id
    ))
  then raise exception 'Gallery order is not exact' using errcode = '22023'; end if;
  update public.general_galleries gallery set rank = ordered.position::integer
  from unnest(p_ids) with ordinality ordered(id, position)
  where gallery.id = ordered.id and gallery.user_id = p_user_id;
end;
$$;

create or replace function public.create_dashboard_review(
  p_user_id uuid,
  p_reviewer_name text,
  p_content text,
  p_stars smallint,
  p_image_url text,
  p_platform text,
  p_created_at timestamptz
)
returns setof public.reviews
language plpgsql security definer set search_path = ''
as $$
declare v_row public.reviews%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  if nullif(btrim(p_reviewer_name), '') is null or length(btrim(p_reviewer_name)) > 100
    or nullif(btrim(p_content), '') is null or length(btrim(p_content)) > 500
    or p_stars not between 1 and 5
    or (nullif(btrim(coalesce(p_image_url, '')), '') is not null
      and private.dashboard_media_path(btrim(p_image_url), 'review-images', p_user_id, 'review') is null)
    or nullif(btrim(p_platform), '') is null or length(btrim(p_platform)) > 50
    or p_created_at is null
  then raise exception 'Invalid review input' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reviews:' || p_user_id::text, 0));
  insert into public.reviews (
    user_id, reviewer_name, content, stars, image_url, platform,
    created_at, rank, enabled
  ) values (
    p_user_id, btrim(p_reviewer_name), btrim(p_content), p_stars,
    btrim(coalesce(p_image_url, '')), btrim(p_platform), p_created_at,
    coalesce((select max(rank) from public.reviews where user_id = p_user_id), 0) + 1,
    true
  ) returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.update_dashboard_review(
  p_user_id uuid,
  p_id bigint,
  p_reviewer_name text,
  p_content text,
  p_stars smallint,
  p_image_url text,
  p_platform text,
  p_created_at timestamptz,
  p_enabled boolean
)
returns setof public.reviews
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.reviews%rowtype;
  v_existing public.reviews%rowtype;
  v_path text;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  select * into v_existing from public.reviews
  where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  if nullif(btrim(p_reviewer_name), '') is null or length(btrim(p_reviewer_name)) > 100
    or nullif(btrim(p_content), '') is null or length(btrim(p_content)) > 500
    or p_stars not between 1 and 5
    or (btrim(coalesce(p_image_url, '')) is distinct from coalesce(v_existing.image_url, '')
      and nullif(btrim(coalesce(p_image_url, '')), '') is not null
      and private.dashboard_media_path(btrim(p_image_url), 'review-images', p_user_id, 'review') is null)
    or nullif(btrim(p_platform), '') is null or length(btrim(p_platform)) > 50
    or p_created_at is null or p_enabled is null
  then raise exception 'Invalid review input' using errcode = '22023'; end if;
  if btrim(coalesce(p_image_url, '')) is distinct from coalesce(v_existing.image_url, '') then
    v_path := private.dashboard_media_path(v_existing.image_url, 'review-images', p_user_id, 'review');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id, 'review-images', v_path); end if;
  end if;
  update public.reviews set reviewer_name = btrim(p_reviewer_name),
    content = btrim(p_content), stars = p_stars,
    image_url = btrim(coalesce(p_image_url, '')), platform = btrim(p_platform),
    created_at = p_created_at, enabled = p_enabled
  where id = p_id and user_id = p_user_id returning * into v_row;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  return next v_row;
end;
$$;

create or replace function public.delete_dashboard_review(
  p_user_id uuid, p_id bigint
)
returns setof public.reviews
language plpgsql security definer set search_path = ''
as $$
declare v_row public.reviews%rowtype;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('reviews:' || p_user_id::text, 0));
  delete from public.reviews where id = p_id and user_id = p_user_id
  returning * into v_row;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  perform private.enqueue_dashboard_media_cleanup(p_user_id, 'review-images', path)
  from (values
    (private.dashboard_media_path(v_row.image_url, 'review-images', p_user_id, 'review'))
  ) media(path) where path is not null;
  with ordered as (
    select id, row_number() over (order by rank nulls last, id) as position
    from public.reviews where user_id = p_user_id
  )
  update public.reviews review set rank = ordered.position::smallint
  from ordered where review.id = ordered.id;
  return next v_row;
end;
$$;

create or replace function public.reorder_dashboard_reviews(
  p_user_id uuid, p_ids bigint[]
)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Review target is not authorized' using errcode = '42501'; end if;
  perform private.assert_dashboard_media_plan(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('reviews:' || p_user_id::text, 0));
  select count(*) into v_count from public.reviews where user_id = p_user_id;
  if p_ids is null
    or cardinality(p_ids) <> v_count
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists (select 1 from unnest(p_ids) id where not exists (
      select 1 from public.reviews where reviews.id = id and user_id = p_user_id
    ))
  then raise exception 'Review order is not exact' using errcode = '22023'; end if;
  update public.reviews review set rank = ordered.position::smallint
  from unnest(p_ids) with ordinality ordered(id, position)
  where review.id = ordered.id and review.user_id = p_user_id;
end;
$$;

create or replace function public.save_dashboard_external_review_page(
  p_user_id uuid, p_link text
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
  if length(btrim(coalesce(p_link, ''))) > 2048
    or (nullif(btrim(coalesce(p_link, '')), '') is not null
      and lower(btrim(p_link)) !~ '^https://')
  then raise exception 'Invalid review page link' using errcode = '22023'; end if;
  insert into public.external_review_pages (user_id, link)
  values (p_user_id, btrim(coalesce(p_link, '')))
  on conflict (user_id) do update set link = excluded.link
  returning * into v_row;
  return next v_row;
end;
$$;

revoke all on function public.create_dashboard_gallery(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.update_dashboard_gallery(uuid, bigint, text, text, text, text, text, boolean) from public, anon;
revoke all on function public.delete_dashboard_gallery(uuid, bigint) from public, anon;
revoke all on function public.reorder_dashboard_galleries(uuid, bigint[]) from public, anon;
revoke all on function public.create_dashboard_general_gallery(uuid, text, text) from public, anon;
revoke all on function public.update_dashboard_general_gallery(uuid, bigint, text, text, boolean) from public, anon;
revoke all on function public.delete_dashboard_general_gallery(uuid, bigint) from public, anon;
revoke all on function public.reorder_dashboard_general_galleries(uuid, bigint[]) from public, anon;
revoke all on function public.create_dashboard_review(uuid, text, text, smallint, text, text, timestamptz) from public, anon;
revoke all on function public.update_dashboard_review(uuid, bigint, text, text, smallint, text, text, timestamptz, boolean) from public, anon;
revoke all on function public.delete_dashboard_review(uuid, bigint) from public, anon;
revoke all on function public.reorder_dashboard_reviews(uuid, bigint[]) from public, anon;
revoke all on function public.save_dashboard_external_review_page(uuid, text) from public, anon;

grant execute on function public.create_dashboard_gallery(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.update_dashboard_gallery(uuid, bigint, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.delete_dashboard_gallery(uuid, bigint) to authenticated;
grant execute on function public.reorder_dashboard_galleries(uuid, bigint[]) to authenticated;
grant execute on function public.create_dashboard_general_gallery(uuid, text, text) to authenticated;
grant execute on function public.update_dashboard_general_gallery(uuid, bigint, text, text, boolean) to authenticated;
grant execute on function public.delete_dashboard_general_gallery(uuid, bigint) to authenticated;
grant execute on function public.reorder_dashboard_general_galleries(uuid, bigint[]) to authenticated;
grant execute on function public.create_dashboard_review(uuid, text, text, smallint, text, text, timestamptz) to authenticated;
grant execute on function public.update_dashboard_review(uuid, bigint, text, text, smallint, text, text, timestamptz, boolean) to authenticated;
grant execute on function public.delete_dashboard_review(uuid, bigint) to authenticated;
grant execute on function public.reorder_dashboard_reviews(uuid, bigint[]) to authenticated;
grant execute on function public.save_dashboard_external_review_page(uuid, text) to authenticated;

drop policy if exists "authenticated_allow 1ndp9hv_0" on storage.objects;
drop policy if exists "authenticated_allow 1ndp9hv_1" on storage.objects;
drop policy if exists "authenticated_allow 1ndp9hv_2" on storage.objects;
drop policy if exists "authenticated_allow 1ndp9hv_3" on storage.objects;
drop policy if exists "authenticated_allow 1qk4ih9_0" on storage.objects;
drop policy if exists "authenticated_allow 1qk4ih9_1" on storage.objects;
drop policy if exists "authenticated_allow 1qk4ih9_2" on storage.objects;
drop policy if exists "authenticated_allow 1qk4ih9_3" on storage.objects;

create policy "Owners can select gallery images"
on storage.objects for select to authenticated
using (
  bucket_id = 'gallery-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can insert gallery images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'gallery-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can update gallery images"
on storage.objects for update to authenticated
using (
  bucket_id = 'gallery-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
)
with check (
  bucket_id = 'gallery-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can delete gallery images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'gallery-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);

create policy "Owners can select review images"
on storage.objects for select to authenticated
using (
  bucket_id = 'review-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can insert review images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'review-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can update review images"
on storage.objects for update to authenticated
using (
  bucket_id = 'review-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
)
with check (
  bucket_id = 'review-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can delete review images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'review-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
