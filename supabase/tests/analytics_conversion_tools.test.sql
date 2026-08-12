begin;

select plan(24);

select
  '00000000-0000-4000-8000-00000000c101'::uuid as owner_id,
  '00000000-0000-4000-8000-00000000c102'::uuid as other_id,
  '00000000-0000-4000-8000-00000000c201'::uuid as dentistry_id,
  '00000000-0000-4000-8000-00000000c202'::uuid as other_dentistry_id,
  '00000000-0000-4000-8000-00000000c301'::uuid as group_id,
  '00000000-0000-4000-8000-00000000c302'::uuid as other_group_id,
  '00000000-0000-4000-8000-00000000c401'::uuid as other_link_id
\gset

set local role service_role;

insert into public.users (
  id, email, username, role, registered_domain, subscription_status
) values
  (:'owner_id', 'conversion-owner@example.test', 'conversion-owner', 'user', 'dental.bio', 'PREMIUM PRO'),
  (:'other_id', 'conversion-other@example.test', 'conversion-other', 'user', 'dental.bio', 'FREE');

insert into public.dentistries (dentistry_id, user_id) values
  (:'dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');

insert into public.link_groups (link_group_id, dentistry_id, heading, rank) values
  (:'group_id', :'dentistry_id', 'Owner links', 1),
  (:'other_group_id', :'other_dentistry_id', 'Other links', 1);

insert into public.links (link_id, title, link, rank, is_active)
values (:'other_link_id', 'Other link', 'https://example.test/other', 1, true);
insert into public.dentistry_links (link_group_id, link_id)
values (:'other_group_id', :'other_link_id');

select is(
  (select count(*) from public.analytics_conversion_goals where profile_id = :'owner_id'),
  5::bigint,
  'Every owner starts with the five controlled system goals'
);

select is(
  (select count(*) from public.analytics_conversion_goals
   where profile_id = :'owner_id' and is_primary and enabled),
  1::bigint,
  'Exactly one default goal is primary'
);

select ok(
  not has_table_privilege('authenticated', 'public.analytics_conversion_goals', 'select')
  and not has_table_privilege('authenticated', 'public.analytics_export_audit', 'select'),
  'Goals and export audits cannot bypass their authorized RPC boundaries'
);

select ok(
  not has_function_privilege('anon', 'public.get_owner_conversion_goals(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.get_owner_conversion_goals(uuid)', 'execute'),
  'Goal reads require an authenticated caller'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.get_owner_conversion_goals(:'owner_id')),
  5::bigint,
  'A paid owner can read their goals'
);

select throws_ok(
  format(
    $$ select * from public.upsert_owner_conversion_goal(
      %L::uuid, null::uuid, 'Foreign link', 'link_click', %L::uuid,
      null::bigint, false, 30::smallint, true, null::bigint, null::text
    ) $$,
    :'owner_id', :'other_link_id'
  ),
  '42501',
  'Goal entity does not belong to profile',
  'A custom goal cannot target another owner entity'
);

select * from public.create_dentistry_link_with_media(
  :'dentistry_id', :'group_id', 'Campaign link',
  'https://booking.example/path?existing=kept&utm_source=email&utm_medium=email&utm_campaign=summer#book',
  '', 'none', '', true, false, true,
  'https://booking.example/path?existing=kept#book',
  'email', 'email', 'summer', 'hero', null
) \gset created_

select isnt(:'created_link_id'::uuid, null::uuid, 'The managed link is created');

select isnt(
  (select analytics_campaign_id from public.links where link_id = :'created_link_id'),
  null::uuid,
  'A managed campaign UUID is stored separately on the link'
);

select results_eq(
  format(
    $$ select destination_url, source, medium, campaign, content, term
       from public.analytics_campaigns
       where campaign_id = (
         select analytics_campaign_id from public.links where link_id = %L::uuid
       ) $$,
    :'created_link_id'
  ),
  $$ values (
    'https://booking.example/path?existing=kept#book'::text,
    'email'::text, 'email'::text, 'summer'::text, 'hero'::text, null::text
  ) $$,
  'Private campaign configuration preserves the destination independently from the final URL'
);

select * from public.upsert_owner_conversion_goal(
  :'owner_id'::uuid, null::uuid, 'Campaign link click'::text,
  'link_click'::text, :'created_link_id'::uuid,
  null::bigint, true, 30::smallint, true, null::bigint, null::text
) \gset custom_

select is(
  (select count(*) from public.get_owner_conversion_goals(:'owner_id')
   where is_primary and enabled),
  1::bigint,
  'Selecting a primary goal atomically demotes the previous primary'
);

select is(
  (select goal_id from public.get_owner_conversion_goals(:'owner_id')
   where is_primary and enabled),
  :'custom_goal_id'::uuid,
  'The selected custom entity goal becomes primary'
);

