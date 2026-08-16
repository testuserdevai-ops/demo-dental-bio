begin;

select no_plan();

select
  '42000000-0000-4000-8000-000000000001'::uuid owner_id,
  '42000000-0000-4000-8000-000000000002'::uuid other_id,
  '42000000-0000-4000-8000-000000000003'::uuid admin_id,
  '42000000-0000-4000-8000-000000000011'::uuid owner_dentistry,
  '42000000-0000-4000-8000-000000000012'::uuid other_dentistry,
  '42000000-0000-4000-8000-000000000101'::uuid location_id,
  '42000000-0000-4000-8000-000000000102'::uuid delete_location_id,
  '42000000-0000-4000-8000-000000000103'::uuid admin_path_location_id,
  '42000000-0000-4000-8000-000000000104'::uuid no_image_location_id,
  '42000000-0000-4000-8000-000000000105'::uuid missing_object_location_id,
  '42000000-0000-4000-8000-000000000106'::uuid shared_location_id,
  '42000000-0000-4000-8000-000000000107'::uuid limit_location_id,
  '42000000-0000-4000-8000-000000000108'::uuid storage_policy_location_id
\gset

insert into public.users (id, email, username, role, subscription_status)
values
  (:'owner_id', 'location-media-owner@example.test', 'location-media-owner', 'user', 'PRO'),
  (:'other_id', 'location-media-other@example.test', 'location-media-other', 'user', 'PRO'),
  (:'admin_id', 'location-media-admin@example.test', 'location-media-admin', 'admin', 'PRO');

insert into public.dentistries (dentistry_id, user_id, location_title)
values
  (:'owner_dentistry', :'owner_id', 'Owner locations'),
  (:'other_dentistry', :'other_id', 'Other locations');

insert into public.locations (
  location_id, business_name, full_address, country, city, area,
  latitude, longitude
)
values (
  :'shared_location_id', 'Legacy shared clinic', '8 Shared Street', 'UK',
  'London', '', 51.2, -0.1
);
insert into public.dentistry_locations (dentistry_id, location_id)
values
  (:'owner_dentistry', :'shared_location_id'),
  (:'other_dentistry', :'shared_location_id');

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'image_url'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'image_alt'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'locations' and column_name = 'image_decorative'
  ),
  'Locations expose optional image presentation fields'
);

select results_eq(
  $$
    select public, file_size_limit::bigint, allowed_mime_types::text
    from storage.buckets where id = 'location-images'
  $$,
  $$ values (true, 8388608::bigint, '{image/jpeg,image/png,image/webp}'::text) $$,
  'Location bucket is public with exact size and MIME restrictions'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_dentistry_location_with_media(uuid,uuid,text,text,text,text,text,numeric,numeric,text,text,boolean)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_dentistry_location_with_media(uuid,uuid,text,text,text,text,text,numeric,numeric,text,text,boolean)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'private.assert_location_media_input(uuid,uuid,uuid,text,text,boolean)',
    'execute'
  ),
  'Only authenticated callers can invoke the public media RPC boundary'
);

select ok(
  (
    select proconfig @> array['search_path=""']
    from pg_proc
    where oid = 'public.create_dentistry_location_with_media(uuid,uuid,text,text,text,text,text,numeric,numeric,text,text,boolean)'::regprocedure
  ) and (
    select proconfig @> array['search_path=""']
    from pg_proc
    where oid = 'public.update_dentistry_location_with_media(uuid,uuid,timestamp with time zone,text,text,text,text,text,numeric,numeric,text,text,boolean)'::regprocedure
  ),
  'Location media RPCs pin an empty search path'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', :'owner_id',
    'role', 'authenticated',
    'iss', 'http://127.0.0.1:54321/auth/v1'
  )::text,
  true
);

select lives_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/first.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'location_id', :'owner_id'
  ),
  'Owner uploads to the exact pending dentistry/location path'
);

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'location-images'
      and name = :'owner_id' || '/dentistries/' || :'owner_dentistry' || '/locations/' || :'location_id' || '/first.webp'
  ),
  1,
  'Owner can select an exact scoped location object'
);

select lives_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/policy.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'storage_policy_location_id', :'owner_id'
  ),
  'Owner inserts a temporary exact-path object for update/delete policy checks'
);

