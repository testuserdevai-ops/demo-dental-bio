create table public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  profile_username text not null,
  category text not null,
  severity text not null,
  status text not null default 'new',
  priority text not null,
  priority_rank smallint generated always as (
    case priority
      when 'critical' then 1
      when 'high' then 2
      when 'medium' then 3
      else 4
    end
  ) stored,
  details text,
  reporter_email text,
  reporter_email_expires_at timestamp with time zone,
  public_url text not null,
  profile_snapshot jsonb not null,
  submission_fingerprint text not null,
  assigned_to uuid references public.users(id) on delete set null,
  outcome text,
  outcome_reason text,
  sla_due_at timestamp with time zone not null,
  resolved_at timestamp with time zone,
  version integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profile_reports_category_check check (
    category in (
      'fraud_or_impersonation',
      'unsafe_or_harmful',
      'misleading_information',
      'spam_or_scam',
      'privacy_or_personal_data',
      'other'
    )
  ),
  constraint profile_reports_severity_check check (
    severity in ('critical', 'high', 'medium', 'low')
  ),
  constraint profile_reports_status_check check (
    status in ('new', 'in_review', 'action_required', 'resolved', 'dismissed')
  ),
  constraint profile_reports_priority_check check (
    priority in ('critical', 'high', 'medium', 'low')
  ),
  constraint profile_reports_outcome_check check (
    outcome is null or outcome in (
      'no_action',
      'warning_requested',
      'content_review_requested',
      'suspension_review_requested'
    )
  ),
  constraint profile_reports_profile_username_length check (
    char_length(profile_username) between 3 and 50
  ),
  constraint profile_reports_details_length check (
    details is null or char_length(details) between 10 and 2000
  ),
  constraint profile_reports_reporter_email_length check (
    reporter_email is null or char_length(reporter_email) <= 254
  ),
  constraint profile_reports_public_url_length check (
    char_length(public_url) between 1 and 500
  ),
  constraint profile_reports_fingerprint_length check (
    char_length(submission_fingerprint) = 64
  ),
  constraint profile_reports_outcome_reason_length check (
    outcome_reason is null or char_length(outcome_reason) between 10 and 1000
  ),
  constraint profile_reports_version_check check (version > 0),
  constraint profile_reports_resolution_check check (
    (
      status in ('resolved', 'dismissed')
      and resolved_at is not null
      and outcome is not null
      and outcome_reason is not null
    )
    or (status not in ('resolved', 'dismissed') and resolved_at is null)
  ),
  constraint profile_reports_outcome_reason_check check (
    (outcome is null and outcome_reason is null)
    or (outcome is not null and outcome_reason is not null)
  )
);

create index profile_reports_queue_idx
on public.profile_reports (status, priority_rank, created_at desc, id);

create index profile_reports_profile_idx
on public.profile_reports (profile_id, created_at desc);

create index profile_reports_assignee_idx
on public.profile_reports (assigned_to, status, created_at desc)
where assigned_to is not null;

create index profile_reports_duplicate_idx
on public.profile_reports (submission_fingerprint, created_at desc);

create table public.profile_report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.profile_reports(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  note text not null,
  created_at timestamp with time zone not null default now(),
  constraint profile_report_notes_note_length check (
    char_length(note) between 2 and 2000
  )
);

create index profile_report_notes_report_idx
on public.profile_report_notes (report_id, created_at, id);