select throws_ok(
  format(
    $$ select * from public.upsert_owner_conversion_goal(
      %L::uuid, %L::uuid, 'Changed definition', 'product_click', null::uuid,
      1::bigint, true, 30::smallint, true, null::bigint, null::text
    ) $$,
    :'owner_id', :'custom_goal_id'
  ),
  '22023',
  'A goal event definition is immutable',
  'Editing cannot retroactively reclassify a goal definition'
);

select lives_ok(
  format(
    $$ select * from public.upsert_owner_conversion_goal(
      %L::uuid, %L::uuid, 'Campaign action', 'link_click', %L::uuid,
      null::bigint, true, 60::smallint, true, 2500::bigint, 'GBP'
    ) $$,
    :'owner_id', :'custom_goal_id', :'created_link_id'
  ),
  'A goal name, primary state, window, enabled state, and non-clinical value can be edited'
);

set local role service_role;

select status from public.ingest_public_analytics_event(
  gen_random_uuid(), 1::smallint, :'owner_id'::uuid, now(),
  'profile_view'::text, 'profile'::text, null::integer,
  null::uuid, null::bigint, null::uuid, null::bigint, null::text,
  'granted'::text, null::text, 'campaign'::text,
  'google'::text, 'cpc'::text, 'booking'::text, 'mobile'::text,
  repeat('a', 64), repeat('b', 64), repeat('c', 64)
) \gset view_

select status from public.ingest_public_analytics_event(
  gen_random_uuid(), 1::smallint, :'owner_id'::uuid, now(),
  'link_click'::text, 'links'::text, 1::integer,
  :'created_link_id'::uuid, null::bigint, :'group_id'::uuid, null::bigint,
  null::text, 'granted'::text, null::text, 'direct'::text,
  null::text, null::text, null::text, 'mobile'::text,
  repeat('a', 64), repeat('b', 64), repeat('d', 64)
) \gset click_

select is(:'view_status'::text, 'accepted'::text, 'The attributed profile view is accepted');
select is(:'click_status'::text, 'accepted'::text, 'The owned managed-campaign click is accepted');

select is(
  (select managed_campaign_id from public.public_analytics_events
   where profile_id = :'owner_id' and action_type = 'link_click'),
  (select analytics_campaign_id from public.links where link_id = :'created_link_id'),
  'Ingestion resolves the owned managed campaign on the server'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);

select results_eq(
  format(
    $$ select conversions, unique_converters, primary_conversions,
              unique_primary_converters
       from public.get_owner_conversion_summary(%L::uuid, current_date, current_date) $$,
    :'owner_id'
  ),
  $$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint) $$,
  'Conversion totals are driven by enabled controlled goals'
);

select results_eq(
  format(
    $$ select conversions, unique_converters, primary_conversions,
              unique_primary_converters
       from public.get_owner_conversion_totals(%L::uuid, current_date, current_date) $$,
    :'owner_id'
  ),
  $$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint) $$,
  'The focused conversion totals RPC uses the same controlled goal model'
);

select results_eq(
  format(
    $$ select source, medium, campaign, profile_views, unique_visitors,
              clicks, unique_clickers, conversions, unique_converters
       from public.get_owner_campaign_performance(%L::uuid, current_date, current_date)
       order by campaign $$,
    :'owner_id'
  ),
  $$ values
    ('google'::text, 'cpc'::text, 'booking'::text, 1::bigint, 1::bigint,
      0::bigint, null::bigint, 0::bigint, null::bigint),
    ('email'::text, 'email'::text, 'summer'::text, 0::bigint, null::bigint,
      1::bigint, 1::bigint, 1::bigint, 1::bigint)
  $$,
  'Campaign reporting separates managed and inbound campaign touches with exact totals'
);

select isnt(
  public.record_analytics_export(
    :'owner_id'::uuid, 'campaigns'::text, current_date, current_date,
    'UTC'::text, 2::integer, 1::smallint
  ),
  null::uuid,
  'Premium owners can create an audited aggregate export'
);

set local role service_role;
select results_eq(
  format(
    $$ select dataset, row_count, schema_version,
              downloaded_at is not null as downloaded
       from public.analytics_export_audit where profile_id = %L::uuid $$,
    :'owner_id'
  ),
  $$ values ('campaigns'::text, 2::integer, 1::smallint, true) $$,
  'Synchronous export creation and download are auditable without storing its contents'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'other_id', true);

select throws_ok(
  format($$ select * from public.get_owner_conversion_goals(%L::uuid) $$, :'other_id'),
  '42501',
  'Analytics plan or ownership does not allow access',
  'Free owners cannot bypass the server-side goals plan gate'
);

select throws_ok(
  format(
    $$ select public.record_analytics_export(
      %L::uuid, 'overview'::text, current_date, current_date,
      'UTC'::text, 0::integer, 1::smallint
    ) $$,
    :'other_id'
  ),
  '42501',
  'Analytics plan or ownership does not allow access',
  'Free owners cannot create exports'
);

select throws_ok(
  format($$ select * from public.get_owner_conversion_goals(%L::uuid) $$, :'owner_id'),
  '42501',
  'Analytics plan or ownership does not allow access',
  'An owner cannot read another profile goals'
);

select * from finish();
rollback;
