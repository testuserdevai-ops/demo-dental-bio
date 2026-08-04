create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.stripe_customer_deletion_tombstones
set schema private;

create table private.subscription_cancellations (
  user_id uuid primary key references public.users (id) on delete cascade,
  subscription_id text not null unique,
  previous_subscription_id text,
  previous_subscription_status text,
  previous_current_period_end timestamptz,
  previous_plan_id text,
  previous_trial_end timestamptz,
  previous_billing_cycle public.billing_cycle_enum not null,
  restorable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.subscription_cancellations enable row level security;

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
)
select
  id,
  pending_cancellation_subscription_id,
  null,
  null,
  null,
  null,
  null,
  billing_cycle,
  false
from public.users
where pending_cancellation_subscription_id is not null;

alter table public.users
drop column pending_cancellation_subscription_id;

revoke all on table private.subscription_cancellations
from public, anon, authenticated;
grant select, insert, update, delete on table private.subscription_cancellations
to service_role;

revoke all on table private.stripe_customer_deletion_tombstones
from public, anon, authenticated;
grant select, insert, update, delete on table private.stripe_customer_deletion_tombstones
to service_role;

create or replace function public.get_subscription_authority_for_user(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_user_id is null then
    raise exception 'User ID is required' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'user_id', u.id,
    'subscription_id', u.subscription_id,
    'pending_subscription_id', c.subscription_id,
    'subscription_status', u.subscription_status,
    'current_period_end', u.current_period_end,
    'plan_id', u.plan_id,
    'trial_end', u.trial_end,
    'billing_cycle', u.billing_cycle
  )
  into result
  from public.users u
  left join private.subscription_cancellations c on c.user_id = u.id
  where u.id = p_user_id;

  if result is null then
    raise exception 'User was not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

create or replace function public.get_subscription_authority_for_stripe_customer(
  p_customer_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'Stripe customer ID is required' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'user_id', u.id,
    'subscription_id', u.subscription_id,
    'pending_subscription_id', c.subscription_id,
    'subscription_status', u.subscription_status,
    'current_period_end', u.current_period_end,
    'plan_id', u.plan_id,
    'trial_end', u.trial_end,
    'billing_cycle', u.billing_cycle
  )
  into result
  from public.users u
  left join private.subscription_cancellations c on c.user_id = u.id
  where u.customer_id = p_customer_id;

  return result;
end;
$$;

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
    return jsonb_build_object('result', 'none', 'subscription_id', null);
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

  perform 1
  from public.users
  where id = p_user_id
  for update;

  select * into pending
  from private.subscription_cancellations
  where user_id = p_user_id and subscription_id = p_subscription_id
  for update;
  if not found then
    return 'noop';
  end if;

  if p_outcome = 'confirmed' then
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

