begin;

select plan(21);

select
  '00000000-0000-4000-8000-00000000a101'::uuid as owner_id,
  '00000000-0000-4000-8000-00000000a102'::uuid as other_id,
  '00000000-0000-4000-8000-00000000a103'::uuid as admin_id,
  '00000000-0000-4000-8000-00000000a201'::uuid as dentistry_id,
  '00000000-0000-4000-8000-00000000a202'::uuid as other_dentistry_id,
  '00000000-0000-4000-8000-00000000a301'::uuid as link_group_id,
  '00000000-0000-4000-8000-00000000a302'::uuid as link_id,
  '00000000-0000-4000-8000-00000000a401'::uuid as other_link_group_id,
  '00000000-0000-4000-8000-00000000a402'::uuid as other_link_id,
  '00000000-0000-4000-8000-00000000a501'::uuid as event_id
\gset

set local role service_role;

insert into public.users (id, email, username, role, registered_domain, subscription_status)
values
  (:'owner_id', 'analytics-owner@example.test', 'analytics-owner', 'user', 'dental.bio', 'PRO'),
  (:'other_id', 'analytics-other@example.test', 'analytics-other', 'user', 'dental.bio', 'FREE'),
  (:'admin_id', 'analytics-admin@example.test', 'analytics-admin', 'admin', 'dental.bio', 'FREE');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');

insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
values
  (:'link_group_id', :'dentistry_id', 'Owner links', 1),
  (:'other_link_group_id', :'other_dentistry_id', 'Other links', 1);

insert into public.links (link_id, title, link, rank, is_active)
values
  (:'link_id', 'Owner link', 'https://example.test/owner', 1, true),
  (:'other_link_id', 'Other link', 'https://example.test/other', 1, true);

insert into public.dentistry_links (link_group_id, link_id)
values
  (:'link_group_id', :'link_id'),
  (:'other_link_group_id', :'other_link_id');

select ok(
  not has_table_privilege('anon', 'public.public_analytics_events', 'select')
  and not has_table_privilege('authenticated', 'public.public_analytics_events', 'select')
  and not has_table_privilege('authenticated', 'public.public_analytics_daily_aggregates', 'select'),
  'Raw events and aggregates cannot bypass the RPC boundary'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.ingest_public_analytics_event(uuid,smallint,uuid,timestamptz,text,text,integer,uuid,bigint,uuid,bigint,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.ingest_public_analytics_event(uuid,smallint,uuid,timestamptz,text,text,integer,uuid,bigint,uuid,bigint,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  ),
  'Public and authenticated clients cannot invoke privileged ingestion directly'
);

select results_eq(
  format(
    $$ select status, accepted_event_id from public.ingest_public_analytics_event(
      %L::uuid, 1::smallint, %L::uuid, now(), 'link_click', 'links', 1,
      %L::uuid, null::bigint, %L::uuid, null::bigint, null::text,
      'granted', null::text, 'direct', null::text, null::text, null::text,
      'mobile', repeat('a', 64), repeat('b', 64), repeat('c', 64)
    ) $$,
    :'event_id', :'owner_id', :'link_id', :'link_group_id'
  ),
  format($$ values ('accepted'::text, %L::uuid) $$, :'event_id'),
  'A controlled event for an enabled owned entity is accepted'
);

select results_eq(
  format(
    $$ select status, accepted_event_id from public.ingest_public_analytics_event(
      %L::uuid, 1::smallint, %L::uuid, now(), 'link_click', 'links', 1,
      %L::uuid, null::bigint, %L::uuid, null::bigint, null::text,
      'granted', null::text, 'direct', null::text, null::text, null::text,
      'mobile', repeat('a', 64), repeat('b', 64), repeat('c', 64)
    ) $$,
    :'event_id', :'owner_id', :'link_id', :'link_group_id'
  ),
  format($$ values ('duplicate'::text, %L::uuid) $$, :'event_id'),
  'The client event UUID is an idempotency key'
);

select is(
  (select count(*) from public.public_analytics_events where event_id = :'event_id'),
  1::bigint,
  'A retry never duplicates the immutable raw event'
);

select is(
  (select total_events from public.public_analytics_daily_aggregates where profile_id = :'owner_id'),
  1::bigint,
  'The daily aggregate changes in the same transaction only once'
);

select throws_ok(
  format(
    $$ select * from public.ingest_public_analytics_event(
      gen_random_uuid(), 1::smallint, %L::uuid, now(), 'link_click', 'links', 1,
      %L::uuid, null::bigint, %L::uuid, null::bigint, null::text,
      'granted', null::text, 'direct', null::text, null::text, null::text,
      'desktop', null::text, null::text, repeat('d', 64)
    ) $$,
    :'owner_id', :'other_link_id', :'other_link_group_id'
  ),
  '22023',
  'Analytics entity does not belong to profile',
  'A valid entity belonging to another profile is rejected'
);

select throws_ok(
  format(
    $$ select * from public.ingest_public_analytics_event(
      gen_random_uuid(), 1::smallint, %L::uuid, now(), 'share_open', 'share', null::integer,
      null::uuid, null::bigint, null::uuid, null::bigint, null::text,
      'denied', null::text, null::text, null::text, null::text, null::text,
      'unknown', null::text, null::text, repeat('e', 64)
    ) $$,
    :'owner_id'
  ),
  '22023',
  'Invalid analytics envelope',
  'Denied consent cannot be stored even through the privileged boundary'
);

select throws_ok(
  format($$ update public.public_analytics_events set section = 'profile' where event_id = %L::uuid $$, :'event_id'),
  '55000',
  'Analytics events are append-only',
  'Accepted raw events cannot be edited'
);

select throws_ok(
  format($$ delete from public.public_analytics_events where event_id = %L::uuid $$, :'event_id'),
  '55000',
  'Analytics events are append-only',
  'Accepted raw events cannot be manually deleted'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  format(
    $$ select profile_views, unique_profile_visitors, outbound_actions,
              unique_action_visitors, conversions, unique_converting_visitors
       from public.get_owner_analytics_summary(%L::uuid, (now() at time zone 'UTC')::date, (now() at time zone 'UTC')::date) $$,
    :'owner_id'
  ),
  $$ values (0::bigint, null::bigint, 1::bigint, 1::bigint, 0::bigint, null::bigint) $$,
  'An owner can read exact privacy-safe daily totals for their profile'
);

select results_eq(
  format(
    $$ select profile_views, unique_profile_visitors, outbound_actions,
              unique_action_visitors, conversions, unique_converting_visitors
       from public.get_owner_analytics_totals(%L::uuid, (now() at time zone 'UTC')::date, (now() at time zone 'UTC')::date) $$,
    :'owner_id'
  ),
  $$ values (0::bigint, null::bigint, 1::bigint, 1::bigint, 0::bigint, null::bigint) $$,
  'Range totals compute distinct visitors across the full range rather than summing daily uniques'
);

select results_eq(
  format(
    $$ select action_type, section, total_events
       from public.get_owner_analytics_content(%L::uuid, (now() at time zone 'UTC')::date, (now() at time zone 'UTC')::date) $$,
    :'owner_id'
  ),
  $$ values ('link_click'::text, 'links'::text, 1::bigint) $$,
  'Owner content analytics exposes controlled dimensions only'
);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_summary(%L::uuid, (now() at time zone 'UTC')::date, (now() at time zone 'UTC')::date) $$,
    :'other_id'
  ),
  '42501',
  'Not authorized',
  'An owner cannot read another profile analytics'
);

