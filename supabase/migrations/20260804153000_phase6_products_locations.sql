-- Phase 6 product/location authority, product ordering/media, and versioned locations.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

alter table public.locations
  add column if not exists updated_at timestamptz not null default now();

alter table private.dashboard_media_cleanup_jobs
  drop constraint if exists dashboard_media_cleanup_jobs_bucket_check;
alter table private.dashboard_media_cleanup_jobs
  add constraint dashboard_media_cleanup_jobs_bucket_check
  check (bucket in ('gallery-images', 'review-images', 'blog-images', 'product-images'));

create or replace function private.enqueue_dashboard_media_cleanup(
  p_user_id uuid, p_bucket text, p_object_path text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images', 'product-images')
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
  if p_bucket not in ('gallery-images', 'review-images', 'blog-images', 'product-images')
  then raise exception 'Cleanup bucket is invalid' using errcode = '22023'; end if;
  return query
  with claimed as (
    select jobs.id from private.dashboard_media_cleanup_jobs jobs
    where jobs.user_id = p_user_id and jobs.bucket = p_bucket
      and jobs.completed_at is null
    order by jobs.created_at limit 50 for update skip locked
  )
  update private.dashboard_media_cleanup_jobs jobs set attempts = attempts + 1
  from claimed where jobs.id = claimed.id
  returning jobs.id, jobs.bucket, jobs.object_path;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['products', 'locations', 'dentistry_locations'] loop
    execute format('drop policy if exists %I on public.%I', 'Enable insert for authenticated users only', v_table);
    execute format('drop policy if exists %I on public.%I', 'Enable update for users based on email', v_table);
    execute format('drop policy if exists %I on public.%I', 'Enable delete for users based on user_id', v_table);
  end loop;
end;
$$;

revoke insert, update, delete on table public.products, public.locations, public.dentistry_locations
from anon, authenticated;

drop policy if exists "authenticated_allow 16wiy3a_0" on storage.objects;
drop policy if exists "authenticated_allow 16wiy3a_1" on storage.objects;
drop policy if exists "authenticated_allow 16wiy3a_2" on storage.objects;
drop policy if exists "authenticated_allow 16wiy3a_3" on storage.objects;
drop policy if exists "Owners can insert product images" on storage.objects;
drop policy if exists "Owners can update product images" on storage.objects;
drop policy if exists "Owners can delete product images" on storage.objects;

create policy "Owners can insert product images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[2] = 'products'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can update product images" on storage.objects
for update to authenticated using (
  bucket_id = 'product-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
) with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[2] = 'products'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);
create policy "Owners can delete product images" on storage.objects
for delete to authenticated using (
  bucket_id = 'product-images'
  and ((storage.foldername(name))[1] = (select auth.uid())::text
    or (select public.is_dashboard_admin()))
);

create or replace function private.assert_dashboard_location_owner(p_dentistry_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid;
begin
  select user_id into v_user_id from public.dentistries
  where dentistry_id = p_dentistry_id;
  if v_user_id is null or (select auth.uid()) is null or (
    v_user_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Location target is not authorized' using errcode = '42501'; end if;
  return v_user_id;
end;
$$;

create or replace function public.create_individual_product(
  p_user_id uuid, p_name text, p_url text, p_platform text, p_image_url text,
  p_price double precision, p_currency text, p_enabled boolean
)
returns setof public.products language plpgsql security definer set search_path = '' as $$
declare v_row public.products%rowtype; v_rank integer;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  if btrim(coalesce(p_name,'')) = '' or length(btrim(p_name)) > 150
    or lower(btrim(coalesce(p_url,''))) !~ '^https://'
    or btrim(coalesce(p_platform,'')) = '' or length(btrim(p_platform)) > 100
    or p_price is null or p_price < 0
    or p_price in ('Infinity'::double precision,'-Infinity'::double precision,'NaN'::double precision)
    or btrim(coalesce(p_currency,'')) = '' or length(btrim(p_currency)) > 20
    or nullif(p_image_url,'') is null
    or private.dashboard_media_path(p_image_url,'product-images',p_user_id,'products') is null
  then raise exception 'Invalid product values' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('products:' || p_user_id::text, 0));
  select coalesce(max(rank),0)+1 into v_rank from public.products where user_id=p_user_id;
  insert into public.products(user_id,name,link,platform,image_url,price,currency,enabled,rank)
  values(p_user_id,btrim(p_name),btrim(p_url),btrim(p_platform),p_image_url,p_price,btrim(p_currency),p_enabled,v_rank)
  returning * into v_row;
  return next v_row;
end;
$$;

create or replace function public.update_individual_product(
  p_user_id uuid, p_product_id bigint, p_name text, p_url text, p_platform text,
  p_image_url text, p_price double precision, p_currency text, p_enabled boolean
)
returns setof public.products language plpgsql security definer set search_path = '' as $$
declare v_row public.products%rowtype; v_old_url text; v_path text;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  select image_url into v_old_url from public.products
  where id=p_product_id and user_id=p_user_id for update;
  if not found then raise exception 'Product not found' using errcode='P0002'; end if;
  if btrim(coalesce(p_name,'')) = '' or length(btrim(p_name)) > 150
    or lower(btrim(coalesce(p_url,''))) !~ '^https://'
    or btrim(coalesce(p_platform,'')) = '' or length(btrim(p_platform)) > 100
    or p_price is null or p_price < 0
    or p_price in ('Infinity'::double precision,'-Infinity'::double precision,'NaN'::double precision)
    or btrim(coalesce(p_currency,'')) = '' or length(btrim(p_currency)) > 20
    or (p_image_url is distinct from v_old_url
      and private.dashboard_media_path(p_image_url,'product-images',p_user_id,'products') is null)
  then raise exception 'Invalid product values' using errcode='22023'; end if;
  update public.products set name=btrim(p_name), link=btrim(p_url), platform=btrim(p_platform),
    image_url=p_image_url, price=p_price, currency=btrim(p_currency), enabled=p_enabled
  where id=p_product_id and user_id=p_user_id returning * into v_row;
  if p_image_url is distinct from v_old_url then
    v_path := private.dashboard_media_path(v_old_url,'product-images',p_user_id,'products');
    if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id,'product-images',v_path); end if;
  end if;
  return next v_row;