create or replace function public.apply_stripe_subscription_update(p_input jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p_customer_id text;
  p_expected_subscription_id text;
  p_expected_pending_subscription_id text;
  p_subscription_id text;
  p_plan_id text;
  p_subscription_status text;
  p_current_period_end timestamptz;
  p_trial_end timestamptz;
  p_billing_cycle public.billing_cycle_enum;
  target_user public.users%rowtype;
  pending private.subscription_cancellations%rowtype;
begin
  if p_input is null
    or jsonb_typeof(p_input) <> 'object'
    or not (p_input ?& array[
      'customer_id', 'expected_subscription_id', 'expected_pending_subscription_id',
      'subscription_id', 'plan_id', 'subscription_status', 'current_period_end',
      'trial_end', 'billing_cycle'
    ])
    or (p_input - array[
      'customer_id', 'expected_subscription_id', 'expected_pending_subscription_id',
      'subscription_id', 'plan_id', 'subscription_status', 'current_period_end',
      'trial_end', 'billing_cycle'
    ]::text[]) <> '{}'::jsonb then
    raise exception 'Invalid subscription update input' using errcode = '22023';
  end if;

  p_customer_id := p_input->>'customer_id';
  p_expected_subscription_id := p_input->>'expected_subscription_id';
  p_expected_pending_subscription_id := p_input->>'expected_pending_subscription_id';
  p_subscription_id := p_input->>'subscription_id';
  p_plan_id := p_input->>'plan_id';
  p_subscription_status := p_input->>'subscription_status';
  p_current_period_end := nullif(p_input->>'current_period_end', '')::timestamptz;
  p_trial_end := nullif(p_input->>'trial_end', '')::timestamptz;
  p_billing_cycle := nullif(p_input->>'billing_cycle', '')::public.billing_cycle_enum;

  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'Stripe customer ID is required' using errcode = '22023';
  end if;
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'Subscription ID is required' using errcode = '22023';
  end if;
  if p_expected_subscription_id = '' or p_expected_pending_subscription_id = '' then
    raise exception 'Expected subscription ID cannot be empty' using errcode = '22023';
  end if;
  if p_subscription_status is null
    or p_subscription_status not in ('FREE', 'PRO', 'PREMIUM PRO') then
    raise exception 'Invalid subscription status' using errcode = '22023';
  end if;

  select * into target_user
  from public.users
  where customer_id = p_customer_id
  for update;
  if not found then
    raise exception 'Stripe customer is not linked to a user' using errcode = 'P0002';
  end if;

  select * into pending
  from private.subscription_cancellations
  where user_id = target_user.id
  for update;

  if target_user.subscription_id is distinct from p_expected_subscription_id
    or pending.subscription_id is distinct from p_expected_pending_subscription_id then
    return 'conflict';
  end if;

  if pending.subscription_id = p_subscription_id
    and target_user.subscription_id is distinct from p_subscription_id then
    return 'pending_cancellation';
  end if;

  update public.users
  set
    subscription_id = p_subscription_id,
    plan_id = p_plan_id,
    subscription_status = p_subscription_status,
    current_period_end = p_current_period_end,
    trial_end = p_trial_end,
    billing_cycle = coalesce(p_billing_cycle, billing_cycle)
  where id = target_user.id;

  if pending.subscription_id is not null
    and pending.subscription_id is distinct from p_subscription_id then
    update private.subscription_cancellations
    set restorable = false, updated_at = now()
    where user_id = target_user.id;
  end if;

  return 'applied';
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

  if target_user.subscription_id is null
    and target_user.subscription_status = 'FREE' then
    return 'already_cleared';
  end if;
  if target_user.subscription_id is null then
    raise exception 'Stripe subscription authority is inconsistent';
  end if;
  return 'stale';
end;
$$;

create or replace function public.process_stripe_customer_deletion(
  p_customer_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_user_id uuid;
begin
  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'Stripe customer ID is required' using errcode = '22023';
  end if;

  select id into linked_user_id
  from public.users
  where customer_id = p_customer_id
  for update;

  if linked_user_id is not null then
    update public.users
    set
      subscription_id = null,
      plan_id = null,
      subscription_status = 'FREE',
      current_period_end = null,
      trial_end = null,
      customer_id = null
    where id = linked_user_id;

    delete from private.subscription_cancellations
    where user_id = linked_user_id;

    insert into private.stripe_customer_deletion_tombstones (customer_id)
    values (p_customer_id)
    on conflict (customer_id) do nothing;
    return 'processed';
  end if;

  if exists (
    select 1 from private.stripe_customer_deletion_tombstones
    where customer_id = p_customer_id
  ) then
    return 'already_processed';
  end if;

  raise exception 'Stripe customer is not linked to a user'
    using errcode = 'P0002';
end;
$$;

revoke all on function public.get_subscription_authority_for_user(uuid)
from public, anon, authenticated;
revoke all on function public.get_subscription_authority_for_stripe_customer(text)
from public, anon, authenticated;
revoke all on function public.begin_subscription_cancellation(jsonb)
from public, anon, authenticated;
revoke all on function public.finish_subscription_cancellation(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.apply_stripe_subscription_update(jsonb)
from public, anon, authenticated;
revoke all on function public.process_stripe_subscription_deletion(text, text)
from public, anon, authenticated;
revoke all on function public.process_stripe_customer_deletion(text)
from public, anon, authenticated;

grant execute on function public.get_subscription_authority_for_user(uuid)
to service_role;
grant execute on function public.get_subscription_authority_for_stripe_customer(text)
to service_role;
grant execute on function public.begin_subscription_cancellation(jsonb)
to service_role;
grant execute on function public.finish_subscription_cancellation(uuid, text, text)
to service_role;
grant execute on function public.apply_stripe_subscription_update(jsonb)
to service_role;
grant execute on function public.process_stripe_subscription_deletion(text, text)
to service_role;
grant execute on function public.process_stripe_customer_deletion(text)
to service_role;
