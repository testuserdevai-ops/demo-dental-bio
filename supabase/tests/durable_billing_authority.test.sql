begin;

select no_plan();

select has_schema('private', 'Private authority schema exists');
select hasnt_column(
  'public',
  'users',
  'pending_cancellation_subscription_id',
  'Pending cancellation state is absent from public users'
);
select has_table(
  'private',
  'subscription_cancellations',
  'Pending cancellations live in a private table'
);
select has_table(
  'private',
  'stripe_customer_deletion_tombstones',
  'Customer deletion tombstones live in the private schema'
);
select has_table(
  'private',
  'completed_subscription_cancellations',
  'Completed cancellation tombstones live in the private schema'
);
select hasnt_table(
  'public',
  'stripe_customer_deletion_tombstones',
  'Customer deletion tombstones are absent from public'
);
select hasnt_table(
  'public',
  'completed_subscription_cancellations',
  'Completed cancellation tombstones are absent from public'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.subscription_cancellations'::regclass),
  'Pending cancellations enforce RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.stripe_customer_deletion_tombstones'::regclass),
  'Customer deletion tombstones enforce RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.completed_subscription_cancellations'::regclass),
  'Completed cancellation tombstones enforce RLS'
);
select has_pk(
  'private',
  'subscription_cancellations',
  'Pending cancellations are keyed by user ID'
);
select has_pk(
  'private',
  'completed_subscription_cancellations',
  'Completed cancellations are keyed by customer and subscription IDs'
);

select ok(not has_table_privilege('public', 'private.subscription_cancellations', 'select'), 'PUBLIC cannot select pending cancellations');
select ok(not has_table_privilege('public', 'private.subscription_cancellations', 'insert'), 'PUBLIC cannot insert pending cancellations');
select ok(not has_table_privilege('public', 'private.subscription_cancellations', 'update'), 'PUBLIC cannot update pending cancellations');
select ok(not has_table_privilege('public', 'private.subscription_cancellations', 'delete'), 'PUBLIC cannot delete pending cancellations');
select ok(not has_table_privilege('anon', 'private.subscription_cancellations', 'select'), 'Anonymous cannot select pending cancellations');
select ok(not has_table_privilege('anon', 'private.subscription_cancellations', 'insert'), 'Anonymous cannot insert pending cancellations');
select ok(not has_table_privilege('anon', 'private.subscription_cancellations', 'update'), 'Anonymous cannot update pending cancellations');
select ok(not has_table_privilege('anon', 'private.subscription_cancellations', 'delete'), 'Anonymous cannot delete pending cancellations');
select ok(not has_table_privilege('authenticated', 'private.subscription_cancellations', 'select'), 'Authenticated cannot select pending cancellations');
select ok(not has_table_privilege('authenticated', 'private.subscription_cancellations', 'insert'), 'Authenticated cannot insert pending cancellations');
select ok(not has_table_privilege('authenticated', 'private.subscription_cancellations', 'update'), 'Authenticated cannot update pending cancellations');
select ok(not has_table_privilege('authenticated', 'private.subscription_cancellations', 'delete'), 'Authenticated cannot delete pending cancellations');
select ok(has_table_privilege('service_role', 'private.subscription_cancellations', 'select'), 'Service role can select pending cancellations');
select ok(has_table_privilege('service_role', 'private.subscription_cancellations', 'insert'), 'Service role can insert pending cancellations');
select ok(has_table_privilege('service_role', 'private.subscription_cancellations', 'update'), 'Service role can update pending cancellations');
select ok(has_table_privilege('service_role', 'private.subscription_cancellations', 'delete'), 'Service role can delete pending cancellations');
select ok(not has_table_privilege('anon', 'private.stripe_customer_deletion_tombstones', 'select'), 'Anonymous cannot read deletion tombstones');
select ok(not has_table_privilege('authenticated', 'private.stripe_customer_deletion_tombstones', 'select'), 'Authenticated cannot read deletion tombstones');
select ok(has_table_privilege('service_role', 'private.stripe_customer_deletion_tombstones', 'select'), 'Service role can read deletion tombstones');
select ok(not has_table_privilege('public', 'private.completed_subscription_cancellations', 'select'), 'PUBLIC cannot read completed cancellations');
select ok(not has_table_privilege('public', 'private.completed_subscription_cancellations', 'insert'), 'PUBLIC cannot insert completed cancellations');
select ok(not has_table_privilege('public', 'private.completed_subscription_cancellations', 'update'), 'PUBLIC cannot update completed cancellations');
select ok(not has_table_privilege('public', 'private.completed_subscription_cancellations', 'delete'), 'PUBLIC cannot delete completed cancellations');
select ok(not has_table_privilege('anon', 'private.completed_subscription_cancellations', 'select'), 'Anonymous cannot read completed cancellations');
select ok(not has_table_privilege('anon', 'private.completed_subscription_cancellations', 'insert'), 'Anonymous cannot insert completed cancellations');
select ok(not has_table_privilege('anon', 'private.completed_subscription_cancellations', 'update'), 'Anonymous cannot update completed cancellations');
select ok(not has_table_privilege('anon', 'private.completed_subscription_cancellations', 'delete'), 'Anonymous cannot delete completed cancellations');
select ok(not has_table_privilege('authenticated', 'private.completed_subscription_cancellations', 'select'), 'Authenticated cannot read completed cancellations');
select ok(not has_table_privilege('authenticated', 'private.completed_subscription_cancellations', 'insert'), 'Authenticated cannot insert completed cancellations');
select ok(not has_table_privilege('authenticated', 'private.completed_subscription_cancellations', 'update'), 'Authenticated cannot update completed cancellations');
select ok(not has_table_privilege('authenticated', 'private.completed_subscription_cancellations', 'delete'), 'Authenticated cannot delete completed cancellations');
select ok(has_table_privilege('service_role', 'private.completed_subscription_cancellations', 'select'), 'Service role can read completed cancellations');
select ok(has_table_privilege('service_role', 'private.completed_subscription_cancellations', 'insert'), 'Service role can record completed cancellations');
select ok(has_table_privilege('service_role', 'private.completed_subscription_cancellations', 'update'), 'Service role can refresh completed cancellations');
select ok(has_table_privilege('service_role', 'private.completed_subscription_cancellations', 'delete'), 'Service role can delete completed cancellations');