select lives_ok(
  format(
    $$
      update storage.objects
      set metadata = jsonb_build_object('verified', true)
      where bucket_id = 'location-images'
        and name = '%s/dentistries/%s/locations/%s/policy.webp'
    $$,
    :'owner_id', :'owner_dentistry', :'storage_policy_location_id'
  ),
  'Owner can update an exact scoped location object'
);

select throws_ok(
  format(
    $$
      delete from storage.objects
      where bucket_id = 'location-images'
        and name = '%s/dentistries/%s/locations/%s/policy.webp'
    $$,
    :'owner_id', :'owner_dentistry', :'storage_policy_location_id'
  ),
  '42501',
  'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'Storage protects exact scoped objects from direct SQL deletion; owner deletion uses the Storage API'
);

select throws_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/forged.webp',
        '%s'
      )
    $$,
    :'other_id', :'other_dentistry', :'location_id', :'owner_id'
  ),
  '42501',
  null,
  'Owner cannot upload into another owner dentistry path'
);

select throws_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/../escape.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'location_id', :'owner_id'
  ),
  '42501',
  null,
  'Traversal-shaped location image paths are rejected by Storage RLS'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Forged clinic', '1 Other Street', 'UK', 'London', '', 51.5, -0.1,
        null, null, true
      )
    $$,
    :'other_dentistry', :'location_id'
  ),
  '42501',
  null,
  'Owner cannot create location media for another dentistry'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Owner clinic', '1 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/first.webp',
        null, false
      )
    $$,
    :'owner_dentistry', :'location_id', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  '22023',
  null,
  'Informative location image requires alt text'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Missing media clinic', '2 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/missing.webp',
        null, true
      )
    $$,
    :'owner_dentistry', :'missing_object_location_id', :'owner_id', :'owner_dentistry', :'missing_object_location_id'
  ),
  '22023',
  null,
  'A scoped URL cannot be saved unless the exact Storage object exists'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Forged-origin clinic', '2 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'https://evil.example/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/first.webp',
        null, true
      )
    $$,
    :'owner_dentistry', :'missing_object_location_id', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  '22023',
  null,
  'A foreign Storage origin is rejected even when the suffix names a real object'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Forged-path clinic', '2 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/first.webp',
        null, true
      )
    $$,
    :'owner_dentistry', :'missing_object_location_id', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  '22023',
  null,
  'A real object belonging to another location path cannot be forged into the new record'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Invalid decorative clinic', '2 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/first.webp',
        'Decorative text is forbidden', true
      )
    $$,
    :'owner_dentistry', :'location_id', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  '22023',
  null,
  'Decorative location images reject alternative text'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'No-image informative clinic', '2 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        null, 'Impossible description', false
      )
    $$,
    :'owner_dentistry', :'missing_object_location_id'
  ),
  '22023',
  null,
  'A missing image cannot be marked informative or retain alternative text'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Null-coordinate clinic', '2 Owner Street', 'UK', 'London', '', null, null,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'missing_object_location_id'
  ),
  '22023',
  null,
  'RPC validation rejects null coordinates instead of accepting SQL unknown'
);

select lives_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'No-image clinic', '4 Owner Street', 'UK', 'London', '', 51.4, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'no_image_location_id'
  ),
  'Owner atomically creates a location without optional media'
);

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Duplicate clinic', '4 Owner Street', 'UK', 'London', '', 51.4, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'no_image_location_id'
  ),
  '23505',
  null,
  'Client-generated location IDs cannot be reused'
);

select lives_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Owner clinic', '1 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/first.webp',
        'Front entrance to Owner clinic', false
      )
    $$,
    :'owner_dentistry', :'location_id', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  'Owner atomically creates a location with informative media'
);

select results_eq(
  format(
    $$
      select image_alt::text, image_decorative
      from public.locations where location_id = '%s'
    $$,
    :'location_id'
  ),
  $$ values ('Front entrance to Owner clinic'::text, false) $$,
  'Created location persists normalized informative presentation'
);

select updated_at shared_revision
from public.locations where location_id = :'shared_location_id'
\gset

select throws_ok(
  format(
    $$
      select * from public.update_dentistry_location_with_media(
        '%s', '%s', '%s', 'Legacy shared clinic', '8 Shared Street', 'UK', 'London', '', 51.2, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'shared_location_id', :'shared_revision'
  ),
  '42501',
  null,
  'Legacy locations linked to multiple dentistries cannot be updated'
);

select throws_ok(
  format(
    $$ select public.delete_dentistry_location('%s', '%s') $$,
    :'owner_dentistry', :'shared_location_id'
  ),
  '42501',
  null,
  'Legacy locations linked to multiple dentistries cannot be deleted'
);

select lives_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/replacement.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'location_id', :'owner_id'
  ),
  'Owner uploads a replacement object'
);

