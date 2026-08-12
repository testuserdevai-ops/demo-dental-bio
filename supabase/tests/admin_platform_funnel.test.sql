begin;

select plan(18);

select
  '00000000-0000-4000-8000-00000000f101'::uuid as admin_id,
  '00000000-0000-4000-8000-00000000f102'::uuid as owner_one_id,
  '00000000-0000-4000-8000-00000000f103'::uuid as owner_two_id,
  '00000000-0000-4000-8000-00000000f104'::uuid as owner_three_id,
  '00000000-0000-4000-8000-00000000f201'::uuid as dentistry_one_id,
  '00000000-0000-4000-8000-00000000f202'::uuid as dentistry_two_id,
  '00000000-0000-4000-8000-00000000f203'::uuid as dentistry_three_id
\gset

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_user_meta_data
)
values
  (:'admin_id', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'funnel-admin@example.test', '', now() - interval '10 days',
    now() - interval '10 days', now(), '', '', '', '',
    '{"username":"funnel-admin","registered_domain":"dental.bio"}'::jsonb),
  (:'owner_one_id', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'funnel-one@example.test', '', now() - interval '47 hours',
    now() - interval '3 days', now(), '', '', '', '',
    '{"username":"funnel-one","registered_domain":"therapists.bio"}'::jsonb),
  (:'owner_two_id', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'funnel-two@example.test', '', now() - interval '46 hours',
    now() - interval '3 days', now(), '', '', '', '',
    '{"username":"funnel-two","registered_domain":"therapists.bio"}'::jsonb),
  (:'owner_three_id', '00000000-0000-0000-0000-000000000000', 'authenticated',
    'authenticated', 'funnel-three@example.test', '', now() - interval '45 hours',
    now() - interval '3 days', now(), '', '', '', '',
    '{"username":"funnel-three","registered_domain":"therapists.bio"}'::jsonb);

set local role service_role;

update public.users
set
  role = case when id = :'admin_id' then 'admin' else 'user' end,
  subscription_status = case
    when id = :'owner_one_id' then 'PRO'
    else 'FREE'
  end,
  created_at = case
    when id = :'admin_id' then now() - interval '10 days'
    else now() - interval '3 days'
  end,
  profile_presentation_published_at = case
    when id = :'owner_one_id' then now() - interval '28 hours'
    when id = :'owner_two_id' then now() - interval '20 hours'
    when id = :'owner_three_id' then now() - interval '18 hours'
    else null
  end
where id in (:'admin_id', :'owner_one_id', :'owner_two_id', :'owner_three_id');

insert into public.dentistries (
  dentistry_id, user_id, about_title, about_text
)
values
  (:'dentistry_one_id', :'owner_one_id', 'Owner one', 'Profile one'),
  (:'dentistry_two_id', :'owner_two_id', null, null),
  (:'dentistry_three_id', :'owner_three_id', 'Owner three', 'Profile three');

insert into public.registration_completions (
  user_id, registered_domain, referrer_user_id, base_trial_months,
  referral_bonus_months, completed_at
)
values
  (:'owner_one_id', 'therapists.bio', :'owner_three_id', 1, 1,
    now() - interval '44 hours'),
  (:'owner_three_id', 'therapists.bio', null, 1, 0,
    now() - interval '43 hours');

insert into public.profile_onboarding_progress (
  user_id, template_id, completed_step_ids, updated_at
)
values
  (:'owner_one_id', 'direct-booking', array[
    'profile-details', 'social-links', 'treatments', 'locations', 'links'
  ], now() - interval '30 hours'),
  (:'owner_three_id', 'basic', array[
    'profile-details', 'social-links', 'links', 'treatments', 'videos',
    'gallery', 'locations'
  ], now() - interval '24 hours');

reset role;

insert into public.public_analytics_events (
  event_id, schema_version, profile_id, occurred_at, received_at, event_date,
  action_type, section, consent_state, device_class
)
values
  (gen_random_uuid(), 1, :'owner_one_id', now() - interval '31 hours',
    now() - interval '31 hours', (now() at time zone 'UTC')::date - 1,
    'share_open', 'share', 'not_required', 'mobile'),
  (gen_random_uuid(), 1, :'owner_one_id', now() - interval '29 hours',
    now() - interval '29 hours', (now() at time zone 'UTC')::date - 1,
    'booking_click', 'profile', 'not_required', 'mobile'),
  (gen_random_uuid(), 1, :'owner_one_id', now() - interval '27 hours',
    now() - interval '27 hours', (now() at time zone 'UTC')::date - 1,
    'profile_view', 'profile', 'not_required', 'mobile'),
  (gen_random_uuid(), 1, :'owner_one_id', now() - interval '26 hours',
    now() - interval '26 hours', (now() at time zone 'UTC')::date - 1,
    'booking_click', 'profile', 'not_required', 'mobile'),
  (gen_random_uuid(), 1, :'owner_three_id', now() - interval '16 hours',
    now() - interval '16 hours', (now() at time zone 'UTC')::date - 1,
    'profile_view', 'profile', 'not_required', 'desktop');