select has_function('public', 'get_subscription_authority_for_user', array['uuid']);
select has_function('public', 'get_subscription_authority_for_stripe_customer', array['text']);
select has_function('public', 'begin_subscription_cancellation', array['jsonb']);
select has_function('public', 'finish_subscription_cancellation', array['uuid', 'text', 'text']);
select has_function('public', 'apply_stripe_subscription_update', array['jsonb']);
select has_function('public', 'process_stripe_subscription_deletion', array['text', 'text']);
select has_function('public', 'process_stripe_customer_deletion', array['text']);

select ok(
  not has_function_privilege('public', 'public.get_subscription_authority_for_user(uuid)', 'execute')
  and not has_function_privilege('public', 'public.get_subscription_authority_for_stripe_customer(text)', 'execute')
  and not has_function_privilege('public', 'public.begin_subscription_cancellation(jsonb)', 'execute')
  and not has_function_privilege('public', 'public.finish_subscription_cancellation(uuid,text,text)', 'execute')
  and not has_function_privilege('public', 'public.apply_stripe_subscription_update(jsonb)', 'execute')
  and not has_function_privilege('public', 'public.process_stripe_subscription_deletion(text,text)', 'execute')
  and not has_function_privilege('public', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'PUBLIC cannot execute billing authority functions'
);
select ok(
  not has_function_privilege('anon', 'public.get_subscription_authority_for_user(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.get_subscription_authority_for_stripe_customer(text)', 'execute')
  and not has_function_privilege('anon', 'public.begin_subscription_cancellation(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.finish_subscription_cancellation(uuid,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.apply_stripe_subscription_update(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.process_stripe_subscription_deletion(text,text)', 'execute')
  and not has_function_privilege('anon', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Anonymous cannot execute billing authority functions'
);
select ok(
  not has_function_privilege('authenticated', 'public.get_subscription_authority_for_user(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.get_subscription_authority_for_stripe_customer(text)', 'execute')
  and not has_function_privilege('authenticated', 'public.begin_subscription_cancellation(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.finish_subscription_cancellation(uuid,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.apply_stripe_subscription_update(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.process_stripe_subscription_deletion(text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Authenticated cannot execute billing authority functions'
);
select ok(
  has_function_privilege('service_role', 'public.get_subscription_authority_for_user(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.get_subscription_authority_for_stripe_customer(text)', 'execute')
  and has_function_privilege('service_role', 'public.begin_subscription_cancellation(jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.finish_subscription_cancellation(uuid,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.apply_stripe_subscription_update(jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.process_stripe_subscription_deletion(text,text)', 'execute')
  and has_function_privilege('service_role', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Service role alone can execute billing authority functions'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000402', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ insert into public.users (id, email, username, role) values ('00000000-0000-0000-0000-000000000402', 'public-user@example.test', 'public-user', 'user') $$,
  '42501',
  null,
  'Authenticated clients cannot bypass the auth trigger or trusted registration boundary'
);

set local role service_role;
select lives_ok(
  $$ insert into public.users (id, email, username, role) values ('00000000-0000-0000-0000-000000000402', 'public-user@example.test', 'public-user', 'user') $$,
  'The trusted registration boundary can initialize the public user row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000402', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$ select username::text from public.users where id = '00000000-0000-0000-0000-000000000402' $$,
  $$ values ('public-user'::text) $$,
  'Authenticated clients retain the public user read contract'
);

set local role service_role;
insert into public.users (
  id, email, username, role, customer_id, subscription_id,
  subscription_status, plan_id, current_period_end, billing_cycle
)
values (
  '00000000-0000-0000-0000-000000000401',
  'billing-owner@example.test',
  'billing-owner',
  'user',
  'cus_billing_owner',
  'sub_old',
  'PRO',
  'price_pro_monthly',
  '2026-09-01T00:00:00Z',
  'monthly'
);

select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'expected_subscription_id', 'sub_old',
      'expected_pending_subscription_id', null,
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'result',
  'begun',
  'Cancellation initiation atomically stores pending state and clears entitlement'
);
select results_eq(
  $$ select subscription_id, previous_subscription_status, restorable from private.subscription_cancellations where user_id = '00000000-0000-0000-0000-000000000401' $$,
  $$ values ('sub_old'::text, 'PRO'::text, true) $$,
  'Pending cancellation stores the exact retry ID and restoration snapshot'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', 'sub_old',
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'result',
  'retry',
  'A matching pending cancellation is retried atomically'
);
select is(
  public.finish_subscription_cancellation(
    '00000000-0000-0000-0000-000000000401', 'sub_old', 'restore'
  ),
  'restored',
  'Definitively active cancellation restores only a matching snapshot'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text, plan_id::text from public.users where id = '00000000-0000-0000-0000-000000000401' $$,
  $$ values ('sub_old'::text, 'PRO'::text, 'price_pro_monthly'::text) $$,
  'Matching restore returns the prior paid authority'
);

select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'expected_subscription_id', 'sub_old',
      'expected_pending_subscription_id', null,
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'result',
  'begun',
  'A later cancellation can begin after restoration'
);
select is(
  public.apply_stripe_subscription_update(
    jsonb_build_object(
      'customer_id', 'cus_billing_owner',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', 'sub_old',
      'subscription_id', 'sub_new',
      'plan_id', 'price_pro_monthly',
      'subscription_status', 'PRO',
      'current_period_end', '2026-10-01T00:00:00Z',
      'trial_end', null,
      'billing_cycle', 'monthly'
    )
  ),
  'applied',
  'A CAS update can install newer authority while an older cancellation remains pending'
);
select is(
  public.finish_subscription_cancellation(
    '00000000-0000-0000-0000-000000000401', 'sub_old', 'restore'
  ),
  'noop',
  'An old restoration cannot clobber newer authority after CAS'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text from public.users where id = '00000000-0000-0000-0000-000000000401' $$,
  $$ values ('sub_new'::text, 'PRO'::text) $$,
  'Newer authority survives the restore race'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'expected_subscription_id', 'sub_new',
      'expected_pending_subscription_id', 'sub_old',
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'subscription_id',
  'sub_old',
  'A transition retries older pending authority before acting on current authority'
);
select is(
  public.process_stripe_subscription_deletion('cus_billing_owner', 'sub_old'),
  'pending_cleared',
  'Deletion of the old subscription clears pending state without touching current authority'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000401',
      'expected_subscription_id', 'sub_new',
      'expected_pending_subscription_id', null,
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'subscription_id',
  'sub_new',
  'After old pending cleanup the same transition atomically begins current cancellation'
);
select is(
  public.apply_stripe_subscription_update(
    jsonb_build_object(
      'customer_id', 'cus_billing_owner',
      'expected_subscription_id', 'sub_old',
      'expected_pending_subscription_id', null,
      'subscription_id', 'sub_other',
      'plan_id', 'price_pro_monthly',
      'subscription_status', 'PRO',
      'current_period_end', '2026-11-01T00:00:00Z',
      'trial_end', null,
      'billing_cycle', 'monthly'
    )
  ),
  'conflict',
  'CAS rejects stale observed authority'
);
select is(
  public.process_stripe_customer_deletion('cus_billing_owner'),
  'processed',
  'Customer deletion atomically clears authority and records a private tombstone'
);
select is(
  public.process_stripe_subscription_deletion('cus_billing_owner', 'sub_new'),
  'customer_deleted',
  'Delayed subscription deletion acknowledges a private customer tombstone'
);
select throws_ok(
  $$ select public.process_stripe_subscription_deletion('cus_unknown', 'sub_unknown') $$,
  'P0002',
  'Stripe customer is not linked to a user',
  'Genuinely unknown subscription deletion remains an error'
);
select throws_ok(
  $$ select public.finish_subscription_cancellation('00000000-0000-0000-0000-000000000401', '', 'confirmed') $$,
  '22023',
  'Subscription ID is required',
  'Billing authority functions validate controlled identifiers'
);
select throws_ok(
  $$ select public.finish_subscription_cancellation('00000000-0000-0000-0000-000000000401', 'sub_new', null) $$,
  '22023',
  'Invalid cancellation outcome',
  'Cancellation completion rejects a null outcome'
);
select throws_ok(
  $$ select public.begin_subscription_cancellation(jsonb_build_object('user_id', '00000000-0000-0000-0000-000000000401', 'expected_subscription_id', 'sub_new', 'expected_pending_subscription_id', null, 'subscription_status', null, 'current_period_end', null)) $$,
  '22023',
  'Invalid subscription status',
  'Cancellation initiation rejects a null status'
);
select throws_ok(
  $$ select public.apply_stripe_subscription_update(jsonb_build_object('customer_id', 'cus_billing_owner', 'expected_subscription_id', null, 'expected_pending_subscription_id', null, 'subscription_id', 'sub_new', 'plan_id', 'price_pro_monthly', 'subscription_status', null, 'current_period_end', null, 'trial_end', null, 'billing_cycle', 'monthly')) $$,
  '22023',
  'Invalid subscription status',
  'Subscription CAS rejects a null status'
);

insert into public.users (
  id, email, username, role, customer_id, subscription_status, billing_cycle
)
values
  (
    '00000000-0000-0000-0000-000000000403',
    'pending-paid-transition@example.test',
    'pending-paid-transition',
    'user',
    'cus_pending_paid_transition',
    'FREE',
    'monthly'
  ),
  (
    '00000000-0000-0000-0000-000000000404',
    'direct-paid-transition@example.test',
    'direct-paid-transition',
    'user',
    'cus_direct_paid_transition',
    'FREE',
    'monthly'
  );
insert into private.subscription_cancellations (
  user_id, subscription_id, previous_billing_cycle, restorable
)
values (
  '00000000-0000-0000-0000-000000000403',
  'sub_stale_pending',
  'monthly',
  false
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000403',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', 'sub_stale_pending',
      'subscription_status', 'PREMIUM PRO',
      'current_period_end', '2026-12-01T00:00:00Z'
    )
  )->>'result',
  'retry',
  'A paid transition first retries exact old pending cancellation state'
);
select is(
  public.finish_subscription_cancellation(
    '00000000-0000-0000-0000-000000000403',
    'sub_stale_pending',
    'confirmed'
  ),
  'cleared',
  'Confirmed old cancellation clears its durable private row'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000403',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', null,
      'subscription_status', 'PREMIUM PRO',
      'current_period_end', '2026-12-01T00:00:00Z'
    )
  )->>'result',
  'applied',
  'After retry cleanup the requested paid transition is applied atomically'
);
select results_eq(
  $$ select subscription_status::text, current_period_end from public.users where id = '00000000-0000-0000-0000-000000000403' $$,
  $$ values ('PREMIUM PRO'::text, '2026-12-01T00:00:00Z'::timestamptz) $$,
  'Retry then apply persists the requested paid authority values'
);
select is(
  public.process_stripe_subscription_deletion(
    'cus_pending_paid_transition',
    'sub_stale_pending'
  ),
  'cancellation_completed',
  'Delayed exact deletion acknowledges a completed cancellation tombstone'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text, current_period_end from public.users where id = '00000000-0000-0000-0000-000000000403' $$,
  $$ values (null::text, 'PREMIUM PRO'::text, '2026-12-01T00:00:00Z'::timestamptz) $$,
  'Delayed exact deletion preserves the manual paid transition'
);
select throws_ok(
  $$ select public.process_stripe_subscription_deletion('cus_pending_paid_transition', 'sub_distinct_unknown') $$,
  'P0002',
  'Stripe subscription is not recognized',
  'A distinct unknown deletion still requests a retry'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000404',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', null,
      'subscription_status', 'PRO',
      'current_period_end', '2026-11-01T00:00:00Z'
    )
  )->>'result',
  'applied',
  'A direct admin paid transition applies without an existing subscription'
);
select results_eq(
  $$ select subscription_status::text, current_period_end from public.users where id = '00000000-0000-0000-0000-000000000404' $$,
  $$ values ('PRO'::text, '2026-11-01T00:00:00Z'::timestamptz) $$,
  'Direct no-subscription transition persists requested paid authority values'
);

