create table public.lifecycle_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  lifecycle_emails_enabled boolean not null default true,
  weekly_summary_enabled boolean not null default true,
  milestone_emails_enabled boolean not null default true,
  support_paused_until timestamptz,
  permanent_delivery_failure_at timestamptz,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create table public.lifecycle_message_claims (
  claim_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  campaign text not null check (campaign in (
    'incomplete_profile', 'first_value_milestone', 'weekly_performance',
    'no_contact_action', 'zero_traffic'
  )),
  claim_key text not null check (
    char_length(claim_key) between 1 and 120
    and claim_key ~ '^[a-z0-9:_-]+$'
  ),
  status text not null default 'claimed' check (status in (
    'claimed', 'sent', 'delivered', 'failed', 'suppressed', 'cancelled'
  )),
  reason_code text check (
    reason_code is null or (
      char_length(reason_code) between 1 and 80
      and reason_code ~ '^[a-z0-9:_-]+$'
    )
  ),
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, campaign, claim_key)
);

create table public.lifecycle_audit_events (
  audit_id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  claim_id uuid references public.lifecycle_message_claims(claim_id) on delete cascade,
  campaign text not null check (campaign in (
    'incomplete_profile', 'first_value_milestone', 'weekly_performance',
    'no_contact_action', 'zero_traffic'
  )),
  outcome text not null check (outcome in (
    'eligible', 'claimed', 'sent', 'delivered', 'failed', 'suppressed',
    'cancelled', 'cta_clicked', 'resulting_step_completed', 'activated'
  )),
  reason_code text check (
    reason_code is null or (
      char_length(reason_code) between 1 and 80
      and reason_code ~ '^[a-z0-9:_-]+$'
    )
  ),
  occurred_at timestamptz not null default now()
);

create index lifecycle_claims_user_recent_idx
  on public.lifecycle_message_claims (user_id, claimed_at desc);
create index lifecycle_audit_user_recent_idx
  on public.lifecycle_audit_events (user_id, occurred_at desc);

alter table public.lifecycle_preferences enable row level security;
alter table public.lifecycle_message_claims enable row level security;
alter table public.lifecycle_audit_events enable row level security;
revoke all on public.lifecycle_preferences from anon, authenticated;
revoke all on public.lifecycle_message_claims from anon, authenticated;
revoke all on public.lifecycle_audit_events from anon, authenticated;

