revoke update (domain, use_dental_brand) on table public.users from authenticated;

create table private.completed_subscription_cancellations (
  customer_id text not null,
  subscription_id text not null,
  user_id uuid not null,
  completed_at timestamptz not null default now(),
  primary key (customer_id, subscription_id)
);

alter table private.completed_subscription_cancellations enable row level security;

revoke all on table private.completed_subscription_cancellations from public, anon, authenticated;
grant select, insert, update, delete on table private.completed_subscription_cancellations to service_role;

create or replace function public.finish_subscription_cancellation(
  p_user_id uuid,
  p_subscription_id text,
  p_outcome text
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
  if p_user_id is null then
    raise exception 'User ID is required' using errcode = '22023';
  end if;
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'Subscription ID is required' using errcode = '22023';
  end if;
  if p_outcome is null or p_outcome not in ('confirmed', 'restore') then
    raise exception 'Invalid cancellation outcome' using errcode = '22023';
  end if;

  select * into target_user
  from public.users
  where id = p_user_id
  for update;
  if not found then
    return 'noop';
  end if;

  select * into pending
  from private.subscription_cancellations
  where user_id = p_user_id and subscription_id = p_subscription_id
  for update;
  if not found then
    return 'noop';
  end if;

  if p_outcome = 'confirmed' then
    if target_user.customer_id is not null then
      insert into private.completed_subscription_cancellations (
        customer_id,
        subscription_id,
        user_id,
        completed_at
      ) values (
        target_user.customer_id,
        p_subscription_id,
        p_user_id,
        now()
      )
      on conflict (customer_id, subscription_id) do update
      set user_id = excluded.user_id, completed_at = excluded.completed_at;
    end if;

    delete from private.subscription_cancellations
    where user_id = p_user_id and subscription_id = p_subscription_id;
    return 'cleared';
  end if;

  if not pending.restorable then
    return 'noop';
  end if;

  update public.users
  set
    subscription_id = pending.previous_subscription_id,
    subscription_status = pending.previous_subscription_status,
    current_period_end = pending.previous_current_period_end,
    plan_id = pending.previous_plan_id,
    trial_end = pending.previous_trial_end,
    billing_cycle = pending.previous_billing_cycle
  where id = p_user_id and subscription_id is null;

  if not found then
    update private.subscription_cancellations
    set restorable = false, updated_at = now()
    where user_id = p_user_id and subscription_id = p_subscription_id;
    return 'noop';
  end if;

  delete from private.subscription_cancellations
  where user_id = p_user_id and subscription_id = p_subscription_id;
  return 'restored';
end;
$$;

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
    delete from private.subscription_cancellations
    where user_id = target_user.id and subscription_id = p_subscription_id;
    return 'pending_cleared';
  end if;

  if target_user.subscription_id = p_subscription_id then
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

revoke all on function public.finish_subscription_cancellation(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.process_stripe_subscription_deletion(text, text)
from public, anon, authenticated;
grant execute on function public.finish_subscription_cancellation(uuid, text, text)
to service_role;
grant execute on function public.process_stripe_subscription_deletion(text, text)
to service_role;