insert into public.users (
  id, email, username, role, customer_id, subscription_id,
  subscription_status, plan_id, current_period_end, billing_cycle
)
values (
  '00000000-0000-0000-0000-000000000405',
  'webhook-first-cancellation@example.test',
  'webhook-first-cancellation',
  'user',
  'cus_webhook_first',
  'sub_webhook_first',
  'PRO',
  'price_pro_monthly',
  '2026-11-01T00:00:00Z',
  'monthly'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000405',
      'expected_subscription_id', 'sub_webhook_first',
      'expected_pending_subscription_id', null,
      'subscription_status', 'FREE',
      'current_period_end', null
    )
  )->>'result',
  'begun',
  'Webhook-first cancellation begins with exact private pending authority'
);
select is(
  public.process_stripe_subscription_deletion(
    'cus_webhook_first',
    'sub_webhook_first'
  ),
  'pending_cleared',
  'Deletion webhook clears exact pending cancellation first'
);
select results_eq(
  $$ select customer_id, subscription_id from private.completed_subscription_cancellations where customer_id = 'cus_webhook_first' and subscription_id = 'sub_webhook_first' $$,
  $$ values ('cus_webhook_first'::text, 'sub_webhook_first'::text) $$,
  'Webhook-first deletion atomically records the exact completed cancellation'
);
select is(
  public.finish_subscription_cancellation(
    '00000000-0000-0000-0000-000000000405',
    'sub_webhook_first',
    'confirmed'
  ),
  'noop',
  'Application completion is safely idempotent after the deletion webhook'
);
select is(
  public.begin_subscription_cancellation(
    jsonb_build_object(
      'user_id', '00000000-0000-0000-0000-000000000405',
      'expected_subscription_id', null,
      'expected_pending_subscription_id', null,
      'subscription_status', 'PREMIUM PRO',
      'current_period_end', '2026-12-01T00:00:00Z'
    )
  )->>'result',
  'applied',
  'Manual paid transition applies after webhook-first cancellation completion'
);
select results_eq(
  $$ select case when exists (select 1 from private.completed_subscription_cancellations where customer_id = 'cus_webhook_first' and subscription_id = 'sub_webhook_first') then public.process_stripe_subscription_deletion('cus_webhook_first', 'sub_webhook_first') else 'missing_tombstone' end $$,
  $$ values ('cancellation_completed'::text) $$,
  'Duplicate exact deletion acknowledges the completed cancellation'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text, current_period_end from public.users where id = '00000000-0000-0000-0000-000000000405' $$,
  $$ values (null::text, 'PREMIUM PRO'::text, '2026-12-01T00:00:00Z'::timestamptz) $$,
  'Duplicate exact deletion preserves manual paid authority'
);
select throws_ok(
  $$ select public.process_stripe_subscription_deletion('cus_webhook_first', 'sub_distinct_unknown') $$,
  'P0002',
  'Stripe subscription is not recognized',
  'Distinct unknown deletion remains a retryable authority error'
);