create table public.profile_report_audit_log (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.profile_reports(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  previous_state jsonb,
  next_state jsonb,
  created_at timestamp with time zone not null default now(),
  constraint profile_report_audit_action_check check (
    action in (
      'submitted',
      'moderation_updated',
      'note_added',
      'reporter_contact_expired'
    )
  )
);

create index profile_report_audit_report_idx
on public.profile_report_audit_log (report_id, created_at, id);

create table public.profile_report_submission_limits (
  source_hash text primary key,
  window_started_at timestamp with time zone not null,
  submission_count integer not null,
  updated_at timestamp with time zone not null default now(),
  constraint profile_report_submission_limits_hash_length check (
    char_length(source_hash) = 64
  ),
  constraint profile_report_submission_limits_count_check check (
    submission_count between 1 and 20
  )
);

alter table public.profile_reports enable row level security;
alter table public.profile_report_notes enable row level security;
alter table public.profile_report_audit_log enable row level security;
alter table public.profile_report_submission_limits enable row level security;

revoke all privileges on table public.profile_reports from public, anon, authenticated;
revoke all privileges on table public.profile_report_notes from public, anon, authenticated;
revoke all privileges on table public.profile_report_audit_log from public, anon, authenticated;
revoke all privileges on table public.profile_report_submission_limits from public, anon, authenticated;

grant select, insert, update on table public.profile_reports to service_role;
grant select, insert on table public.profile_report_notes to service_role;
grant select, insert on table public.profile_report_audit_log to service_role;
grant usage, select on sequence public.profile_report_audit_log_id_seq to service_role;
grant select, insert, update, delete on table public.profile_report_submission_limits to service_role;

create or replace function private.profile_report_severity(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'unsafe_or_harmful' then 'critical'
    when 'fraud_or_impersonation' then 'high'
    when 'privacy_or_personal_data' then 'high'
    when 'misleading_information' then 'medium'
    when 'spam_or_scam' then 'medium'
    else 'low'
  end;
$$;

create or replace function private.profile_report_sla_due_at(
  p_severity text,
  p_created_at timestamp with time zone
)
returns timestamp with time zone
language sql
immutable
set search_path = ''
as $$
  select p_created_at + case p_severity
    when 'critical' then interval '4 hours'
    when 'high' then interval '24 hours'
    when 'medium' then interval '72 hours'
    else interval '168 hours'
  end;
$$;

create or replace function private.is_report_moderator(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = p_actor_id
      and role in ('admin', 'security_admin')
      and not coalesce(is_blocked, false)
  );
$$;

create or replace function public.claim_profile_report_submission(
  p_source_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamp with time zone := now();
  v_count integer;
begin
  if p_limit < 1 or p_limit > 20 or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'INVALID_REPORT_RATE_POLICY';
  end if;

  insert into public.profile_report_submission_limits (
    source_hash,
    window_started_at,
    submission_count,
    updated_at
  ) values (p_source_hash, v_now, 1, v_now)
  on conflict (source_hash) do update
  set
    window_started_at = case
      when public.profile_report_submission_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.profile_report_submission_limits.window_started_at
    end,
    submission_count = case
      when public.profile_report_submission_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.profile_report_submission_limits.submission_count + 1
    end,
    updated_at = v_now
  returning submission_count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function public.submit_profile_report(
  p_profile_id uuid,
  p_category text,
  p_details text,
  p_reporter_email text,
  p_public_url text,
  p_submission_fingerprint text
)
returns table (report_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.public_profiles%rowtype;
  v_existing_id uuid;
  v_now timestamp with time zone := now();
  v_severity text;
  v_report_id uuid;
begin
  if p_category not in (
    'fraud_or_impersonation',
    'unsafe_or_harmful',
    'misleading_information',
    'spam_or_scam',
    'privacy_or_personal_data',
    'other'
  ) then
    raise exception 'INVALID_REPORT_CATEGORY';
  end if;

  select * into v_profile
  from public.public_profiles
  where profile_id = p_profile_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select id into v_existing_id
  from public.profile_reports
  where submission_fingerprint = p_submission_fingerprint
    and created_at >= v_now - interval '24 hours'
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, false;
    return;
  end if;

  v_severity := private.profile_report_severity(p_category);

  insert into public.profile_reports (
    profile_id,
    profile_username,
    category,
    severity,
    priority,
    details,
    reporter_email,
    reporter_email_expires_at,
    public_url,
    profile_snapshot,
    submission_fingerprint,
    sla_due_at
  ) values (
    p_profile_id,
    v_profile.username,
    p_category,
    v_severity,
    v_severity,
    nullif(trim(p_details), ''),
    nullif(lower(trim(p_reporter_email)), ''),
    case when nullif(trim(p_reporter_email), '') is null
      then null
      else v_now + interval '365 days'
    end,
    p_public_url,
    jsonb_build_object(
      'profileId', v_profile.profile_id,
      'username', v_profile.username,
      'title', v_profile.title,
      'firstName', v_profile.first_name,
      'lastName', v_profile.last_name,
      'position', v_profile.position,
      'registeredDomain', v_profile.registered_domain,
      'verified', v_profile."isVerified"
    ),
    p_submission_fingerprint,
    private.profile_report_sla_due_at(v_severity, v_now)
  ) returning id into v_report_id;

  insert into public.profile_report_audit_log (
    report_id,
    actor_id,
    action,
    previous_state,
    next_state
  ) values (
    v_report_id,
    null,
    'submitted',
    null,
    jsonb_build_object(
      'status', 'new',
      'priority', v_severity,
      'severity', v_severity
    )
  );

  return query select v_report_id, true;
end;
$$;

create or replace function public.moderate_profile_report(
  p_report_id uuid,
  p_actor_id uuid,
  p_expected_version integer,
  p_status text,
  p_priority text,
  p_assigned_to uuid default null,
  p_outcome text default null,
  p_outcome_reason text default null
)
returns setof public.profile_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous public.profile_reports%rowtype;
  v_next public.profile_reports%rowtype;
begin
  if not private.is_report_moderator(p_actor_id) then
    raise exception 'REPORT_MODERATOR_FORBIDDEN';
  end if;

  if p_assigned_to is not null and not private.is_report_moderator(p_assigned_to) then
    raise exception 'INVALID_REPORT_ASSIGNEE';
  end if;

  select * into v_previous
  from public.profile_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'REPORT_NOT_FOUND';
  end if;

  if v_previous.version <> p_expected_version then
    raise exception 'REPORT_VERSION_CONFLICT';
  end if;

  update public.profile_reports
  set
    status = p_status,
    priority = p_priority,
    assigned_to = p_assigned_to,
    outcome = p_outcome,
    outcome_reason = nullif(trim(p_outcome_reason), ''),
    resolved_at = case
      when p_status in ('resolved', 'dismissed') then now()
      else null
    end,
    updated_at = now(),
    version = version + 1
  where id = p_report_id
  returning * into v_next;

  insert into public.profile_report_audit_log (
    report_id,
    actor_id,
    action,
    previous_state,
    next_state
  ) values (
    p_report_id,
    p_actor_id,
    'moderation_updated',
    jsonb_build_object(
      'status', v_previous.status,
      'priority', v_previous.priority,
      'assignedTo', v_previous.assigned_to,
      'outcome', v_previous.outcome,
      'outcomeReason', v_previous.outcome_reason,
      'version', v_previous.version
    ),
    jsonb_build_object(
      'status', v_next.status,
      'priority', v_next.priority,
      'assignedTo', v_next.assigned_to,
      'outcome', v_next.outcome,
      'outcomeReason', v_next.outcome_reason,
      'version', v_next.version
    )
  );

  return next v_next;
end;
$$;

create or replace function public.add_profile_report_note(
  p_report_id uuid,
  p_actor_id uuid,
  p_note text
)
returns public.profile_report_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note public.profile_report_notes%rowtype;
begin
  if not private.is_report_moderator(p_actor_id) then
    raise exception 'REPORT_MODERATOR_FORBIDDEN';
  end if;

  if not exists (select 1 from public.profile_reports where id = p_report_id) then
    raise exception 'REPORT_NOT_FOUND';
  end if;

  insert into public.profile_report_notes (report_id, author_id, note)
  values (p_report_id, p_actor_id, trim(p_note))
  returning * into v_note;

  insert into public.profile_report_audit_log (
    report_id,
    actor_id,
    action,
    previous_state,
    next_state
  ) values (
    p_report_id,
    p_actor_id,
    'note_added',
    null,
    jsonb_build_object('noteId', v_note.id)
  );

  return v_note;
end;
$$;

create or replace function public.expire_profile_report_contacts(
  p_now timestamp with time zone default now()
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_count bigint;
begin
  with expired as (
    update public.profile_reports
    set
      reporter_email = null,
      reporter_email_expires_at = null,
      updated_at = p_now
    where reporter_email is not null
      and reporter_email_expires_at <= p_now
    returning id
  ), audited as (
    insert into public.profile_report_audit_log (
      report_id,
      actor_id,
      action,
      previous_state,
      next_state
    )
    select
      id,
      null,
      'reporter_contact_expired',
      jsonb_build_object('reporterContactRetained', true),
      jsonb_build_object('reporterContactRetained', false)
    from expired
    returning 1
  )
  select count(*) into v_expired_count from audited;

  return v_expired_count;
end;
$$;

revoke execute on function private.profile_report_severity(text) from public, anon, authenticated;
revoke execute on function private.profile_report_sla_due_at(text, timestamp with time zone) from public, anon, authenticated;
revoke execute on function private.is_report_moderator(uuid) from public, anon, authenticated;
revoke execute on function public.claim_profile_report_submission(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.submit_profile_report(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.moderate_profile_report(uuid, uuid, integer, text, text, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.add_profile_report_note(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.expire_profile_report_contacts(timestamp with time zone) from public, anon, authenticated;

grant execute on function public.claim_profile_report_submission(text, integer, integer) to service_role;
grant execute on function public.submit_profile_report(uuid, text, text, text, text, text) to service_role;
grant execute on function public.moderate_profile_report(uuid, uuid, integer, text, text, uuid, text, text) to service_role;
grant execute on function public.add_profile_report_note(uuid, uuid, text) to service_role;
grant execute on function public.expire_profile_report_contacts(timestamp with time zone) to service_role;

-- Reporter contact is deliberately short-lived. The report, supplied evidence,
-- decision record, and audit history remain available after this daily scrub.
select cron.schedule(
  'expire-profile-report-contacts',
  '15 3 * * *',
  'select public.expire_profile_report_contacts();'
);
