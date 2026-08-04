create or replace function public.begin_subscription_cancellation(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p_user_id uuid;
  p_expected_subscription_id text;
  p_expected_pending_subscription_id text;
  p_subscription_status text;
  p_current_period_end timestamptz;
  target_user public.users%rowtype;
  pending private.subscription_cancellations%rowtype;
begin
  if p_input is null
    or jsonb_typeof(p_input) <> 'object'
    or not (p_input ?& array[
      'user_id', 'expected_subscription_id', 'expected_pending_subscription_id',
      'subscription_status', 'current_period_end'
    ])
    or (p_input - array[
      'user_id', 'expected_subscription_id', 'expected_pending_subscription_id',
      'subscription_status', 'current_period_end'
    ]::text[]) <> '{}'::jsonb then
    raise exception 'Invalid cancellation input' using errcode = '22023';
  end if;

  p_user_id := nullif(p_input->>'user_id', '')::uuid;
  p_expected_subscription_id := p_input->>'expected_subscription_id';
  p_expected_pending_subscription_id := p_input->>'expected_pending_subscription_id';
  p_subscription_status := p_input->>'subscription_status';
  p_current_period_end := nullif(p_input->>'current_period_end', '')::timestamptz;

  if p_user_id is null then
    raise exception 'User ID is required' using errcode = '22023';
  end if;
  if p_expected_subscription_id = '' or p_expected_pending_subscription_id = '' then
    raise exception 'Subscription ID cannot be empty' using errcode = '22023';
  end if;
  if p_subscription_status is null
    or p_subscription_status not in ('FREE', 'PRO', 'PREMIUM PRO') then
    raise exception 'Invalid subscription status' using errcode = '22023';
  end if;
  if (p_subscription_status = 'FREE' and p_current_period_end is not null)
    or (p_subscription_status <> 'FREE' and p_current_period_end is null) then
    raise exception 'Invalid subscription period' using errcode = '22023';
  end if;

  select * into target_user
  from public.users
  where id = p_user_id
  for update;
  if not found then
    raise exception 'User was not found' using errcode = 'P0002';
  end if;

  select * into pending
  from private.subscription_cancellations
  where user_id = p_user_id
  for update;

  if target_user.subscription_id is distinct from p_expected_subscription_id
    or pending.subscription_id is distinct from p_expected_pending_subscription_id then
    return jsonb_build_object('result', 'conflict', 'subscription_id', null);
  end if;

  if pending.subscription_id is not null then
    return jsonb_build_object(
      'result', 'retry',
      'subscription_id', pending.subscription_id
    );
  end if;

  if target_user.subscription_id is null then
    if target_user.subscription_status is not distinct from p_subscription_status
      and target_user.current_period_end is not distinct from p_current_period_end then
      return jsonb_build_object('result', 'none', 'subscription_id', null);
    end if;

    update public.users
    set
      subscription_status = p_subscription_status,
      current_period_end = p_current_period_end,
      plan_id = case when p_subscription_status = 'FREE' then null else plan_id end,
      trial_end = case when p_subscription_status = 'FREE' then null else trial_end end
    where id = p_user_id;

    return jsonb_build_object('result', 'applied', 'subscription_id', null);
  end if;

  insert into private.subscription_cancellations (
    user_id,
    subscription_id,
    previous_subscription_id,
    previous_subscription_status,
    previous_current_period_end,
    previous_plan_id,
    previous_trial_end,
    previous_billing_cycle,
    restorable
  ) values (
    target_user.id,
    target_user.subscription_id,
    target_user.subscription_id,
    target_user.subscription_status,
    target_user.current_period_end,
    target_user.plan_id,
    target_user.trial_end,
    target_user.billing_cycle,
    true
  );

  update public.users
  set
    subscription_id = null,
    subscription_status = p_subscription_status,
    current_period_end = p_current_period_end,
    plan_id = case when p_subscription_status = 'FREE' then null else plan_id end,
    trial_end = case when p_subscription_status = 'FREE' then null else trial_end end
  where id = p_user_id;

  return jsonb_build_object(
    'result', 'begun',
    'subscription_id', target_user.subscription_id
  );
end;
$$;

revoke all on function public.begin_subscription_cancellation(jsonb)
from public, anon, authenticated;
grant execute on function public.begin_subscription_cancellation(jsonb)
to service_role;