insert into public.users (
  id, email, username, role, customer_id, subscription_id,
  subscription_status, plan_id, current_period_end, billing_cycle
)
values (
  '00000000-0000-0000-0000-000000000408',
  'direct-deletion-replay@example.test',
  'direct-deletion-replay',
  'user',
  'cus_direct_deletion_replay',
  'sub_direct_deletion_replay',
  'PRO',
  'price_pro_monthly',
  '2026-11-01T00:00:00Z',
  'monthly'
);
select is(
  public.process_stripe_subscription_deletion(
    'cus_direct_deletion_replay',
    'sub_direct_deletion_replay'
  ),
  'current_cleared',
  'Direct current-subscription deletion clears matching authority'
);
select results_eq(
  $$ select customer_id, subscription_id from private.completed_subscription_cancellations where customer_id = 'cus_direct_deletion_replay' and subscription_id = 'sub_direct_deletion_replay' $$,
  $$ values ('cus_direct_deletion_replay'::text, 'sub_direct_deletion_replay'::text) $$,
  'Direct current-subscription deletion atomically records the exact completion tombstone'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text, plan_id::text, current_period_end from public.users where id = '00000000-0000-0000-0000-000000000408' $$,
  $$ values (null::text, 'FREE'::text, null::text, null::timestamptz) $$,
  'Direct current-subscription deletion clears current paid authority'
);

