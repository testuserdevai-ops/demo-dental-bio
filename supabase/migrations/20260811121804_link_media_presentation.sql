-- Shared, owner-controlled media presentation for public profile links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'link-images', 'link-images', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.links
  add column image_url text,
  add column image_variant text not null default 'none',
  add column image_alt text,
  add column image_decorative boolean not null default true,
  add column is_featured boolean not null default false;

alter table public.links
  add constraint links_image_variant_controlled
    check (image_variant in ('none', 'small-icon', 'large-image')),
  add constraint links_image_alt_bounded
    check (image_alt is null or length(btrim(image_alt)) between 1 and 180),
  add constraint links_image_presentation_coherent check (
    (image_variant = 'none' and image_url is null and image_alt is null and image_decorative)
    or (
      image_variant in ('small-icon', 'large-image')
      and nullif(btrim(image_url), '') is not null
      and ((image_decorative and image_alt is null) or (not image_decorative and image_alt is not null))
    )
  );

alter table private.dashboard_media_cleanup_jobs
  drop constraint if exists dashboard_media_cleanup_jobs_bucket_check;
alter table private.dashboard_media_cleanup_jobs
  add constraint dashboard_media_cleanup_jobs_bucket_check
  check (bucket in ('gallery-images', 'review-images', 'blog-images', 'product-images', 'link-images'));

create or replace function private.enqueue_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text, p_object_path text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images', 'product-images', 'link-images')
    or p_object_path not like p_user_id::text || '/%'
  then raise exception 'Invalid cleanup target' using errcode = '22023'; end if;
  insert into private.dashboard_media_cleanup_jobs (user_id, bucket, object_path)
  values (p_user_id, p_bucket, p_object_path)
  on conflict (bucket, object_path) where completed_at is null do nothing;
end;
$$;

create or replace function public.claim_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text
)
returns table (job_id uuid, bucket text, object_path text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Cleanup target is not authorized' using errcode = '42501'; end if;
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images', 'product-images', 'link-images')
  then raise exception 'Cleanup bucket is invalid' using errcode = '22023'; end if;
  return query
  with claimed as (
    select jobs.id from private.dashboard_media_cleanup_jobs jobs
    where jobs.user_id = p_user_id and jobs.bucket = p_bucket and jobs.completed_at is null
    order by jobs.created_at limit 50 for update skip locked
  )
  update private.dashboard_media_cleanup_jobs jobs set attempts = attempts + 1
  from claimed where jobs.id = claimed.id
  returning jobs.id, jobs.bucket, jobs.object_path;
end;
$$;

drop policy if exists "Owners can select link images" on storage.objects;
drop policy if exists "Owners can insert link images" on storage.objects;
drop policy if exists "Owners can update link images" on storage.objects;
drop policy if exists "Owners can delete link images" on storage.objects;

create policy "Owners can select link images" on storage.objects
for select to authenticated using (
  bucket_id = 'link-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_dashboard_admin()))
);
create policy "Owners can insert link images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'link-images' and (storage.foldername(name))[2] = 'links'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_dashboard_admin()))
);
create policy "Owners can update link images" on storage.objects
for update to authenticated using (
  bucket_id = 'link-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_dashboard_admin()))
) with check (
  bucket_id = 'link-images' and (storage.foldername(name))[2] = 'links'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_dashboard_admin()))
);
create policy "Owners can delete link images" on storage.objects
for delete to authenticated using (
  bucket_id = 'link-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_dashboard_admin()))
);

create or replace function private.assert_link_media_input(
  p_user_id uuid, p_image_url text, p_image_variant text,
  p_image_alt text, p_image_decorative boolean
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_image_variant not in ('none', 'small-icon', 'large-image')
    or p_image_decorative is null
    or length(btrim(coalesce(p_image_alt, ''))) > 180
    or (p_image_variant = 'none' and (
      nullif(btrim(coalesce(p_image_url, '')), '') is not null
      or nullif(btrim(coalesce(p_image_alt, '')), '') is not null
      or not p_image_decorative
    ))
    or (p_image_variant <> 'none' and (
      private.dashboard_media_path(btrim(coalesce(p_image_url, '')), 'link-images', p_user_id, 'links') is null
      or (p_image_decorative and nullif(btrim(coalesce(p_image_alt, '')), '') is not null)
      or (not p_image_decorative and nullif(btrim(coalesce(p_image_alt, '')), '') is null)
    ))
  then raise exception 'Invalid link media input' using errcode = '22023'; end if;
end;
$$;

create or replace function public.create_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_title text, p_url text,
  p_image_url text, p_image_variant text, p_image_alt text,
  p_image_decorative boolean, p_is_featured boolean
)
returns setof public.links language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid; v_rank integer; v_link public.links%rowtype;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 255
    or btrim(p_url) !~* '^https?://[^[:space:]]+$' or p_is_featured is null
  then raise exception 'Invalid link input' using errcode = '22023'; end if;
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  perform 1 from public.link_groups
  where link_group_id = p_group_id and dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;
  perform private.assert_link_media_input(v_owner_id, p_image_url, p_image_variant, p_image_alt, p_image_decorative);
  if p_is_featured and (
    select count(*) from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id and links.is_featured
  ) >= 3 then raise exception 'A link group can feature at most three links' using errcode = '22023'; end if;
  select coalesce(max(links.rank), 0) + 1 into v_rank
  from public.dentistry_links join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id;
  insert into public.links (
    title, link, is_active, rank, image_url, image_variant, image_alt, image_decorative, is_featured
  ) values (
    btrim(p_title), btrim(p_url), true, v_rank,
    case when p_image_variant = 'none' then null else btrim(p_image_url) end,
    p_image_variant, case when p_image_decorative then null else btrim(p_image_alt) end,
    p_image_decorative, p_is_featured
  ) returning * into v_link;
  insert into public.dentistry_links (link_group_id, link_id) values (p_group_id, v_link.link_id);
  return next v_link;