end;
$$;

create or replace function public.delete_individual_product(p_user_id uuid,p_product_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old_url text; v_path text;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  delete from public.products where id=p_product_id and user_id=p_user_id
  returning image_url into v_old_url;
  if not found then raise exception 'Product not found' using errcode='P0002'; end if;
  v_path := private.dashboard_media_path(v_old_url,'product-images',p_user_id,'products');
  if v_path is not null then perform private.enqueue_dashboard_media_cleanup(p_user_id,'product-images',v_path); end if;
end;
$$;

create or replace function public.reorder_individual_products(p_user_id uuid,p_product_ids bigint[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  perform private.assert_dashboard_content_owner(p_user_id);
  perform pg_advisory_xact_lock(hashtextextended('products:' || p_user_id::text, 0));
  select count(*) into v_count from public.products where user_id=p_user_id;
  if p_product_ids is null or cardinality(p_product_ids) <> v_count
    or cardinality(p_product_ids) <> (select count(distinct id) from unnest(p_product_ids) id)
    or exists(select 1 from unnest(p_product_ids) id where not exists(
      select 1 from public.products where products.id=id and user_id=p_user_id))
  then raise exception 'Product order is not exact' using errcode='22023'; end if;
  update public.products product set rank=ordered.position
  from unnest(p_product_ids) with ordinality ordered(id,position)
  where product.id=ordered.id and product.user_id=p_user_id;
end;
$$;

create or replace function public.save_dentistry_location_title(p_dentistry_id uuid,p_title text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_title text;
begin
  perform private.assert_dashboard_location_owner(p_dentistry_id);
  if btrim(coalesce(p_title,''))='' or length(btrim(p_title))>100
  then raise exception 'Invalid location title' using errcode='22023'; end if;
  update public.dentistries set location_title=btrim(p_title)
  where dentistry_id=p_dentistry_id returning location_title into v_title;
  return v_title;
end;
$$;

create or replace function public.create_dentistry_location(
  p_dentistry_id uuid,p_business_name text,p_full_address text,p_country text,
  p_city text,p_area text,p_latitude numeric,p_longitude numeric
)
returns setof public.locations language plpgsql security definer set search_path = '' as $$
declare v_row public.locations%rowtype; v_user_id uuid; v_limit integer; v_count integer;
begin
  v_user_id := private.assert_dashboard_location_owner(p_dentistry_id);
  if btrim(coalesce(p_business_name,''))='' or btrim(coalesce(p_full_address,''))=''
    or btrim(coalesce(p_city,''))='' or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then raise exception 'Invalid location values' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('locations:'||p_dentistry_id::text,0));
  select case when subscription_status in ('PRO','PREMIUM PRO') or trial_end>now()
    then 2147483647 else 1 end into v_limit from public.users where id=v_user_id;
  select count(*) into v_count from public.dentistry_locations where dentistry_id=p_dentistry_id;
  if v_count>=v_limit then raise exception 'Location limit reached' using errcode='23514'; end if;
  insert into public.locations(business_name,full_address,country,city,area,latitude,longitude)
  values(btrim(p_business_name),btrim(p_full_address),btrim(coalesce(p_country,'')),btrim(p_city),
    btrim(coalesce(p_area,'')),p_latitude,p_longitude) returning * into v_row;
  insert into public.dentistry_locations(dentistry_id,location_id)
  values(p_dentistry_id,v_row.location_id);
  return next v_row;
end;
$$;

create or replace function public.update_dentistry_location(
  p_dentistry_id uuid,p_location_id uuid,p_expected_updated_at timestamptz,
  p_business_name text,p_full_address text,p_country text,p_city text,p_area text,
  p_latitude numeric,p_longitude numeric
)
returns setof public.locations language plpgsql security definer set search_path = '' as $$
declare v_row public.locations%rowtype;
begin
  perform private.assert_dashboard_location_owner(p_dentistry_id);
  if btrim(coalesce(p_business_name,''))='' or btrim(coalesce(p_full_address,''))=''
    or btrim(coalesce(p_city,''))='' or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
  then raise exception 'Invalid location values' using errcode='22023'; end if;
  if not exists(select 1 from public.dentistry_locations where dentistry_id=p_dentistry_id and location_id=p_location_id)
  then raise exception 'Location not found' using errcode='P0002'; end if;
  if exists(select 1 from public.dentistry_locations where location_id=p_location_id and dentistry_id<>p_dentistry_id)
  then raise exception 'Location ownership is ambiguous' using errcode='42501'; end if;
  update public.locations set business_name=btrim(p_business_name),full_address=btrim(p_full_address),
    country=btrim(coalesce(p_country,'')),city=btrim(p_city),area=btrim(coalesce(p_area,'')),
    latitude=p_latitude,longitude=p_longitude,updated_at=clock_timestamp()
  where location_id=p_location_id and updated_at=p_expected_updated_at returning * into v_row;
  if not found then raise exception 'Location changed' using errcode='40001'; end if;
  return next v_row;
end;
$$;

create or replace function public.delete_dentistry_location(p_dentistry_id uuid,p_location_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_dashboard_location_owner(p_dentistry_id);
  if not exists(select 1 from public.dentistry_locations where dentistry_id=p_dentistry_id and location_id=p_location_id)
  then raise exception 'Location not found' using errcode='P0002'; end if;
  if exists(select 1 from public.dentistry_locations where location_id=p_location_id and dentistry_id<>p_dentistry_id)
  then raise exception 'Location ownership is ambiguous' using errcode='42501'; end if;
  delete from public.dentistry_locations where dentistry_id=p_dentistry_id and location_id=p_location_id;
  delete from public.locations l where l.location_id=p_location_id
    and not exists(select 1 from public.dentistry_locations dl where dl.location_id=l.location_id);
end;
$$;

revoke all on function public.create_individual_product(uuid,text,text,text,text,double precision,text,boolean) from public,anon;
revoke all on function public.update_individual_product(uuid,bigint,text,text,text,text,double precision,text,boolean) from public,anon;
revoke all on function public.delete_individual_product(uuid,bigint) from public,anon;
revoke all on function public.reorder_individual_products(uuid,bigint[]) from public,anon;
revoke all on function public.save_dentistry_location_title(uuid,text) from public,anon;
revoke all on function public.create_dentistry_location(uuid,text,text,text,text,text,numeric,numeric) from public,anon;
revoke all on function public.update_dentistry_location(uuid,uuid,timestamptz,text,text,text,text,text,numeric,numeric) from public,anon;
revoke all on function public.delete_dentistry_location(uuid,uuid) from public,anon;

grant execute on function public.create_individual_product(uuid,text,text,text,text,double precision,text,boolean) to authenticated;
grant execute on function public.update_individual_product(uuid,bigint,text,text,text,text,double precision,text,boolean) to authenticated;
grant execute on function public.delete_individual_product(uuid,bigint) to authenticated;
grant execute on function public.reorder_individual_products(uuid,bigint[]) to authenticated;
grant execute on function public.save_dentistry_location_title(uuid,text) to authenticated;
grant execute on function public.create_dentistry_location(uuid,text,text,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.update_dentistry_location(uuid,uuid,timestamptz,text,text,text,text,text,numeric,numeric) to authenticated;
grant execute on function public.delete_dentistry_location(uuid,uuid) to authenticated;