update public.users
set
  subscription_id = null,
  subscription_status = 'PREMIUM PRO',
  plan_id = 'price_premium_annual',
  current_period_end = '2026-12-01T00:00:00Z',
  billing_cycle = 'annually'
where id = '00000000-0000-0000-0000-000000000408';
create temporary table direct_deletion_replay_result (
  result text not null
) on commit drop;
select lives_ok(
  $$ insert into pg_temp.direct_deletion_replay_result select public.process_stripe_subscription_deletion('cus_direct_deletion_replay', 'sub_direct_deletion_replay') $$,
  'Exact direct-deletion replay is acknowledged after an intentional paid null-subscription transition'
);
select results_eq(
  $$ select result from pg_temp.direct_deletion_replay_result $$,
  $$ values ('cancellation_completed'::text) $$,
  'Exact direct-deletion replay returns the completed-cancellation result'
);
select results_eq(
  $$ select subscription_id::text, subscription_status::text, plan_id::text, current_period_end, billing_cycle::text from public.users where id = '00000000-0000-0000-0000-000000000408' $$,
  $$ values (null::text, 'PREMIUM PRO'::text, 'price_premium_annual'::text, '2026-12-01T00:00:00Z'::timestamptz, 'annually'::text) $$,
  'Exact direct-deletion replay preserves intentional manual paid authority'
);
select throws_ok(
  $$ select public.process_stripe_subscription_deletion('cus_direct_deletion_replay', 'sub_distinct_unknown') $$,
  'P0002',
  'Stripe subscription is not recognized',
  'Distinct unknown deletion remains an error after direct-deletion completion'
);

select * from finish();
rollback;
