begin;
select plan(11);

select has_function(
  'public', 'get_lifecycle_delivery_candidates', array['timestamp with time zone', 'integer'],
  'delivery candidates are selected through one controlled function'
);
select has_function(
  'public', 'complete_lifecycle_message', array['uuid', 'text', 'text'],
  'claim outcomes are recorded through one controlled function'
);
select function_privs_are(
  'public', 'get_lifecycle_delivery_candidates',
  array['timestamp with time zone', 'integer'], 'anon', array[]::text[],
  'anonymous callers cannot inspect lifecycle candidates'
);
select function_privs_are(
  'public', 'complete_lifecycle_message', array['uuid', 'text', 'text'],
  'anon', array[]::text[],
  'anonymous callers cannot update lifecycle claims'
);

select lives_ok(
  $$ select set_config('request.jwt.claims',
    json_build_object('role', 'service_role')::text, true) $$,
  'service-role test context can be established'
);

select is(
  (select count(*)::integer from public.get_lifecycle_delivery_candidates(
    '2026-08-12 09:00:00+00'::timestamptz, 100
  ) where campaign not in (
    'incomplete_profile', 'first_value_milestone', 'weekly_performance',
    'no_contact_action', 'zero_traffic'
  )),
  0,
  'candidate output contains only controlled campaigns'
);
select is(
  (select count(*)::integer from public.get_lifecycle_delivery_candidates(
    '2026-08-12 09:00:00+00'::timestamptz, 100
  ) where claim_key !~ '^[a-z0-9:_-]+$'
    or reason_code !~ '^[a-z0-9:_-]+$'),
  0,
  'claim keys and reason codes are controlled values'
);
select throws_ok(
  $$ select * from public.get_lifecycle_delivery_candidates(now(), 0) $$,
  '22023', 'Invalid lifecycle candidate limit',
  'candidate limits are bounded'
);

insert into public.lifecycle_message_claims (
  user_id, campaign, claim_key, reason_code
)
select id, 'zero_traffic', 'zero-traffic:2026-33',
  'published_without_qualified_view'
from public.users order by created_at limit 1;

select lives_ok(
  $$ select public.complete_lifecycle_message(
    (select claim_id from public.lifecycle_message_claims
      where claim_key = 'zero-traffic:2026-33'),
    'cancelled', 'qualified_view_arrived'
  ) $$,
  'a claimed message can be cancelled after the authoritative recheck'
);
select is(
  (select status from public.lifecycle_message_claims
    where claim_key = 'zero-traffic:2026-33'),
  'cancelled',
  'claim stores its terminal outcome'
);
select is(
  (select outcome from public.lifecycle_audit_events
    where claim_id = (select claim_id from public.lifecycle_message_claims
      where claim_key = 'zero-traffic:2026-33')
    order by audit_id desc limit 1),
  'cancelled',
  'terminal outcome is appended to the operator audit'
);

select * from finish();
rollback;
