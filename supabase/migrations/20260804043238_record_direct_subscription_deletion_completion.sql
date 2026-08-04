create or replace function public.process_stripe_subscription_deletion(
  p_customer_id text,
  p_subscription_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user public.users%rowtype;
  pending private.subscription_cancellations%rowtype;
begin
  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'Stripe customer ID is required' using errcode = '22023';
  end if;
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'Subscription ID is required' using errcode = '22023';
  end if;

  select * into target_user
  from public.users
  where customer_id = p_customer_id
  for update;

  if not found then
    if exists (
      select 1 from private.stripe_customer_deletion_tombstones
      where customer_id = p_customer_id
    ) then
      return 'customer_deleted';
    end if;
    if exists (
      select 1 from private.completed_subscription_cancellations
      where customer_id = p_customer_id and subscription_id = p_subscription_id
    ) then
      return 'cancellation_completed';
    end if;
    raise exception 'Stripe customer is not linked to a user' using errcode = 'P0002';
  end if;

  select * into pending
  from private.subscription_cancellations
  where user_id = target_user.id
  for update;

  if pending.subscription_id = p_subscription_id
    and target_user.subscription_id is distinct from p_subscription_id then
    insert into private.completed_subscription_cancellations (
      customer_id,
      subscription_id,
      user_id,
      completed_at
    ) values (
      p_customer_id,
      p_subscription_id,
      target_user.id,
      now()
    )
    on conflict (customer_id, subscription_id) do update
    set user_id = excluded.user_id, completed_at = excluded.completed_at;

    delete from private.subscription_cancellations
    where user_id = target_user.id and subscription_id = p_subscription_id;
    return 'pending_cleared';
  end if;

  if target_user.subscription_id = p_subscription_id then
    insert into private.completed_subscription_cancellations (
      customer_id,
      subscription_id,
      user_id,
      completed_at
    ) values (
      p_customer_id,
      p_subscription_id,
      target_user.id,
      now()
    )
    on conflict (customer_id, subscription_id) do update
    set user_id = excluded.user_id, completed_at = excluded.completed_at;

    update public.users
    set
      subscription_id = null,
      plan_id = null,
      subscription_status = 'FREE',
      current_period_end = null,
      trial_end = null
    where id = target_user.id and subscription_id = p_subscription_id;

    delete from private.subscription_cancellations
    where user_id = target_user.id and subscription_id = p_subscription_id;
    return 'current_cleared';
  end if;

  if exists (
    select 1 from private.completed_subscription_cancellations
    where customer_id = p_customer_id and subscription_id = p_subscription_id
  ) then
    return 'cancellation_completed';
  end if;

  if target_user.subscription_id is null
    and target_user.subscription_status = 'FREE' then
    return 'already_cleared';
  end if;
  if target_user.subscription_id is null then
    raise exception 'Stripe subscription is not recognized' using errcode = 'P0002';
  end if;
  return 'stale';
end;
$$;

revoke all on function public.process_stripe_subscription_deletion(text, text)
from public, anon, authenticated;
grant execute on function public.process_stripe_subscription_deletion(text, text)
to service_role;
