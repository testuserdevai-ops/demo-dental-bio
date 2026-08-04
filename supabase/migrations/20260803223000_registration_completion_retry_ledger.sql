-- Registration spans Supabase Auth, profile initialization, Stripe, referral
-- rewards, and email providers. This ledger makes application retries converge
-- without treating editable auth metadata as billing or authorization state.

create table public.registration_completions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  registered_domain text not null,
  referrer_user_id uuid,
  offer_code text,
  base_trial_months smallint not null,
  referral_bonus_months smallint not null,
  total_trial_months smallint generated always as (
    base_trial_months + referral_bonus_months
  ) stored,
  stripe_customer_id text,
  stripe_subscription_id text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint registration_completions_domain_length check (
    char_length(btrim(registered_domain)) between 1 and 255
  ),
  constraint registration_completions_offer_code_length check (
    offer_code is null or char_length(offer_code) between 1 and 100
  ),
  constraint registration_completions_base_trial_months check (
    base_trial_months between 0 and 24
  ),
  constraint registration_completions_referral_bonus_months check (
    referral_bonus_months between 0 and 12
  )
);

create table public.registration_completion_steps (
  user_id uuid not null references public.registration_completions (user_id) on delete cascade,
  step text not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  failure_code text,
  provider_reference text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, step),
  constraint registration_completion_steps_step check (
    step in (
      'password',
      'profile',
      'stripe',
      'referral_reward',
      'welcome_email',
      'referral_email'
    )
  ),
  constraint registration_completion_steps_status check (
    status in ('pending', 'processing', 'succeeded', 'failed', 'skipped')
  ),
  constraint registration_completion_steps_attempt_count check (
    attempt_count >= 0
  ),
  constraint registration_completion_steps_failure_code check (
    failure_code is null
    or failure_code ~ '^[A-Z][A-Z0-9_]{0,63}$'
  ),
  constraint registration_completion_steps_provider_reference_length check (
    provider_reference is null
    or char_length(provider_reference) between 1 and 255
  )
);

alter table public.registration_completions enable row level security;
alter table public.registration_completions force row level security;
alter table public.registration_completion_steps enable row level security;
alter table public.registration_completion_steps force row level security;

revoke all on table public.registration_completions from public, anon, authenticated;
revoke all on table public.registration_completion_steps from public, anon, authenticated;
grant select, insert, update on table public.registration_completions to service_role;
grant select, insert, update on table public.registration_completion_steps to service_role;

create function public.guard_registration_completion_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.registered_domain is distinct from new.registered_domain
    or old.referrer_user_id is distinct from new.referrer_user_id
    or old.offer_code is distinct from new.offer_code
    or old.base_trial_months is distinct from new.base_trial_months
    or old.referral_bonus_months is distinct from new.referral_bonus_months
    or old.created_at is distinct from new.created_at
  then
    raise exception using
      errcode = '22000',
      message = 'registration decisions are immutable';
  end if;

  if old.stripe_customer_id is not null
    and old.stripe_customer_id is distinct from new.stripe_customer_id
  then
    raise exception using
      errcode = '22000',
      message = 'Stripe customer identity is immutable once recorded';
  end if;

  if old.stripe_subscription_id is not null
    and old.stripe_subscription_id is distinct from new.stripe_subscription_id
  then
    raise exception using
      errcode = '22000',
      message = 'Stripe subscription identity is immutable once recorded';
  end if;

  if old.completed_at is not null
    and old.completed_at is distinct from new.completed_at
  then
    raise exception using
      errcode = '22000',
      message = 'registration completion is terminal';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function public.guard_registration_completion_step_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id
    or old.step is distinct from new.step
    or old.created_at is distinct from new.created_at
  then
    raise exception using
      errcode = '22000',
      message = 'registration step identity is immutable';
  end if;

  if old.status in ('succeeded', 'skipped')
    and old.status is distinct from new.status
  then
    raise exception using
      errcode = '22000',
      message = 'completed registration steps cannot regress';
  end if;

  if old.provider_reference is not null
    and old.provider_reference is distinct from new.provider_reference
  then
    raise exception using
      errcode = '22000',
      message = 'provider identity is immutable once recorded';
  end if;

  if old.completed_at is not null
    and old.completed_at is distinct from new.completed_at
  then
    raise exception using
      errcode = '22000',
      message = 'step completion timestamp is immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_registration_completion_update
before update on public.registration_completions
for each row execute function public.guard_registration_completion_update();

create trigger guard_registration_completion_step_update
before update on public.registration_completion_steps
for each row execute function public.guard_registration_completion_step_update();