select set_config('request.jwt.claim.sub', :'other_id', true);

select results_eq(
  format(
    $$ select profile_views, unique_profile_visitors, outbound_actions,
              unique_action_visitors, conversions, unique_converting_visitors
       from public.get_owner_analytics_totals(%L::uuid, (now() at time zone 'UTC')::date, (now() at time zone 'UTC')::date) $$,
    :'other_id'
  ),
  $$ values (0::bigint, null::bigint, 0::bigint, null::bigint, null::bigint, null::bigint) $$,
  'Free owners receive basic analytics while conversion metrics remain server-gated'
);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_totals(%L::uuid, current_date - 7, current_date) $$,
    :'other_id'
  ),
  '42501',
  'Analytics date range is not available for this plan',
  'Free analytics range is enforced by the database, not only the dashboard parser'
);

select throws_ok(
  format(
    $$ select * from public.get_owner_analytics_summary(%L::uuid, current_date - 731, current_date) $$,
    :'owner_id'
  ),
  '22023',
  'Invalid analytics date range',
  'Dashboard analytics queries are bounded to retained data'
);

set local role service_role;

select results_eq(
  format(
    $$ select status from public.ingest_public_analytics_event(
      gen_random_uuid(), 1::smallint, %L::uuid, now(), 'profile_view', 'profile', null::integer,
      null::uuid, null::bigint, null::uuid, null::bigint, null::text,
      'not_required', null::text, null::text, null::text, null::text, null::text,
      'unknown', null::text, null::text, null::text
    ) $$,
    :'owner_id'
  ),
  $$ values ('accepted'::text) $$,
  'The privileged boundary accepts a controlled profile view'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$ select profile_views, outbound_actions, unique_visitors, active_profiles
     from public.get_admin_analytics_overview(
       (now() at time zone 'UTC')::date,
       (now() at time zone 'UTC')::date,
       'PRO',
       'dental.bio'
     ) $$,
  $$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint) $$,
  'A database-authorized admin reads one global aggregate without profile N+1 queries'
);

select throws_ok(
  $$ select * from public.get_admin_analytics_overview(current_date, current_date, 'ENTERPRISE', null) $$,
  '22023',
  'Invalid admin analytics filter',
  'Admin plan filters are controlled at the database boundary'
);

set local role service_role;

select lives_ok(
  $$ select * from public.purge_expired_public_analytics() $$,
  'The retention function can safely run when nothing has expired'
);

select * from finish();
rollback;
