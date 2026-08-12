begin;

select plan(11);

select
  '00000000-0000-0000-0000-000000000d01'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000d02'::uuid as other_id
\gset

set local role service_role;
insert into public.users (id, email, username, role, registered_domain)
values
  (:'owner_id', 'onboarding-owner@example.test', 'onboarding-owner', 'user', 'dental.bio'),
  (:'other_id', 'onboarding-other@example.test', 'onboarding-other', 'user', 'dental.bio');

select ok(
  not has_table_privilege('anon', 'public.profile_onboarding_progress', 'select')
  and not has_table_privilege('authenticated', 'public.profile_onboarding_progress', 'select')
  and not has_table_privilege('authenticated', 'public.profile_onboarding_progress', 'update'),
  'Progress rows cannot bypass the authenticated RPC boundary'
);

select ok(
  not has_function_privilege('anon', 'public.get_profile_onboarding_progress(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.complete_profile_onboarding_step(uuid,text,text)', 'execute')
  and has_function_privilege('authenticated', 'public.get_profile_onboarding_progress(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.complete_profile_onboarding_step(uuid,text,text)', 'execute'),
  'Only authenticated sessions can read or complete private progress'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  format($$ select * from public.get_profile_onboarding_progress(%L::uuid) $$, :'owner_id'),
  'A new owner starts without fabricated completion data'
);

select lives_ok(
  format(
    $$ select * from public.complete_profile_onboarding_step(%L::uuid, 'direct-booking', 'profile-details') $$,
    :'owner_id'
  ),
  'An owner can complete a controlled onboarding step'
);

select results_eq(
  format(
    $$ select template_id, completed_step_ids, revision from public.get_profile_onboarding_progress(%L::uuid) $$,
    :'owner_id'
  ),
  $$ values ('direct-booking'::text, array['profile-details']::text[], 0::bigint) $$,
  'The first completion is private, deterministic, and revisioned'
);

select lives_ok(
  format(
    $$ select * from public.complete_profile_onboarding_step(%L::uuid, 'direct-booking', 'locations') $$,
    :'owner_id'
  ),
  'Owners can complete another step for the same template'
);

select results_eq(
  format(
    $$ select completed_step_ids, revision from public.get_profile_onboarding_progress(%L::uuid) $$,
    :'owner_id'
  ),
  $$ values (array['locations','profile-details']::text[], 1::bigint) $$,
  'Repeated completion merges unique steps atomically'
);

select lives_ok(
  format(
    $$ select * from public.complete_profile_onboarding_step(%L::uuid, 'clinic-commerce', 'products') $$,
    :'owner_id'
  ),
  'Changing template starts a fresh template-specific progress set'
);

select results_eq(
  format(
    $$ select template_id, completed_step_ids, revision from public.get_profile_onboarding_progress(%L::uuid) $$,
    :'owner_id'
  ),
  $$ values ('clinic-commerce'::text, array['products']::text[], 2::bigint) $$,
  'Progress never leaks completed steps from another template'
);

select throws_ok(
  format(
    $$ select * from public.complete_profile_onboarding_step(%L::uuid, 'clinic-commerce', 'unknown-step') $$,
    :'owner_id'
  ),
  '22023',
  'Unknown onboarding step',
  'The database rejects unrecognized progress values'
);

select throws_ok(
  format(
    $$ select * from public.get_profile_onboarding_progress(%L::uuid) $$,
    :'other_id'
  ),
  '42501',
  'Not authorized',
  'An owner cannot read another profile progress'
);

select * from finish();
rollback;