select ok(
  not has_function_privilege(
    'anon',
    'public.get_admin_platform_funnel(date,date,text,text,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.get_admin_platform_funnel(date,date,text,text,text)',
    'execute'
  ),
  'Only authenticated sessions can reach the admin-authorized funnel RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', :'owner_one_id', true);

select throws_ok(
  $$ select public.get_admin_platform_funnel(current_date - 7, current_date) $$,
  '42501',
  'Admin authorization required',
  'An ordinary owner cannot read cross-account product analytics'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);

create temporary table funnel_result as
select public.get_admin_platform_funnel(
  current_date - 7, current_date, null, 'therapists.bio', 'all'
) as payload;

select is(
  (select (payload ->> 'cohortSize')::bigint from funnel_result),
  3::bigint,
  'The filtered signup cohort includes each owner once'
);

select results_eq(
  $$ select item ->> 'id', (item ->> 'count')::bigint
     from funnel_result,
     jsonb_array_elements(payload -> 'stages') item $$,
  $$ values
    ('registered'::text, 3::bigint),
    ('verified'::text, 3::bigint),
    ('onboarding_completed'::text, 2::bigint),
    ('profile_published'::text, 2::bigint),
    ('first_view'::text, 2::bigint),
    ('first_action'::text, 1::bigint) $$,
  'The authoritative stage chain is monotonic and reconciles exact journeys'
);

select is(
  (select (payload #>> '{trafficGaps,zeroTraffic}')::bigint from funnel_result),
  1::bigint,
  'A post-coverage published profile with no qualified view is a traffic gap'
);

select is(
  (select (payload #>> '{trafficGaps,zeroTrafficEligible}')::bigint from funnel_result),
  3::bigint,
  'The zero-traffic denominator excludes no post-coverage fixture'
);

select is(
  (select (payload #>> '{trafficGaps,viewedNoAction}')::bigint from funnel_result),
  1::bigint,
  'A viewed profile without a later outbound action is reported separately'
);

select results_eq(
  $$ select item ->> 'id', (item ->> 'count')::bigint
     from funnel_result,
     jsonb_array_elements(payload -> 'completionDistribution') item $$,
  $$ values
    ('0'::text, 1::bigint),
    ('1-25'::text, 0::bigint),
    ('26-50'::text, 0::bigint),
    ('51-74'::text, 0::bigint),
    ('75-99'::text, 0::bigint),
    ('100'::text, 2::bigint) $$,
  'Current template-specific completion distribution uses required step sets'
);

select is(
  (select (payload #>> '{registrationCoverage,completed}')::bigint from funnel_result),
  2::bigint,
  'Registration-ledger coverage is disclosed instead of treating missing history as zero'
);

select cmp_ok(
  (select count(*) from funnel_result,
    jsonb_array_elements(payload -> 'moduleAdoption') item),
  '=',
  9::bigint,
  'Module adoption returns every currently supported module in one RPC'
);

select cmp_ok(
  (select count(*) from funnel_result,
    jsonb_array_elements(payload -> 'unavailable') item),
  '>=',
  9::bigint,
  'Unsupported stages and dimensions are explicit capabilities, not false zeroes'
);

select is(
  (
    select (filtered ->> 'cohortSize')::bigint
    from (
      select public.get_admin_platform_funnel(
        current_date - 7, current_date, 'PRO', 'therapists.bio', 'all'
      ) filtered
    ) result
  ),
  1::bigint,
  'The plan filter is enforced inside the aggregate boundary'
);

select is(
  (
    select (filtered ->> 'cohortSize')::bigint
    from (
      select public.get_admin_platform_funnel(
        current_date - 7, current_date, null, 'therapists.bio', 'referred'
      ) filtered
    ) result
  ),
  1::bigint,
  'The referred cohort includes only an authoritative referral ledger row'
);

select is(
  (
    select (filtered ->> 'cohortSize')::bigint
    from (
      select public.get_admin_platform_funnel(
        current_date - 7, current_date, null, 'therapists.bio', 'organic'
      ) filtered
    ) result
  ),
  1::bigint,
  'The organic cohort excludes accounts without registration-ledger history'
);

select throws_ok(
  $$ select public.get_admin_platform_funnel(
       current_date - 7, current_date, null, null, 'paid-ish'
     ) $$,
  '22023',
  'Invalid platform funnel filter',
  'Unknown cohort filters fail closed'
);

select throws_ok(
  $$ select public.get_admin_platform_funnel(
       current_date - 731, current_date, null, null, 'all'
     ) $$,
  '22023',
  'Invalid platform funnel date range',
  'Cohort ranges cannot exceed retained analytics history'
);

select isnt(
  (
    select item ->> 'medianMinutesFromPrevious'
    from funnel_result,
    jsonb_array_elements(payload -> 'stages') item
    where item ->> 'id' = 'first_action'
  ),
  null,
  'Elapsed time is present when both adjacent timestamps are authoritative'
);

select is(
  (
    select item ->> 'medianMinutesFromPrevious'
    from funnel_result,
    jsonb_array_elements(payload -> 'stages') item
    where item ->> 'id' = 'onboarding_completed'
  ),
  null,
  'Onboarding elapsed time stays unavailable without immutable first completion'
);

select * from finish();
rollback;