create function public.initialize_registration_completion(
  p_user_id uuid,
  p_registered_domain text,
  p_referrer_user_id uuid default null,
  p_offer_code text default null,
  p_base_trial_months smallint default 1,
  p_referral_bonus_months smallint default 0
)
returns public.registration_completions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  completion public.registration_completions;
begin
  insert into public.registration_completions (
    user_id,
    registered_domain,
    referrer_user_id,
    offer_code,
    base_trial_months,
    referral_bonus_months
  )
  values (
    p_user_id,
    btrim(p_registered_domain),
    p_referrer_user_id,
    nullif(btrim(p_offer_code), ''),
    p_base_trial_months,
    p_referral_bonus_months
  )
  on conflict (user_id) do nothing;

  insert into public.registration_completion_steps (user_id, step)
  select p_user_id, step
  from unnest(array[
    'password',
    'profile',
    'stripe',
    'referral_reward',
    'welcome_email',
    'referral_email'
  ]) as step
  on conflict (user_id, step) do nothing;

  select *
  into strict completion
  from public.registration_completions
  where user_id = p_user_id;

  return completion;
end;
$$;

create function public.claim_registration_completion_step(
  p_user_id uuid,
  p_step text
)
returns public.registration_completion_steps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed public.registration_completion_steps;
begin
  update public.registration_completion_steps
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    started_at = now(),
    failure_code = null,
    completed_at = null
  where user_id = p_user_id
    and step = p_step
    and (
      status in ('pending', 'failed')
      or (
        status = 'processing'
        and started_at <= now() - interval '5 minutes'
      )
    )
  returning * into claimed;

  return claimed;
end;
$$;

create function public.finish_registration_completion_step(
  p_user_id uuid,
  p_step text,
  p_status text,
  p_failure_code text default null,
  p_provider_reference text default null
)
returns public.registration_completion_steps
language plpgsql
security invoker
set search_path = ''
as $$
declare
  finished public.registration_completion_steps;
begin
  if p_status not in ('succeeded', 'failed', 'skipped') then
    raise exception using
      errcode = '22023',
      message = 'invalid terminal registration step status';
  end if;

  if p_status = 'failed' and p_failure_code is null then
    raise exception using
      errcode = '22023',
      message = 'failed registration steps require a controlled failure code';
  end if;

  update public.registration_completion_steps
  set
    status = p_status,
    failure_code = case when p_status = 'failed' then p_failure_code else null end,
    provider_reference = coalesce(provider_reference, p_provider_reference),
    completed_at = case when p_status in ('succeeded', 'skipped') then now() else null end
  where user_id = p_user_id
    and step = p_step
    and status = 'processing'
  returning * into finished;

  return finished;
end;
$$;

create function public.mark_registration_completion_complete(p_user_id uuid)
returns public.registration_completions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  completion public.registration_completions;
begin
  if exists (
    select 1
    from public.registration_completion_steps
    where user_id = p_user_id
      and step in ('password', 'profile')
      and status <> 'succeeded'
  ) or exists (
    select 1
    from public.registration_completion_steps
    where user_id = p_user_id
      and step in ('stripe', 'referral_reward')
      and status not in ('succeeded', 'skipped')
  ) then
    raise exception using
      errcode = '55000',
      message = 'required registration steps are incomplete';
  end if;

  update public.registration_completions
  set completed_at = coalesce(completed_at, now())
  where user_id = p_user_id
  returning * into completion;

  return completion;
end;
$$;

revoke execute on function public.guard_registration_completion_update() from public, anon, authenticated;
revoke execute on function public.guard_registration_completion_step_update() from public, anon, authenticated;
revoke execute on function public.initialize_registration_completion(uuid, text, uuid, text, smallint, smallint) from public, anon, authenticated;
revoke execute on function public.claim_registration_completion_step(uuid, text) from public, anon, authenticated;
revoke execute on function public.finish_registration_completion_step(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.mark_registration_completion_complete(uuid) from public, anon, authenticated;

grant execute on function public.initialize_registration_completion(uuid, text, uuid, text, smallint, smallint) to service_role;
grant execute on function public.claim_registration_completion_step(uuid, text) to service_role;
grant execute on function public.finish_registration_completion_step(uuid, text, text, text, text) to service_role;
grant execute on function public.mark_registration_completion_complete(uuid) to service_role;

comment on table public.registration_completions is
  'Server-only registration decisions and terminal provider identities keyed by immutable auth user ID.';
comment on table public.registration_completion_steps is
  'Retryable required and best-effort registration work; terminal success and skip states cannot regress.';
comment on function public.initialize_registration_completion(uuid, text, uuid, text, smallint, smallint) is
  'Idempotently locks server-derived registration decisions and seeds per-step state. Existing decisions win on retry.';
comment on function public.claim_registration_completion_step(uuid, text) is
  'Atomically claims pending, failed, or stale registration work for a service-role coordinator.';
comment on function public.finish_registration_completion_step(uuid, text, text, text, text) is
  'Records a controlled terminal result for a claimed registration step.';
comment on function public.mark_registration_completion_complete(uuid) is
  'Marks required account creation complete without waiting on notification-only steps.';
