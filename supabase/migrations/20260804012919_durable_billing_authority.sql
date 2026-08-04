alter table public.users
add column pending_cancellation_subscription_id text;

create table public.stripe_customer_deletion_tombstones (
  customer_id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.stripe_customer_deletion_tombstones enable row level security;

revoke all on table public.stripe_customer_deletion_tombstones
from public, anon, authenticated;

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

  select id
  into linked_user_id
  from public.users
  where customer_id = p_customer_id
  for update;

  if linked_user_id is not null then
    update public.users
    set
      subscription_id = null,
      pending_cancellation_subscription_id = null,
      plan_id = null,
      subscription_status = 'FREE',
      current_period_end = null,
      trial_end = null,
      customer_id = null
    where id = linked_user_id;

    insert into public.stripe_customer_deletion_tombstones (customer_id)
    values (p_customer_id)
    on conflict (customer_id) do nothing;

    return 'processed';
  end if;

  if exists (
    select 1
    from public.stripe_customer_deletion_tombstones
    where customer_id = p_customer_id
  ) then
    return 'already_processed';
  end if;

  raise exception 'Stripe customer is not linked to a user'
    using errcode = 'P0002';
end;
$$;

revoke all on function public.process_stripe_customer_deletion(text)
from public, anon, authenticated;
grant execute on function public.process_stripe_customer_deletion(text)
to service_role;
