begin;

select plan(17);

select has_column(
  'public',
  'users',
  'pending_cancellation_subscription_id',
  'Users retain a durable pending Stripe cancellation ID'
);
select has_table(
  'public',
  'stripe_customer_deletion_tombstones',
  'Processed Stripe customer deletions have durable tombstones'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.stripe_customer_deletion_tombstones'::regclass),
  'Stripe customer deletion tombstones enforce RLS'
);
select has_function(
  'public',
  'process_stripe_customer_deletion',
  array['text'],
  'Customer deletion processing is exposed through one atomic function'
);
select ok(
  not has_function_privilege('public', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'PUBLIC cannot execute customer deletion processing'
);
select ok(
  not has_function_privilege('anon', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Anonymous callers cannot execute customer deletion processing'
);
select ok(
  not has_function_privilege('authenticated', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Authenticated callers cannot execute customer deletion processing'
);
select ok(
  has_function_privilege('service_role', 'public.process_stripe_customer_deletion(text)', 'execute'),
  'Service role can execute customer deletion processing'
);
select ok(
  not has_table_privilege('anon', 'public.stripe_customer_deletion_tombstones', 'select'),
  'Anonymous callers cannot read customer deletion tombstones'
);
select ok(
  not has_table_privilege('authenticated', 'public.stripe_customer_deletion_tombstones', 'select'),
  'Authenticated callers cannot read customer deletion tombstones'
);

insert into public.users (
  id,
  email,
  username,
  role,
  customer_id,
  subscription_id,
  pending_cancellation_subscription_id,
  subscription_status,
  plan_id,
  current_period_end
)
values (
  '00000000-0000-0000-0000-000000000401',
  'billing-owner@example.test',
  'billing-owner',
  'user',
  'cus_billing_owner',
  'sub_current',
  'sub_pending',
  'PRO',
  'price_pro_monthly',
  now() + interval '1 month'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000401', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  $$ update public.users set pending_cancellation_subscription_id = 'sub_attacker' where id = '00000000-0000-0000-0000-000000000401' $$,
  '42501'
);

set local role service_role;
select is(
  public.process_stripe_customer_deletion('cus_billing_owner'),
  'processed',
  'First customer deletion clears linked authority and records a tombstone'
);
select results_eq(
  $$
    select customer_id::text, subscription_id::text,
      pending_cancellation_subscription_id::text,
      subscription_status::text, plan_id::text, current_period_end
    from public.users
    where id = '00000000-0000-0000-0000-000000000401'
  $$,
  $$ values (null::text, null::text, null::text, 'FREE'::text, null::text, null::timestamptz) $$,
  'Customer deletion atomically clears current and pending billing authority'
);
select is(
  (select count(*)::integer from public.stripe_customer_deletion_tombstones where customer_id = 'cus_billing_owner'),
  1,
  'Customer deletion records exactly one durable tombstone'
);
select is(
  public.process_stripe_customer_deletion('cus_billing_owner'),
  'already_processed',
  'Duplicate customer deletion is acknowledged durably'
);
select is(
  (select count(*)::integer from public.stripe_customer_deletion_tombstones where customer_id = 'cus_billing_owner'),
  1,
  'Duplicate customer deletion does not duplicate tombstones'
);
select throws_ok(
  $$ select public.process_stripe_customer_deletion('cus_genuinely_unknown') $$,
  'P0002',
  'Stripe customer is not linked to a user',
  'A distinct unknown customer remains an error'
);

select * from finish();
rollback;
