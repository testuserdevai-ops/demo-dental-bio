begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000901'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000902'::uuid as other_id,
  '00000000-0000-0000-0000-000000000903'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000911'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000912'::uuid as other_dentistry_id,
  '00000000-0000-0000-0000-000000000913'::uuid as admin_dentistry_id
\gset

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260810123521'
  ),
  'Public-profile data-boundary migration is applied'
);

select is(
  (
    select array_agg(column_name::text order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'public_profiles'
  ),
  array[
    'profile_id',
    'dentistry_id',
    'username',
    'position',
    'first_name',
    'last_name',
    'title',
    'gdc_no',
    'qualification',
    'isVerified',
    'use_dental_brand',
    'subscription_status',
    'registered_domain',
    'verified_domain',
    'updated_at'
  ]::text[],
  'Public projection contains only approved profile and routing fields'
);

select ok(
  has_table_privilege('anon', 'public.public_profiles', 'select')
  and not has_table_privilege('anon', 'public.public_profiles', 'insert')
  and not has_table_privilege('anon', 'public.public_profiles', 'update')
  and not has_table_privilege('anon', 'public.public_profiles', 'delete')
  and not has_table_privilege('anon', 'public.users', 'select'),
  'Anonymous grants reach only the read-only public projection'
);

select has_index(
  'public',
  'public_profiles',
  'public_profiles_verified_domain_unique_idx',
  'Verified custom-domain lookups use a unique directory index'
);

select ok(
  not has_function_privilege('anon', 'private.sync_public_profile(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'private.sync_public_profile(uuid)', 'execute'),
  'Projection synchronization cannot be invoked through public sessions'
);

set local role service_role;
insert into public.users (
  id,
  email,
  username,
  role,
  domain,
  domain_verified,
  registered_domain
)
values
  (:'owner_id', 'directory-owner@example.test', 'directory-owner', 'user', 'owner.example.test', false, 'dental.bio'),
  (:'other_id', 'directory-other@example.test', 'directory-other', 'user', null, false, 'coach.bio'),
  (:'admin_id', 'directory-admin@example.test', 'directory-admin', 'admin', null, false, 'dental.bio');

select is(
  (select count(*)::integer from public.public_profiles where profile_id = :'owner_id'),
  0,
  'A user without a dentistry is not a routable public profile'
);

insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id'),
  (:'admin_dentistry_id', :'admin_id');

select results_eq(
  $$
    select username::text, registered_domain::text, verified_domain::text
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000901'::uuid
  $$,
  $$ values ('directory-owner'::text, 'dental.bio'::text, null::text) $$,
  'Dentistry creation publishes the approved user projection without an unverified domain'
);

update public.users
set username = 'directory-renamed', domain_verified = true
where id = :'owner_id';

select results_eq(
  $$
    select username::text, verified_domain::text
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000901'::uuid
  $$,
  $$ values ('directory-renamed'::text, 'owner.example.test'::text) $$,
  'Username and verified-domain changes synchronize immediately'
);

update public.users set is_blocked = true where id = :'owner_id';
select is(
  (select count(*)::integer from public.public_profiles where profile_id = :'owner_id'),
  0,
  'Blocking a user removes the routable profile'
);

update public.users set is_blocked = false where id = :'owner_id';
select is(
  (select count(*)::integer from public.public_profiles where profile_id = :'owner_id'),
  1,
  'Unblocking a user restores the routable profile'
);

delete from public.dentistries where dentistry_id = :'owner_dentistry_id';
select is(
  (select count(*)::integer from public.public_profiles where profile_id = :'owner_id'),
  0,
  'Dentistry deletion removes the routable profile'
);

insert into public.dentistries (dentistry_id, user_id)
values (:'owner_dentistry_id', :'owner_id');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select results_eq(
  $$ select username::text from public.public_profiles where profile_id = '00000000-0000-0000-0000-000000000901'::uuid $$,
  $$ values ('directory-renamed'::text) $$,
  'Anonymous callers can resolve an approved public profile'
);
select throws_ok(
  $$ select email from public.users where id = '00000000-0000-0000-0000-000000000901'::uuid $$,
  '42501',
  null,
  'Anonymous callers cannot read private account columns'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$ select id from public.users where id in ('00000000-0000-0000-0000-000000000901'::uuid, '00000000-0000-0000-0000-000000000902'::uuid) order by id $$,
  $$ values ('00000000-0000-0000-0000-000000000901'::uuid) $$,
  'Authenticated owners can read only their own account row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$ select id from public.users where id = '00000000-0000-0000-0000-000000000902'::uuid $$,
  $$ values ('00000000-0000-0000-0000-000000000902'::uuid) $$,
  'Unblocked dashboard admins retain authorized account reads'
);

set local role service_role;
delete from public.users where id = :'owner_id';
select is(
  (select count(*)::integer from public.public_profiles where profile_id = :'owner_id'),
  0,
  'User deletion removes the public projection'
);

select * from finish();
rollback;
