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
select hasnt_table(
  'public',
  'stripe_customer_deletion_tombstones',
  'Customer deletion tombstones are absent from public'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.subscription_cancellations'::regclass),
  'Pending cancellations enforce RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'private.stripe_customer_deletion_tombstones'::regclass),
  'Customer deletion tombstones enforce RLS'
);
select has_pk(
  'private',
  'subscription_cancellations',
  'Pending cancellations are keyed by user ID'
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
select lives_ok(
  $$ insert into public.users (id, email, username, role) values ('00000000-0000-0000-0000-000000000402', 'public-user@example.test', 'public-user', 'user') $$,
  'Dropping the public pending column does not break user inserts'
);
select results_eq(
  $$ select username::text from public.users where id = '00000000-0000-0000-0000-000000000402' $$,
  $$ values ('public-user'::text) $$,
  'Dropping the public pending column does not break user selects'
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

select * from finish();
rollback;