create or replace function public.get_lifecycle_preferences(
  p_target_user_id uuid
)
returns table (
  lifecycle_emails_enabled boolean,
  weekly_summary_enabled boolean,
  milestone_emails_enabled boolean,
  promotional_unsubscribed_at timestamptz,
  support_paused_until timestamptz,
  permanent_delivery_failure_at timestamptz,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or (
    (select auth.uid()) <> p_target_user_id
    and not (select public.is_dashboard_admin())
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    coalesce(p.lifecycle_emails_enabled, true),
    coalesce(p.weekly_summary_enabled, true),
    coalesce(p.milestone_emails_enabled, true),
    unsubscribe.unsubscribed_at,
    p.support_paused_until,
    p.permanent_delivery_failure_at,
    coalesce(p.revision, 0::bigint),
    p.updated_at
  from public.users u
  left join public.lifecycle_preferences p on p.user_id = u.id
  left join public.marketing_unsubscribes unsubscribe
    on lower(unsubscribe.email::text) = lower(u.email)
  where u.id = p_target_user_id;
end;
$$;

create or replace function public.save_lifecycle_preferences(
  p_target_user_id uuid,
  p_expected_revision bigint,
  p_lifecycle_emails_enabled boolean,
  p_weekly_summary_enabled boolean,
  p_milestone_emails_enabled boolean
)
returns table (
  lifecycle_emails_enabled boolean,
  weekly_summary_enabled boolean,
  milestone_emails_enabled boolean,
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_revision bigint;
begin
  if (select auth.uid()) is null or (
    (select auth.uid()) <> p_target_user_id
    and not (select public.is_dashboard_admin())
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid expected revision' using errcode = '22023';
  end if;

  perform 1 from public.users where id = p_target_user_id for update;
  if not found then
    raise exception 'Unknown user' using errcode = '22023';
  end if;
  select coalesce(p.revision, 0) into v_current_revision
  from public.users u
  left join public.lifecycle_preferences p on p.user_id = u.id
  where u.id = p_target_user_id;
  if v_current_revision <> p_expected_revision then
    raise exception 'Lifecycle preferences changed' using errcode = '40001';
  end if;

  insert into public.lifecycle_preferences as preferences (
    user_id,
    lifecycle_emails_enabled,
    weekly_summary_enabled,
    milestone_emails_enabled,
    revision
  ) values (
    p_target_user_id,
    p_lifecycle_emails_enabled,
    p_weekly_summary_enabled,
    p_milestone_emails_enabled,
    1
  )
  on conflict (user_id) do update set
    lifecycle_emails_enabled = excluded.lifecycle_emails_enabled,
    weekly_summary_enabled = excluded.weekly_summary_enabled,
    milestone_emails_enabled = excluded.milestone_emails_enabled,
    revision = preferences.revision + 1,
    updated_at = now();

  return query
  select p.lifecycle_emails_enabled, p.weekly_summary_enabled,
    p.milestone_emails_enabled, p.revision, p.updated_at
  from public.lifecycle_preferences p where p.user_id = p_target_user_id;
end;
$$;

create or replace function public.claim_lifecycle_message(
  p_target_user_id uuid,
  p_campaign text,
  p_claim_key text,
  p_reason_code text
)
returns table (
  claim_id uuid,
  status text,
  claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim_id uuid;
begin
  if not (select public.is_dashboard_admin()) then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if p_campaign not in (
    'incomplete_profile', 'first_value_milestone', 'weekly_performance',
    'no_contact_action', 'zero_traffic'
  ) or p_claim_key is null or char_length(p_claim_key) not between 1 and 120
    or p_claim_key !~ '^[a-z0-9:_-]+$'
    or (p_reason_code is not null and (
      char_length(p_reason_code) not between 1 and 80
      or p_reason_code !~ '^[a-z0-9:_-]+$'
    ))
  then
    raise exception 'Invalid lifecycle claim' using errcode = '22023';
  end if;

  insert into public.lifecycle_message_claims (
    user_id, campaign, claim_key, reason_code
  ) values (p_target_user_id, p_campaign, p_claim_key, p_reason_code)
  on conflict (user_id, campaign, claim_key) do nothing
  returning lifecycle_message_claims.claim_id into v_claim_id;

  if v_claim_id is null then
    return query
    select existing.claim_id, existing.status, false
    from public.lifecycle_message_claims existing
    where existing.user_id = p_target_user_id
      and existing.campaign = p_campaign
      and existing.claim_key = p_claim_key;
  else
    insert into public.lifecycle_audit_events (
      user_id, claim_id, campaign, outcome, reason_code
    ) values (
      p_target_user_id, v_claim_id, p_campaign, 'claimed', p_reason_code
    );
    return query select v_claim_id, 'claimed'::text, true;
  end if;
end;
$$;

create or replace function public.get_lifecycle_audit(
  p_target_user_id uuid,
  p_limit integer default 50
)
returns table (
  audit_id bigint,
  campaign text,
  outcome text,
  reason_code text,
  occurred_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_dashboard_admin()) then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Invalid audit limit' using errcode = '22023';
  end if;
  return query
  select audit.audit_id, audit.campaign, audit.outcome,
    audit.reason_code, audit.occurred_at
  from public.lifecycle_audit_events audit
  where audit.user_id = p_target_user_id
  order by audit.occurred_at desc, audit.audit_id desc
  limit p_limit;
end;
$$;

revoke all on function public.get_lifecycle_preferences(uuid) from public, anon;
revoke all on function public.save_lifecycle_preferences(uuid,bigint,boolean,boolean,boolean) from public, anon;
revoke all on function public.claim_lifecycle_message(uuid,text,text,text) from public, anon;
revoke all on function public.get_lifecycle_audit(uuid,integer) from public, anon;
grant execute on function public.get_lifecycle_preferences(uuid) to authenticated;
grant execute on function public.save_lifecycle_preferences(uuid,bigint,boolean,boolean,boolean) to authenticated;
grant execute on function public.claim_lifecycle_message(uuid,text,text,text) to authenticated;
grant execute on function public.get_lifecycle_audit(uuid,integer) to authenticated;