select updated_at old_revision
from public.locations where location_id = :'location_id'
\gset

select lives_ok(
  format(
    $$
      select * from public.update_dentistry_location_with_media(
        '%s', '%s', '%s', 'Owner clinic', '1 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/replacement.webp',
        null, true
      )
    $$,
    :'owner_dentistry', :'location_id', :'old_revision', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  'Owner replaces an informative image with a decorative image'
);

reset role;
select is(
  (
    select count(*)::integer from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id'
      and bucket = 'location-images'
      and object_path = :'owner_id' || '/dentistries/' || :'owner_dentistry' || '/locations/' || :'location_id' || '/first.webp'
      and completed_at is null
  ),
  1,
  'Successful replacement queues exactly the previous object'
);
set local role authenticated;

select throws_ok(
  format(
    $$
      select * from public.update_dentistry_location_with_media(
        '%s', '%s', '%s', 'Stale clinic', '2 Stale Street', 'UK', 'London', '', 51.6, -0.2,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/replacement.webp',
        null, true
      )
    $$,
    :'owner_dentistry', :'location_id', :'old_revision', :'owner_id', :'owner_dentistry', :'location_id'
  ),
  '40001',
  null,
  'Stale media update is rejected with the address draft'
);

select results_eq(
  format(
    $$ select business_name::text, image_decorative from public.locations where location_id = '%s' $$,
    :'location_id'
  ),
  $$ values ('Owner clinic'::text, true) $$,
  'Stale update preserves the winning address and media'
);

reset role;
select is(
  (
    select count(*)::integer from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id'
      and bucket = 'location-images'
      and object_path = :'owner_id' || '/dentistries/' || :'owner_dentistry' || '/locations/' || :'location_id' || '/replacement.webp'
  ),
  0,
  'A stale update never queues the authoritative replacement image'
);
set local role authenticated;

select updated_at replacement_revision
from public.locations where location_id = :'location_id'
\gset

select lives_ok(
  format(
    $$
      select * from public.update_dentistry_location_with_media(
        '%s', '%s', '%s', 'Owner clinic', '1 Owner Street', 'UK', 'London', '', 51.5, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'location_id', :'replacement_revision'
  ),
  'Owner removes location media without deleting the location'
);

reset role;
select is(
  (
    select count(*)::integer from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id'
      and bucket = 'location-images'
      and object_path = :'owner_id' || '/dentistries/' || :'owner_dentistry' || '/locations/' || :'location_id' || '/replacement.webp'
      and completed_at is null
  ),
  1,
  'Successful removal queues the replaced object exactly once'
);
set local role authenticated;

select lives_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/delete.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'delete_location_id', :'owner_id'
  ),
  'Owner uploads media for a second location'
);

select lives_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Delete clinic', '3 Delete Street', 'UK', 'London', '', 51.7, -0.3,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/delete.webp',
        'Delete clinic reception', false
      )
    $$,
    :'owner_dentistry', :'delete_location_id', :'owner_id', :'owner_dentistry', :'delete_location_id'
  ),
  'Owner creates another location with media'
);

select lives_ok(
  format(
    $$ select public.delete_dentistry_location('%s', '%s') $$,
    :'owner_dentistry', :'delete_location_id'
  ),
  'Deleting a location with media succeeds atomically'
);

reset role;
select is(
  (
    select count(*)::integer from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id'
      and bucket = 'location-images'
      and object_path = :'owner_id' || '/dentistries/' || :'owner_dentistry' || '/locations/' || :'delete_location_id' || '/delete.webp'
      and completed_at is null
  ),
  1,
  'Location deletion queues its material object'
);
set local role authenticated;

select lives_ok(
  format(
    $$ select public.delete_dentistry_location('%s', '%s') $$,
    :'owner_dentistry', :'location_id'
  ),
  'Deleting the remaining no-image location succeeds'
);

reset role;
select count(*) cleanup_count_before_no_image_delete
from private.dashboard_media_cleanup_jobs
where user_id = :'owner_id' and bucket = 'location-images'
\gset
set local role authenticated;

