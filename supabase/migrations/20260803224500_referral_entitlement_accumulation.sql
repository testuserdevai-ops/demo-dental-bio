-- Referral rewards cross Postgres and Stripe. Persist each logical grant and
-- serialize provider mutations per referrer so distinct grants accumulate from
-- one authoritative target while retries reuse the same absolute target.

create table public.referral_entitlement_accounts (
  user_id uuid primary key references public.users (id) on delete cascade,
  authoritative_end timestamp with time zone not null,
  lease_operation_key text,
  lease_expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint referral_entitlement_accounts_lease_pair check (
    (lease_operation_key is null) = (lease_expires_at is null)
  ),
  constraint referral_entitlement_accounts_lease_key_length check (
    lease_operation_key is null
    or char_length(lease_operation_key) between 1 and 255
  )
);

create table public.referral_entitlement_operations (
  user_id uuid not null references public.referral_entitlement_accounts (user_id) on delete cascade,
  operation_key text not null,
  additional_months smallint not null,
  target_end timestamp with time zone not null,
  is_trial boolean not null,
  status text not null default 'processing',
  attempt_count integer not null default 1,
  applied_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, operation_key),
  constraint referral_entitlement_operations_key_length check (
    char_length(operation_key) between 1 and 255
  ),
  constraint referral_entitlement_operations_months check (
    additional_months between 1 and 24
  ),
  constraint referral_entitlement_operations_status check (
    status in ('pending', 'processing', 'applied')
  ),
  constraint referral_entitlement_operations_applied_pair check (
    (status = 'applied') = (applied_at is not null)
  ),
  constraint referral_entitlement_operations_attempt_count check (
    attempt_count >= 1
  )
);

alter table public.referral_entitlement_accounts enable row level security;
alter table public.referral_entitlement_accounts force row level security;
alter table public.referral_entitlement_operations enable row level security;
alter table public.referral_entitlement_operations force row level security;

revoke all on table public.referral_entitlement_accounts from public, anon, authenticated;
revoke all on table public.referral_entitlement_operations from public, anon, authenticated;
grant select, insert, update on table public.referral_entitlement_accounts to service_role;
grant select, insert, update on table public.referral_entitlement_operations to service_role;

create function public.claim_referral_entitlement(
  p_user_id uuid,
  p_operation_key text,
  p_additional_months smallint,
  p_provider_period_end timestamp with time zone,
  p_is_trial boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  account public.referral_entitlement_accounts;
  operation public.referral_entitlement_operations;
  normalized_key text := btrim(p_operation_key);
  next_target timestamp with time zone;
begin
  if normalized_key is null
    or char_length(normalized_key) not between 1 and 255
    or p_additional_months not between 1 and 24
    or p_provider_period_end is null
    or p_is_trial is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid referral entitlement claim';
  end if;

  insert into public.referral_entitlement_accounts (
    user_id,
    authoritative_end
  )
  values (
    p_user_id,
    greatest(p_provider_period_end, now())
  )
  on conflict (user_id) do nothing;

  select *
  into strict account
  from public.referral_entitlement_accounts
  where user_id = p_user_id
  for update;

  select *
  into operation
  from public.referral_entitlement_operations
  where user_id = p_user_id
    and operation_key = normalized_key;

  if found then
    if operation.additional_months <> p_additional_months then
      raise exception using
        errcode = '22023',
        message = 'referral operation parameters are immutable';
    end if;

    if operation.status = 'applied' then
      return jsonb_build_object(
        'claim_status', 'already_applied',
        'target_end', operation.target_end,
        'is_trial', operation.is_trial
      );
    end if;

    if account.lease_operation_key is not null
      and account.lease_expires_at > now()
    then
      return jsonb_build_object('claim_status', 'busy');
    end if;

    update public.referral_entitlement_accounts
    set
      lease_operation_key = normalized_key,
      lease_expires_at = now() + interval '5 minutes',
      updated_at = now()
    where user_id = p_user_id;

    update public.referral_entitlement_operations
    set
      status = 'processing',
      attempt_count = attempt_count + 1,
      updated_at = now()
    where user_id = p_user_id
      and operation_key = normalized_key;

    return jsonb_build_object(
      'claim_status', 'claimed',
      'target_end', operation.target_end,
      'is_trial', operation.is_trial
    );
  end if;

  if account.lease_operation_key is not null
    and account.lease_expires_at > now()
  then
    return jsonb_build_object('claim_status', 'busy');
  end if;

  if exists (
    select 1
    from public.referral_entitlement_operations
    where user_id = p_user_id
      and status <> 'applied'
  ) then
    return jsonb_build_object('claim_status', 'busy');
  end if;

  next_target := greatest(
    account.authoritative_end,
    p_provider_period_end,
    now()
  ) + make_interval(months => p_additional_months);

  update public.referral_entitlement_accounts
  set
    authoritative_end = next_target,
    lease_operation_key = normalized_key,
    lease_expires_at = now() + interval '5 minutes',
    updated_at = now()
  where user_id = p_user_id;

  insert into public.referral_entitlement_operations (
    user_id,
    operation_key,
    additional_months,
    target_end,
    is_trial
  ) values (
    p_user_id,
    normalized_key,
    p_additional_months,
    next_target,
    p_is_trial
  );

  return jsonb_build_object(
    'claim_status', 'claimed',
    'target_end', next_target,
    'is_trial', p_is_trial
  );
end;
$$;

create function public.finish_referral_entitlement(
  p_user_id uuid,
  p_operation_key text,
  p_succeeded boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  operation public.referral_entitlement_operations;
  normalized_key text := btrim(p_operation_key);
begin
  select *
  into operation
  from public.referral_entitlement_operations
  where user_id = p_user_id
    and operation_key = normalized_key
  for update;

  if not found then
    return null;
  end if;

  if operation.status <> 'applied' then
    update public.referral_entitlement_operations
    set
      status = case when p_succeeded then 'applied' else 'pending' end,
      applied_at = case when p_succeeded then now() else null end,
      updated_at = now()
    where user_id = p_user_id
      and operation_key = normalized_key
    returning * into operation;
  end if;

  update public.referral_entitlement_accounts
  set
    lease_operation_key = null,
    lease_expires_at = null,
    updated_at = now()
  where user_id = p_user_id
    and lease_operation_key = normalized_key;

  return jsonb_build_object(
    'operation_key', operation.operation_key,
    'status', operation.status,
    'target_end', operation.target_end
  );
end;
$$;

revoke execute on function public.claim_referral_entitlement(uuid, text, smallint, timestamp with time zone, boolean) from public, anon, authenticated;
revoke execute on function public.finish_referral_entitlement(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_referral_entitlement(uuid, text, smallint, timestamp with time zone, boolean) to service_role;
grant execute on function public.finish_referral_entitlement(uuid, text, boolean) to service_role;

comment on table public.referral_entitlement_accounts is
  'Authoritative cumulative referral entitlement target and per-referrer provider lease.';
comment on table public.referral_entitlement_operations is
  'One immutable cumulative target per logical referral grant; applied operations are terminal.';
comment on function public.claim_referral_entitlement(uuid, text, smallint, timestamp with time zone, boolean) is
  'Serializes referral provider work and returns a fixed cumulative target for idempotent replay.';
comment on function public.finish_referral_entitlement(uuid, text, boolean) is
  'Marks a claimed referral grant applied or retryable and releases its provider lease.';