end;
$$;

create or replace function public.update_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_link_id uuid,
  p_title text, p_url text, p_is_active boolean, p_image_url text,
  p_image_variant text, p_image_alt text, p_image_decorative boolean,
  p_is_featured boolean
)
returns setof public.links language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid; v_link public.links%rowtype; v_existing public.links%rowtype; v_old_path text;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 255
    or btrim(p_url) !~* '^https?://[^[:space:]]+$'
    or p_is_active is null or p_is_featured is null
  then raise exception 'Invalid link input' using errcode = '22023'; end if;
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  select links.* into v_existing
  from public.dentistry_links join public.link_groups using (link_group_id) join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id and dentistry_links.link_id = p_link_id
    and link_groups.dentistry_id = p_dentistry_id for update of links;
  if not found then raise exception 'Link not found' using errcode = 'P0002'; end if;
  perform 1 from public.link_groups
  where link_group_id = p_group_id and dentistry_id = p_dentistry_id
  for update;
  perform private.assert_link_media_input(v_owner_id, p_image_url, p_image_variant, p_image_alt, p_image_decorative);
  if p_is_featured and not v_existing.is_featured and (
    select count(*) from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id and links.is_featured
  ) >= 3 then raise exception 'A link group can feature at most three links' using errcode = '22023'; end if;
  if v_existing.image_url is not null and v_existing.image_url is distinct from
    (case when p_image_variant = 'none' then null else btrim(p_image_url) end)
  then
    v_old_path := private.dashboard_media_path(v_existing.image_url, 'link-images', v_owner_id, 'links');
    if v_old_path is not null then
      perform private.enqueue_dashboard_media_cleanup(v_owner_id, 'link-images', v_old_path);
    end if;
  end if;
  update public.links set
    title = btrim(p_title), link = btrim(p_url), is_active = p_is_active,
    image_url = case when p_image_variant = 'none' then null else btrim(p_image_url) end,
    image_variant = p_image_variant,
    image_alt = case when p_image_decorative then null else btrim(p_image_alt) end,
    image_decorative = p_image_decorative, is_featured = p_is_featured
  where links.link_id = p_link_id returning * into v_link;
  return next v_link;
end;
$$;

create or replace function public.delete_dentistry_link(
  p_dentistry_id uuid, p_group_id uuid, p_link_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid; v_image_url text; v_old_path text;
begin
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  select links.image_url into v_image_url
  from public.dentistry_links join public.link_groups using (link_group_id) join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id and dentistry_links.link_id = p_link_id
    and link_groups.dentistry_id = p_dentistry_id for update of links;
  if not found then raise exception 'Link not found' using errcode = 'P0002'; end if;
  v_old_path := private.dashboard_media_path(v_image_url, 'link-images', v_owner_id, 'links');
  if v_old_path is not null then
    perform private.enqueue_dashboard_media_cleanup(v_owner_id, 'link-images', v_old_path);
  end if;
  delete from public.dentistry_links
  where link_group_id = p_group_id and link_id = p_link_id;
  delete from public.links where link_id = p_link_id;
  with ordered as (
    select links.link_id, row_number() over (order by links.rank)::integer as rank
    from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id
  )
  update public.links set rank = ordered.rank
  from ordered where links.link_id = ordered.link_id;
end;
$$;

create or replace function public.delete_link_group(
  p_dentistry_id uuid, p_group_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid; v_link_ids uuid[]; v_image_url text; v_old_path text;
begin
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  for v_image_url in
    select links.image_url from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id and links.image_url is not null
  loop
    v_old_path := private.dashboard_media_path(v_image_url, 'link-images', v_owner_id, 'links');
    if v_old_path is not null then
      perform private.enqueue_dashboard_media_cleanup(v_owner_id, 'link-images', v_old_path);
    end if;
  end loop;
  select array_agg(link_id) into v_link_ids from public.dentistry_links
  where link_group_id = p_group_id;
  delete from public.link_groups where link_group_id = p_group_id and dentistry_id = p_dentistry_id;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;
  if v_link_ids is not null then delete from public.links where link_id = any(v_link_ids); end if;
  with ordered as (
    select link_group_id, row_number() over (order by rank)::integer as rank
    from public.link_groups where dentistry_id = p_dentistry_id
  )
  update public.link_groups set rank = ordered.rank
  from ordered where link_groups.link_group_id = ordered.link_group_id;
end;
$$;

revoke all on function private.assert_link_media_input(uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.create_dentistry_link_with_media(uuid, uuid, text, text, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.update_dentistry_link_with_media(uuid, uuid, uuid, text, text, boolean, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.create_dentistry_link_with_media(uuid, uuid, text, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.update_dentistry_link_with_media(uuid, uuid, uuid, text, text, boolean, text, text, text, boolean, boolean) to authenticated;
