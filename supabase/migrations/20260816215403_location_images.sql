-- Owner-managed media belongs to an exact saved location.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'location-images',
  'location-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.locations
  add column image_url text,
  add column image_alt text,
  add column image_decorative boolean not null default true;

alter table public.locations
  add constraint locations_image_alt_bounded check (
    image_alt is null
    or (
      image_alt = btrim(image_alt)
      and char_length(image_alt) between 1 and 180
      and image_alt !~ '[[:cntrl:]]'
    )
  ),
  add constraint locations_image_presentation_coherent check (
    (
      image_url is null
      and image_alt is null
      and image_decorative
    )
    or (
      image_url = btrim(image_url)
      and nullif(image_url, '') is not null
      and (
        (image_decorative and image_alt is null)
        or (not image_decorative and image_alt is not null)
      )
    )
  );

alter table private.dashboard_media_cleanup_jobs
  drop constraint if exists dashboard_media_cleanup_jobs_bucket_check;
alter table private.dashboard_media_cleanup_jobs
  add constraint dashboard_media_cleanup_jobs_bucket_check check (
    bucket in (
      'gallery-images',
      'review-images',
      'blog-images',
      'product-images',
      'link-images',
      'location-images'
    )
  );

create or replace function private.enqueue_dashboard_media_cleanup(
  p_user_id uuid,
  p_bucket text,
  p_object_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bucket not in (
    'gallery-images',
    'review-images',
    'blog-images',
    'product-images',
    'link-images',
    'location-images'
  ) or p_object_path not like p_user_id::text || '/%'
  then
    raise exception 'Invalid cleanup target' using errcode = '22023';
  end if;

  insert into private.dashboard_media_cleanup_jobs (user_id, bucket, object_path)
  values (p_user_id, p_bucket, p_object_path)
  on conflict (bucket, object_path) where completed_at is null do nothing;
end;
$$;

create or replace function public.claim_dashboard_media_cleanup(
  p_user_id uuid,
  p_bucket text
)
returns table (job_id uuid, bucket text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    p_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Cleanup target is not authorized' using errcode = '42501';
  end if;

  if p_bucket not in (
    'gallery-images',
    'review-images',
    'blog-images',
    'product-images',
    'link-images',
    'location-images'
  ) then
    raise exception 'Cleanup bucket is invalid' using errcode = '22023';
  end if;

  return query
  with claimed as (
    select jobs.id
    from private.dashboard_media_cleanup_jobs jobs
    where jobs.user_id = p_user_id
      and jobs.bucket = p_bucket
      and jobs.completed_at is null
    order by jobs.created_at
    limit 50
    for update skip locked
  )
  update private.dashboard_media_cleanup_jobs jobs
  set attempts = attempts + 1
  from claimed
  where jobs.id = claimed.id
  returning jobs.id, jobs.bucket, jobs.object_path;
end;
$$;

drop policy if exists "Owners can select location images" on storage.objects;
drop policy if exists "Owners can insert location images" on storage.objects;
drop policy if exists "Owners can update location images" on storage.objects;
drop policy if exists "Owners can delete location images" on storage.objects;

create policy "Owners can select location images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'location-images'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[2] = 'dentistries'
  and (storage.foldername(name))[4] = 'locations'
  and (storage.foldername(name))[5] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and name !~ '\.\.'
  and exists (
    select 1
    from public.dentistries dentistry
    where dentistry.dentistry_id::text = (storage.foldername(name))[3]
      and dentistry.user_id::text = (storage.foldername(name))[1]
      and (
        dentistry.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Owners can insert location images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'location-images'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[2] = 'dentistries'
  and (storage.foldername(name))[4] = 'locations'
  and (storage.foldername(name))[5] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and name !~ '\.\.'
  and exists (
    select 1
    from public.dentistries dentistry
    where dentistry.dentistry_id::text = (storage.foldername(name))[3]
      and dentistry.user_id::text = (storage.foldername(name))[1]
      and (
        dentistry.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Owners can update location images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'location-images'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[2] = 'dentistries'
  and (storage.foldername(name))[4] = 'locations'
  and (storage.foldername(name))[5] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and name !~ '\.\.'
  and exists (
    select 1
    from public.dentistries dentistry
    where dentistry.dentistry_id::text = (storage.foldername(name))[3]
      and dentistry.user_id::text = (storage.foldername(name))[1]
      and (
        dentistry.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
)
with check (
  bucket_id = 'location-images'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[2] = 'dentistries'
  and (storage.foldername(name))[4] = 'locations'
  and (storage.foldername(name))[5] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and name !~ '\.\.'
  and exists (
    select 1
    from public.dentistries dentistry
    where dentistry.dentistry_id::text = (storage.foldername(name))[3]
      and dentistry.user_id::text = (storage.foldername(name))[1]
      and (
        dentistry.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Owners can delete location images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'location-images'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[2] = 'dentistries'
  and (storage.foldername(name))[4] = 'locations'
  and (storage.foldername(name))[5] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and name !~ '\.\.'
  and exists (
    select 1
    from public.dentistries dentistry
    where dentistry.dentistry_id::text = (storage.foldername(name))[3]
      and dentistry.user_id::text = (storage.foldername(name))[1]
      and (
        dentistry.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create or replace function private.assert_location_media_input(
  p_user_id uuid,
  p_dentistry_id uuid,
  p_location_id uuid,
  p_image_url text,
  p_image_alt text,
  p_image_decorative boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_folder text := 'dentistries/' || p_dentistry_id::text || '/locations/' || p_location_id::text;
begin
  if p_image_decorative is null
    or char_length(btrim(coalesce(p_image_alt, ''))) > 180
    or btrim(coalesce(p_image_alt, '')) ~ '[[:cntrl:]]'
    or (
      nullif(btrim(coalesce(p_image_url, '')), '') is null
      and (
        nullif(btrim(coalesce(p_image_alt, '')), '') is not null
        or not p_image_decorative
      )
    )
    or (
      nullif(btrim(coalesce(p_image_url, '')), '') is not null
      and (
        private.dashboard_media_path(
          btrim(p_image_url),
          'location-images',
          p_user_id,
          v_folder
        ) is null
        or (p_image_decorative and nullif(btrim(coalesce(p_image_alt, '')), '') is not null)
        or (not p_image_decorative and nullif(btrim(coalesce(p_image_alt, '')), '') is null)
      )
    )
  then
    raise exception 'Invalid location image values' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.create_dentistry_location_with_media(
  p_dentistry_id uuid,
  p_location_id uuid,
  p_business_name text,
  p_full_address text,
  p_country text,
  p_city text,
  p_area text,
  p_latitude numeric,
  p_longitude numeric,
  p_image_url text,
  p_image_alt text,
  p_image_decorative boolean
)
returns setof public.locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.locations%rowtype;
  v_user_id uuid;
  v_limit integer;
  v_count integer;
begin
  v_user_id := private.assert_dashboard_location_owner(p_dentistry_id);
  if p_location_id is null
    or btrim(coalesce(p_business_name, '')) = ''
    or char_length(btrim(p_business_name)) > 150
    or btrim(coalesce(p_full_address, '')) = ''
    or char_length(btrim(p_full_address)) > 300
    or char_length(btrim(coalesce(p_country, ''))) > 150
    or btrim(coalesce(p_city, '')) = ''
    or char_length(btrim(p_city)) > 150
    or char_length(btrim(coalesce(p_area, ''))) > 150
    or p_latitude is null
    or p_latitude not between -90 and 90
    or p_longitude is null
    or p_longitude not between -180 and 180
  then
    raise exception 'Invalid location values' using errcode = '22023';
  end if;

  perform private.assert_location_media_input(
    v_user_id,
    p_dentistry_id,
    p_location_id,
    p_image_url,
    p_image_alt,
    p_image_decorative
  );
  perform pg_advisory_xact_lock(hashtextextended('locations:' || p_dentistry_id::text, 0));

  select case
    when subscription_status in ('PRO', 'PREMIUM PRO') or trial_end > now()
      then 2147483647
    else 1
  end
  into v_limit
  from public.users
  where id = v_user_id;

  select count(*)
  into v_count
  from public.dentistry_locations
  where dentistry_id = p_dentistry_id;

  if v_count >= v_limit then
    raise exception 'Location limit reached' using errcode = '23514';
  end if;

  insert into public.locations (
    location_id,
    business_name,
    full_address,
    country,
    city,
    area,
    latitude,
    longitude,
    image_url,
    image_alt,
    image_decorative
  )
  values (
    p_location_id,
    btrim(p_business_name),
    btrim(p_full_address),
    btrim(coalesce(p_country, '')),
    btrim(p_city),
    btrim(coalesce(p_area, '')),
    p_latitude,
    p_longitude,
    nullif(btrim(coalesce(p_image_url, '')), ''),
    case when p_image_decorative then null else btrim(p_image_alt) end,
    p_image_decorative
  )
  returning * into v_row;

  insert into public.dentistry_locations (dentistry_id, location_id)
  values (p_dentistry_id, v_row.location_id);

  return next v_row;
end;
$$;

create or replace function public.update_dentistry_location_with_media(
  p_dentistry_id uuid,
  p_location_id uuid,
  p_expected_updated_at timestamptz,
  p_business_name text,
  p_full_address text,
  p_country text,
  p_city text,
  p_area text,
  p_latitude numeric,
  p_longitude numeric,
  p_image_url text,
  p_image_alt text,
  p_image_decorative boolean
)
returns setof public.locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.locations%rowtype;
  v_user_id uuid;
  v_existing public.locations%rowtype;
  v_old_path text;
  v_folder text := 'dentistries/' || p_dentistry_id::text || '/locations/' || p_location_id::text;
begin
  v_user_id := private.assert_dashboard_location_owner(p_dentistry_id);
  if btrim(coalesce(p_business_name, '')) = ''
    or char_length(btrim(p_business_name)) > 150
    or btrim(coalesce(p_full_address, '')) = ''
    or char_length(btrim(p_full_address)) > 300
    or char_length(btrim(coalesce(p_country, ''))) > 150
    or btrim(coalesce(p_city, '')) = ''
    or char_length(btrim(p_city)) > 150
    or char_length(btrim(coalesce(p_area, ''))) > 150
    or p_latitude is null
    or p_latitude not between -90 and 90
    or p_longitude is null
    or p_longitude not between -180 and 180
  then
    raise exception 'Invalid location values' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.dentistry_locations
    where dentistry_id = p_dentistry_id
      and location_id = p_location_id
  ) then
    raise exception 'Location not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.dentistry_locations
    where location_id = p_location_id
      and dentistry_id <> p_dentistry_id
  ) then
    raise exception 'Location ownership is ambiguous' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.locations
  where location_id = p_location_id
  for update;

  perform private.assert_location_media_input(
    v_user_id,
    p_dentistry_id,
    p_location_id,
    p_image_url,
    p_image_alt,
    p_image_decorative
  );

  update public.locations
  set
    business_name = btrim(p_business_name),
    full_address = btrim(p_full_address),
    country = btrim(coalesce(p_country, '')),
    city = btrim(p_city),
    area = btrim(coalesce(p_area, '')),
    latitude = p_latitude,
    longitude = p_longitude,
    image_url = nullif(btrim(coalesce(p_image_url, '')), ''),
    image_alt = case when p_image_decorative then null else btrim(p_image_alt) end,
    image_decorative = p_image_decorative,
    updated_at = clock_timestamp()
  where location_id = p_location_id
    and updated_at = p_expected_updated_at
  returning * into v_row;

  if not found then
    raise exception 'Location changed' using errcode = '40001';
  end if;

  if v_existing.image_url is distinct from v_row.image_url then
    v_old_path := private.dashboard_media_path(
      v_existing.image_url,
      'location-images',
      v_user_id,
      v_folder
    );
    if v_old_path is not null then
      perform private.enqueue_dashboard_media_cleanup(
        v_user_id,
        'location-images',
        v_old_path
      );
    end if;
  end if;

  return next v_row;
end;
$$;

create or replace function public.delete_dentistry_location(
  p_dentistry_id uuid,
  p_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_image_url text;
  v_old_path text;
  v_folder text := 'dentistries/' || p_dentistry_id::text || '/locations/' || p_location_id::text;
begin
  v_user_id := private.assert_dashboard_location_owner(p_dentistry_id);
  if not exists (
    select 1
    from public.dentistry_locations
    where dentistry_id = p_dentistry_id
      and location_id = p_location_id
  ) then
    raise exception 'Location not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.dentistry_locations
    where location_id = p_location_id
      and dentistry_id <> p_dentistry_id
  ) then
    raise exception 'Location ownership is ambiguous' using errcode = '42501';
  end if;

  select image_url
  into v_image_url
  from public.locations
  where location_id = p_location_id
  for update;

  v_old_path := private.dashboard_media_path(
    v_image_url,
    'location-images',
    v_user_id,
    v_folder
  );

  delete from public.dentistry_locations
  where dentistry_id = p_dentistry_id
    and location_id = p_location_id;

  delete from public.locations location
  where location.location_id = p_location_id
    and not exists (
      select 1
      from public.dentistry_locations link
      where link.location_id = location.location_id
    );

  if v_old_path is not null then
    perform private.enqueue_dashboard_media_cleanup(
      v_user_id,
      'location-images',
      v_old_path
    );
  end if;
end;
$$;

revoke all on function private.assert_location_media_input(uuid, uuid, uuid, text, text, boolean)
from public, anon, authenticated;
revoke all on function public.create_dentistry_location_with_media(
  uuid, uuid, text, text, text, text, text, numeric, numeric, text, text, boolean
)
from public, anon;
revoke all on function public.update_dentistry_location_with_media(
  uuid, uuid, timestamptz, text, text, text, text, text, numeric, numeric, text, text, boolean
)
from public, anon;
revoke all on function public.delete_dentistry_location(uuid, uuid)
from public, anon;
revoke all on function public.claim_dashboard_media_cleanup(uuid, text)
from public, anon;
revoke all on function private.enqueue_dashboard_media_cleanup(uuid, text, text)
from public, anon, authenticated;

grant execute on function public.create_dentistry_location_with_media(
  uuid, uuid, text, text, text, text, text, numeric, numeric, text, text, boolean
)
to authenticated;
grant execute on function public.update_dentistry_location_with_media(
  uuid, uuid, timestamptz, text, text, text, text, text, numeric, numeric, text, text, boolean
)
to authenticated;
grant execute on function public.delete_dentistry_location(uuid, uuid)
to authenticated;
grant execute on function public.claim_dashboard_media_cleanup(uuid, text)
to authenticated;
grant execute on function private.enqueue_dashboard_media_cleanup(uuid, text, text)
to service_role;
