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

drop trigger if exists "trigger-users-table-changed" on public.users;

create or replace function public.notify_user_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  if new.subscription_status is distinct from 'PREMIUM PRO'
    and new.use_dental_brand is false then
    new.use_dental_brand := true;
  end if;

  if new.subscription_status is not distinct from old.subscription_status
    and new.billing_cycle is not distinct from old.billing_cycle then
    return new;
  end if;

  select decrypted_secret into webhook_url
  from vault.decrypted_secrets
  where name = 'user_changed_webhook_url';

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets
  where name = 'user_changed_webhook_secret';

  if webhook_url is null or btrim(webhook_url) = ''
    or webhook_secret is null or btrim(webhook_secret) = '' then
    return new;
  end if;

  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || webhook_secret,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'registered_domain', new.registered_domain,
        'subscription_status', new.subscription_status,
        'billing_cycle', new.billing_cycle,
        'use_dental_brand', new.use_dental_brand
      ),
      'old_record', jsonb_build_object(
        'subscription_status', old.subscription_status,
        'billing_cycle', old.billing_cycle
      )
    )
  );

  return new;
end;
$$;

revoke all on function public.notify_user_changed()
from public, anon, authenticated, service_role;

create trigger "trigger-users-table-changed"
before update of subscription_status, billing_cycle, use_dental_brand
on public.users
for each row
execute function public.notify_user_changed();

comment on function public.notify_user_changed() is
  'Trigger-only producer. Provision user_changed_webhook_url and user_changed_webhook_secret as named Supabase Vault secrets.';
