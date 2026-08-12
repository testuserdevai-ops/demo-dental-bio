begin;

select plan(14);

select
  '00000000-0000-4000-8000-00000000c101'::uuid as owner_id,
  '00000000-0000-4000-8000-00000000c102'::uuid as other_id,
  '00000000-0000-4000-8000-00000000c103'::uuid as admin_id,
  '00000000-0000-4000-8000-00000000c201'::uuid as dentistry_id,
  '00000000-0000-4000-8000-00000000c301'::uuid as group_id,
  '00000000-0000-4000-8000-00000000c302'::uuid as link_id,
  '00000000-0000-4000-8000-00000000c401'::uuid as event_id
\gset

set local role service_role;

insert into public.users (
  id, email, username, role, registered_domain, subscription_status
) values
  (:'owner_id', 'drilldown-owner@example.test', 'drilldown-owner', 'user', 'dental.bio', 'PRO'),
  (:'other_id', 'drilldown-other@example.test', 'drilldown-other', 'user', 'dental.bio', 'PRO'),
  (:'admin_id', 'drilldown-admin@example.test', 'drilldown-admin', 'admin', 'dental.bio', 'FREE');

insert into public.dentistries (dentistry_id, user_id)
values (:'dentistry_id', :'owner_id');

insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
values (:'group_id', :'dentistry_id', 'Booking', 1);

insert into public.links (link_id, title, link, rank, is_active)
values (:'link_id', 'Book a consultation', 'https://example.test/book', 1, true);

insert into public.dentistry_links (link_group_id, link_id)
values (:'group_id', :'link_id');

select results_eq(
  format(
    $$ select status from public.ingest_public_analytics_event(
      %L::uuid, 1::smallint, %L::uuid, now(), 'link_click', 'links', 1,
      %L::uuid, null::bigint, %L::uuid, null::bigint, null::text,
      'not_required', null::text, 'direct', null::text, null::text, null::text,
      'mobile', null::text, null::text, null::text
    ) $$,
    :'event_id', :'owner_id', :'link_id', :'group_id'
  ),
  $$ values ('accepted'::text) $$,
  'An owned link event is accepted'
);

select is(
  (select content_label_snapshot from public.public_analytics_events
    where event_id = :'event_id'),
  'Book a consultation',
  'The server captures the owner-authored label without accepting client text'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  format(
    $$ select content_label, content_deleted
       from public.get_owner_analytics_content(%L::uuid, current_date, current_date) $$,
    :'owner_id'
  ),
  $$ values ('Book a consultation'::text, false) $$,
  'The owner sees the current readable content label'
);

set local role service_role;
update public.links set title = 'Schedule your visit' where link_id = :'link_id';

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);

select results_eq(
  format(
    $$ select content_label, content_deleted
       from public.get_owner_analytics_content(%L::uuid, current_date, current_date) $$,
    :'owner_id'
  ),
  $$ values ('Schedule your visit'::text, false) $$,
  'Current owner content labels take precedence over the historical snapshot'
);

set local role service_role;
delete from public.dentistry_links where link_id = :'link_id';
delete from public.links where link_id = :'link_id';

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);

select results_eq(
  format(
    $$ select content_label, content_deleted
       from public.get_owner_analytics_content(%L::uuid, current_date, current_date) $$,
    :'owner_id'
  ),
  $$ values ('Book a consultation'::text, true) $$,
  'Deleted content keeps its trusted historical label and is marked deleted'
);

select results_eq(
  format(
    $$ select public.set_owner_analytics_timezone(%L::uuid, 'Africa/Cairo') $$,
    :'owner_id'
  ),
  $$ values ('Africa/Cairo'::text) $$,
  'An owner can persist a valid IANA reporting timezone'
);

select is(
  (select analytics_timezone from public.users where id = :'owner_id'),
  'Africa/Cairo',
  'The selected reporting timezone is authoritative user state'
);

select throws_ok(
  format(
    $$ select public.set_owner_analytics_timezone(%L::uuid, 'Not/A_Timezone') $$,
    :'owner_id'
  ),
  '22023',
  'Invalid reporting timezone',
  'Unknown timezone identifiers are rejected'
);

select throws_ok(
  format(
    $$ select public.set_owner_analytics_timezone(%L::uuid, 'UTC') $$,
    :'other_id'
  ),
  '42501',
  'Not authorized',
  'An owner cannot change another profile reporting timezone'
);

select throws_ok(
  $$ select * from public.get_admin_analytics_health() $$,
  '42501',
  'Admin authorization required',
  'Owners cannot read platform analytics health'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);

select results_eq(
  $$ select raw_events, aggregate_events, aggregate_drift,
            profiles_with_drift, retention_overage
     from public.get_admin_analytics_health() $$,
  $$ values (1::bigint, 1::bigint, 0::bigint, 0::bigint, 0::bigint) $$,
  'Admin health reconciles immutable events and rollups without visitor data'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.get_admin_analytics_health()', 'execute'
  ) and not has_function_privilege(
    'anon', 'public.get_admin_analytics_health()', 'execute'
  ),
  'Analytics health remains behind the authenticated RPC boundary'
);

select ok(
  not has_schema_privilege('authenticated', 'analytics_private', 'usage')
  and not has_schema_privilege('anon', 'analytics_private', 'usage'),
  'Internal label resolution is not exposed through the Data API roles'
);

select ok(
  not has_function_privilege(
    'authenticated',
    (select p.oid from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'analytics_private'
        and p.proname = 'resolve_content'),
    'execute'
  ),
  'Authenticated callers cannot invoke internal label resolution directly'
);

select * from finish();
rollback;
