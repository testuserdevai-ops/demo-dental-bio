begin;

select plan(14);

select
  '00000000-0000-4000-8000-00000000c101'::uuid as owner_id,
  '00000000-0000-4000-8000-00000000c102'::uuid as other_id,
  '00000000-0000-4000-8000-00000000c103'::uuid as admin_id
\gset

set local role service_role;
insert into public.users (
  id, email, username, role, registered_domain, subscription_status
) values
  (:'owner_id', 'lifecycle-owner@example.test', 'lifecycle-owner', 'user', 'dental.bio', 'FREE'),
  (:'other_id', 'lifecycle-other@example.test', 'lifecycle-other', 'user', 'dental.bio', 'FREE'),
  (:'admin_id', 'lifecycle-admin@example.test', 'lifecycle-admin', 'admin', 'dental.bio', 'FREE');

insert into public.marketing_unsubscribes (email, source)
values ('lifecycle-owner@example.test', 'test');

select ok(
  not has_table_privilege('authenticated', 'public.lifecycle_preferences', 'select')
  and not has_table_privilege('authenticated', 'public.lifecycle_message_claims', 'select')
  and not has_table_privilege('authenticated', 'public.lifecycle_audit_events', 'select'),
  'Lifecycle tables are RPC-only for authenticated clients'
);

select ok(
  has_function_privilege('authenticated', 'public.get_lifecycle_preferences(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.save_lifecycle_preferences(uuid,bigint,boolean,boolean,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.get_lifecycle_preferences(uuid)', 'execute'),
  'Preference RPCs require authentication'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  format(
    $$ select lifecycle_emails_enabled, weekly_summary_enabled,
       milestone_emails_enabled, promotional_unsubscribed_at is not null,
       revision
       from public.get_lifecycle_preferences(%L::uuid) $$,
    :'owner_id'
  ),
  $$ values (true, true, true, true, 0::bigint) $$,
  'Owner receives defaults plus the authoritative marketing unsubscribe'
);

select throws_ok(
  format(
    $$ select * from public.get_lifecycle_preferences(%L::uuid) $$,
    :'other_id'
  ),
  '42501', 'Not authorized',
  'Owner cannot read another owner preferences'
);

select results_eq(
  format(
    $$ select lifecycle_emails_enabled, weekly_summary_enabled,
       milestone_emails_enabled, revision
       from public.save_lifecycle_preferences(
         %L::uuid, 0, true, false, true
       ) $$,
    :'owner_id'
  ),
  $$ values (true, false, true, 1::bigint) $$,
  'Owner saves preferences with the expected revision'
);

select throws_ok(
  format(
    $$ select * from public.save_lifecycle_preferences(
      %L::uuid, 0, true, true, true
    ) $$,
    :'owner_id'
  ),
  '40001', 'Lifecycle preferences changed',
  'Stale preference saves fail their compare-and-swap'
);

select throws_ok(
  format(
    $$ select * from public.claim_lifecycle_message(
      %L::uuid, 'weekly_performance', 'week:2026-08-10', 'weekly_activity'
    ) $$,
    :'owner_id'
  ),
  '42501', 'Admin authorization required',
  'Ordinary owners cannot claim lifecycle messages'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);

select results_eq(
  format(
    $$ select status, claimed from public.claim_lifecycle_message(
      %L::uuid, 'weekly_performance', 'week:2026-08-10', 'weekly_activity'
    ) $$,
    :'owner_id'
  ),
  $$ values ('claimed'::text, true) $$,
  'Admin claims an eligible message exactly once'
);

select results_eq(
  format(
    $$ select status, claimed from public.claim_lifecycle_message(
      %L::uuid, 'weekly_performance', 'week:2026-08-10', 'weekly_activity'
    ) $$,
    :'owner_id'
  ),
  $$ values ('claimed'::text, false) $$,
  'A retry returns the existing claim without duplicating it'
);

set local role service_role;

select is(
  (
    select count(*) from public.lifecycle_message_claims
    where user_id = :'owner_id' and campaign = 'weekly_performance'
  ),
  1::bigint,
  'Concurrent-key uniqueness leaves one message claim'
);

select is(
  (
    select count(*) from public.lifecycle_audit_events
    where user_id = :'owner_id' and outcome = 'claimed'
  ),
  1::bigint,
  'Only the first claim writes an audit event'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);

select results_eq(
  format(
    $$ select campaign, outcome, reason_code
       from public.get_lifecycle_audit(%L::uuid, 10) $$,
    :'owner_id'
  ),
  $$ values ('weekly_performance'::text, 'claimed'::text, 'weekly_activity'::text) $$,
  'Admin reads the controlled operator audit without message contents'
);

select throws_ok(
  format(
    $$ select * from public.claim_lifecycle_message(
      %L::uuid, 'arbitrary_campaign', 'bad key', 'free form reason'
    ) $$,
    :'owner_id'
  ),
  '22023', 'Invalid lifecycle claim',
  'Claims reject arbitrary campaign and free-form dimensions'
);

set local role service_role;
delete from public.users where id in (:'owner_id', :'other_id', :'admin_id');

select is(
  (select count(*) from public.lifecycle_message_claims where user_id = :'owner_id'),
  0::bigint,
  'Account deletion cascades lifecycle claims'
);

select * from finish();
rollback;