select lives_ok(
  format(
    $$ select public.delete_dentistry_location('%s', '%s') $$,
    :'owner_dentistry', :'no_image_location_id'
  ),
  'Deleting a location created without media succeeds'
);

reset role;
select is(
  (
    select count(*)::bigint
    from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id' and bucket = 'location-images'
  ),
  :'cleanup_count_before_no_image_delete'::bigint,
  'Deleting a no-image location never creates a cleanup job'
);

set local role service_role;
update public.users set subscription_status = 'FREE' where id = :'owner_id';
set local role authenticated;

select throws_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Over-limit clinic', '9 Limit Street', 'UK', 'London', '', 51.1, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'limit_location_id'
  ),
  '23514',
  null,
  'The media-aware create RPC preserves the subscription location limit'
);

set local role service_role;
update public.users set subscription_status = 'PRO' where id = :'owner_id';

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', :'admin_id',
    'role', 'authenticated',
    'iss', 'http://127.0.0.1:54321/auth/v1'
  )::text,
  true
);

select lives_ok(
  format(
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'location-images',
        '%s/dentistries/%s/locations/%s/admin.webp',
        '%s'
      )
    $$,
    :'owner_id', :'owner_dentistry', :'admin_path_location_id', :'admin_id'
  ),
  'Verified dashboard admin uploads under the target owner path'
);

select lives_ok(
  format(
    $$
      select * from public.create_dentistry_location_with_media(
        '%s', '%s', 'Admin-managed clinic', '5 Owner Street', 'UK', 'London', '', 51.3, -0.1,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/%s/dentistries/%s/locations/%s/admin.webp',
        'Admin-managed clinic reception', false
      )
    $$,
    :'owner_dentistry', :'admin_path_location_id', :'owner_id', :'owner_dentistry', :'admin_path_location_id'
  ),
  'Verified dashboard admin creates media under the target owner scope'
);

select results_eq(
  format(
    $$
      select image_alt::text, image_decorative
      from public.locations where location_id = '%s'
    $$,
    :'admin_path_location_id'
  ),
  $$ values ('Admin-managed clinic reception'::text, false) $$,
  'Admin-managed media remains owned by the target location record'
);

select is(
  (
    select count(*)::integer
    from public.claim_dashboard_media_cleanup(:'owner_id', 'location-images')
  ),
  3,
  'Verified admin can claim the target owner location cleanup queue'
);

select array_agg(job_id order by job_id) claimed_location_job_ids
from public.claim_dashboard_media_cleanup(:'owner_id', 'location-images')
\gset

select lives_ok(
  format(
    $$ select public.complete_dashboard_media_cleanup('%s', '%s'::uuid[]) $$,
    :'owner_id', :'claimed_location_job_ids'
  ),
  'Verified admin completes the claimed location cleanup jobs'
);

reset role;
select is(
  (
    select count(*)::integer
    from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id'
      and bucket = 'location-images'
      and completed_at is not null
  ),
  3,
  'Cleanup completion durably marks every claimed location job'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'other_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', :'other_id',
    'role', 'authenticated',
    'iss', 'http://127.0.0.1:54321/auth/v1'
  )::text,
  true
);

select updated_at admin_managed_revision
from public.locations where location_id = :'admin_path_location_id'
\gset

select throws_ok(
  format(
    $$
      select * from public.update_dentistry_location_with_media(
        '%s', '%s', '%s', 'Forged other-owner update', '5 Owner Street', 'UK', 'London', '', 51.3, -0.1,
        null, null, true
      )
    $$,
    :'owner_dentistry', :'admin_path_location_id', :'admin_managed_revision'
  ),
  '42501',
  null,
  'Another owner cannot update location media in the target dentistry'
);

select throws_ok(
  format(
    $$ select public.delete_dentistry_location('%s', '%s') $$,
    :'owner_dentistry', :'admin_path_location_id'
  ),
  '42501',
  null,
  'Another owner cannot delete the target dentistry location'
);

select throws_ok(
  format(
    $$ select * from public.claim_dashboard_media_cleanup('%s', 'location-images') $$,
    :'owner_id'
  ),
  '42501',
  null,
  'Another owner cannot claim location cleanup work'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok(
  $$ select * from public.users limit 1 $$,
  '42501',
  null,
  'Anonymous location readers still cannot access private users'
);

reset role;
select * from finish();
rollback;
