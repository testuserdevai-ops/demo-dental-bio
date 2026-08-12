begin;

select plan(7);

select
  '00000000-0000-4000-8000-00000000b101'::uuid as pro_id,
  '00000000-0000-4000-8000-00000000b102'::uuid as free_id,
  '00000000-0000-4000-8000-00000000b103'::uuid as admin_id,
  '00000000-0000-4000-8000-00000000b201'::uuid as pro_dentistry_id,
  '00000000-0000-4000-8000-00000000b202'::uuid as free_dentistry_id
\gset

set local role service_role;

insert into public.users (
  id, email, username, role, registered_domain, subscription_status
) values
  (:'pro_id', 'audience-pro@example.test', 'audience-pro', 'user', 'dental.bio', 'PRO'),
  (:'free_id', 'audience-free@example.test', 'audience-free', 'user', 'dental.bio', 'FREE'),
  (:'admin_id', 'audience-admin@example.test', 'audience-admin', 'admin', 'dental.bio', 'FREE');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'pro_dentistry_id', :'pro_id'),
  (:'free_dentistry_id', :'free_id');

do $$
declare
  v_index integer;
begin
  for v_index in 1..5 loop
    perform * from public.ingest_public_analytics_event(
      gen_random_uuid(), 1::smallint, '00000000-0000-4000-8000-00000000b101'::uuid, now(),
      'profile_view', 'profile', null::integer,
      null::uuid, null::bigint, null::uuid, null::bigint, null::text,
      'not_required', 'social.example', 'social', null::text, null::text,
      null::text, 'mobile', null::text, null::text, null::text
    );
  end loop;

  for v_index in 1..4 loop
    perform * from public.ingest_public_analytics_event(
      gen_random_uuid(), 1::smallint, '00000000-0000-4000-8000-00000000b101'::uuid, now(),
      'profile_view', 'profile', null::integer,
      null::uuid, null::bigint, null::uuid, null::bigint, null::text,
      'not_required', 'search.example', 'search', null::text, null::text,
      null::text, 'desktop', null::text, null::text, null::text
    );
  end loop;

  perform * from public.ingest_public_analytics_event(
    gen_random_uuid(), 1::smallint, '00000000-0000-4000-8000-00000000b101'::uuid, now(),
    'profile_view', 'profile', null::integer,
    null::uuid, null::bigint, null::uuid, null::bigint, null::text,
    'not_required', 'direct.example', 'direct', null::text, null::text,
    null::text, 'tablet', null::text, null::text, null::text
  );
end;
$$;

select ok(
  not has_function_privilege(
    'anon', 'public.get_owner_analytics_audience(uuid,date,date)', 'execute'
  ) and has_function_privilege(
    'authenticated', 'public.get_owner_analytics_audience(uuid,date,date)', 'execute'
  ),
  'Audience reporting is available only through an authenticated RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'pro_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  format(
    $$ select dimension_type, dimension_value, total_views, unique_visitors, is_suppressed
       from public.get_owner_analytics_audience(
         %L::uuid, current_date, current_date
       ) $$,
    :'pro_id'
  ),
  $$ values
    ('device_class'::text, 'mobile'::text, 5::bigint, null::bigint, false),
    ('device_class'::text, 'other'::text, 5::bigint, null::bigint, true),
    ('referrer_domain'::text, 'social.example'::text, 5::bigint, null::bigint, false),
    ('referrer_domain'::text, 'other'::text, 5::bigint, null::bigint, true),
    ('source'::text, 'social'::text, 5::bigint, null::bigint, false),
    ('source'::text, 'other'::text, 5::bigint, null::bigint, true)
  $$,
  'Pro audience dimensions expose only thresholded buckets and aggregate suppressed values'
);

select is_empty(
  format(
    $$ select 1 from public.get_owner_analytics_audience(
         %L::uuid, current_date, current_date
       ) where dimension_value in ('search.example', 'direct.example', 'search', 'direct', 'desktop', 'tablet') $$,
    :'pro_id'
  ),
  'Sub-threshold dimension values are never revealed'
);

select set_config('request.jwt.claim.sub', :'free_id', true);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_audience(
      %L::uuid, current_date, current_date
    ) $$,
    :'free_id'
  ),
  '42501',
  'Audience analytics plan or ownership does not allow access',
  'Free owners are denied audience analytics by the database'
);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_audience(
      %L::uuid, current_date, current_date
    ) $$,
    :'pro_id'
  ),
  '42501',
  'Audience analytics plan or ownership does not allow access',
  'An owner cannot read another profile audience'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);

select lives_ok(
  format(
    $$ select * from public.get_owner_analytics_audience(
      %L::uuid, current_date, current_date
    ) $$,
    :'pro_id'
  ),
  'A database-authorized admin can inspect a profile audience'
);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_audience(
      %L::uuid, current_date - 731, current_date
    ) $$,
    :'pro_id'
  ),
  '22023',
  'Invalid analytics date range',
  'Audience reporting remains bounded to retained data'
);

select * from finish();
rollback;
