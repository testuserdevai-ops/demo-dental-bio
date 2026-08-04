begin;

select plan(27);

select
  '00000000-0000-0000-0000-000000000301'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000302'::uuid as other_id,
  '00000000-0000-0000-0000-000000000303'::uuid as admin_id
\gset

insert into public.users (id, email, username, role)
values
  (:'owner_id', 'phase6-owner@example.test', 'phase6-owner', 'user'),
  (:'other_id', 'phase6-other@example.test', 'phase6-other', 'user'),
  (:'admin_id', 'phase6-admin@example.test', 'phase6-admin', 'admin');

select has_index(
  'public',
  'users',
  'users_customer_id_unique',
  'Users have a unique Stripe customer authority index'
);
select ok(
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260804005957'
      and version > '20260803214923'
  ),
  'Unique Stripe customer ownership is delivered by a later imperative migration'
);
select throws_ok(
  $$
    update public.users
    set customer_id = 'cus_unique_phase6'
    where id in (
      '00000000-0000-0000-0000-000000000301',
      '00000000-0000-0000-0000-000000000302'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "users_customer_id_unique"',
  'A Stripe customer cannot be linked to multiple users'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(
  has_function_privilege('authenticated', 'public.is_dashboard_admin()', 'execute'),
  'Authenticated callers can execute the dashboard admin helper'
);

select throws_ok(
  $$ update public.users set role = 'admin' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set subscription_status = 'PRO' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set session_id = 'attacker-session' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set is_blocked = true where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set billing_cycle = 'annually'::public.billing_cycle_enum where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set registered_domain = 'coach.bio'::text where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set domain = 'owner-direct.example' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501',
  null,
  'Owner cannot bypass the verified custom-domain server route'
);
select throws_ok(
  $$ update public.users set use_dental_brand = false where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501',
  null,
  'Owner cannot bypass branding entitlement checks'
);
select lives_ok(
  $$ update public.users set first_name = 'Owner' where id = '00000000-0000-0000-0000-000000000301' $$,
  'Owner can update their presentation fields'
);
select is((select public.is_dashboard_admin()), false, 'Ordinary owner is not a dashboard admin');
select results_eq(
  $$ update public.users set first_name = 'Cross user' where id = '00000000-0000-0000-0000-000000000302' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'Ordinary owner cannot update another user presentation'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select ok(
  not has_function_privilege('anon', 'public.is_dashboard_admin()', 'execute'),
  'Anonymous callers cannot execute the dashboard admin helper'
);
select throws_ok(
  $$ update public.users set first_name = 'Anonymous' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select public.is_dashboard_admin()), true, 'Admin helper recognizes database-backed admin');
select throws_ok(
  $$ update public.users set role = 'user' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set billing_cycle = 'annually'::public.billing_cycle_enum where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501'
);
select throws_ok(
  $$ update public.users set domain = 'admin-direct.example' where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501',
  null,
  'Admin cannot bypass custom-domain provider compensation'
);
select throws_ok(
  $$ update public.users set use_dental_brand = false where id = '00000000-0000-0000-0000-000000000301' $$,
  '42501',
  null,
  'Admin cannot bypass branding route checks'
);
select lives_ok(
  $$ update public.users set first_name = 'Admin target update' where id = '00000000-0000-0000-0000-000000000301' $$,
  'Admin can update another user presentation fields'
);

set local role service_role;
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000301' $$,
  'Trusted service boundary can update verification authority'
);
select lives_ok(
  $$ update public.users set subscription_status = 'PRO' where id = '00000000-0000-0000-0000-000000000301' $$,
  'Trusted service boundary can update subscription authority'
);

select * from finish();
rollback;
