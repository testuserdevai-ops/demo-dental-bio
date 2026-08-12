create or replace function public.get_lifecycle_delivery_candidates(
  p_now timestamptz default now(),
  p_limit integer default 100
)
returns table (
  user_id uuid,
  email text,
  first_name text,
  username text,
  campaign text,
  claim_key text,
  reason_code text,
  qualified_views bigint,
  contact_actions bigint,
  previous_qualified_views bigint,
  previous_contact_actions bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
     and not coalesce((select public.is_dashboard_admin()), false) then
    raise exception 'Lifecycle operator authorization required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 500 then
    raise exception 'Invalid lifecycle candidate limit' using errcode = '22023';
  end if;

  return query
  with owner_state as (
    select
      u.id,
      u.email,
      u.first_name,
      u.username,
      u.created_at,
      u.profile_presentation_published_at,
      d.dentistry_id,
      coalesce(p.lifecycle_emails_enabled, true) as lifecycle_enabled,
      coalesce(p.weekly_summary_enabled, true) as weekly_enabled,
      coalesce(p.milestone_emails_enabled, true) as milestone_enabled,
      p.permanent_delivery_failure_at,
      p.support_paused_until,
      unsubscribe.unsubscribed_at,
      exists (
        select 1 from storage.objects object
        where object.bucket_id = 'profile-pics'
          and (storage.foldername(object.name))[1] = d.dentistry_id::text
      ) as has_photo,
      (nullif(trim(coalesce(u.position, '')), '') is not null
        and nullif(trim(coalesce(d.about_text, '')), '') is not null) as has_details,
      exists (
        select 1 from public.dentistry_treatments dt
        where dt.dentistry_id = d.dentistry_id
      ) as has_treatment,
      (coalesce(d.booking_link_enabled, false)
        and nullif(trim(coalesce(d.booking_link, '')), '') is not null)
        or nullif(trim(coalesce(d.phone, '')), '') is not null
        or nullif(trim(coalesce(d.contact_email, '')), '') is not null
        or exists (
          select 1
          from public.links link
          join public.dentistry_links dl on dl.link_id = link.link_id
          join public.link_groups lg on lg.link_group_id = dl.link_group_id
          where lg.dentistry_id = d.dentistry_id and link.is_active
        ) as has_contact
    from public.users u
    join public.dentistries d on d.user_id = u.id
    left join public.lifecycle_preferences p on p.user_id = u.id
    left join public.marketing_unsubscribes unsubscribe
      on lower(unsubscribe.email) = lower(u.email)
    where not u.is_blocked
  ), activity as (
    select
      state.*,
      coalesce(sum(aggregate.total_events) filter (
        where aggregate.event_date between (p_now at time zone 'UTC')::date - 6
          and (p_now at time zone 'UTC')::date
          and aggregate.action_type = 'profile_view'
      ), 0)::bigint as views_7d,
      coalesce(sum(aggregate.total_events) filter (
        where aggregate.event_date between (p_now at time zone 'UTC')::date - 13
          and (p_now at time zone 'UTC')::date - 7
          and aggregate.action_type = 'profile_view'
      ), 0)::bigint as previous_views_7d,
      coalesce(sum(aggregate.total_events) filter (
        where aggregate.event_date between (p_now at time zone 'UTC')::date - 6
          and (p_now at time zone 'UTC')::date
          and aggregate.action_type in (
            'booking_click', 'phone_click', 'email_click', 'directions_click',
            'enquiry_submit', 'treatment_cta_click', 'service_cta_click'
          )
      ), 0)::bigint as contacts_7d,
      coalesce(sum(aggregate.total_events) filter (
        where aggregate.event_date between (p_now at time zone 'UTC')::date - 13
          and (p_now at time zone 'UTC')::date - 7
          and aggregate.action_type in (
            'booking_click', 'phone_click', 'email_click', 'directions_click',
            'enquiry_submit', 'treatment_cta_click', 'service_cta_click'
          )
      ), 0)::bigint as previous_contacts_7d,
      coalesce(sum(aggregate.total_events) filter (
        where aggregate.event_date >= (p_now at time zone 'UTC')::date - 29
          and aggregate.action_type = 'profile_view'
      ), 0)::bigint as views_30d
    from owner_state state
    left join public.public_analytics_daily_aggregates aggregate
      on aggregate.profile_id = state.id
    group by state.id, state.email, state.first_name, state.username,
      state.created_at, state.profile_presentation_published_at,
      state.dentistry_id, state.lifecycle_enabled, state.weekly_enabled,
      state.milestone_enabled, state.permanent_delivery_failure_at,
      state.support_paused_until, state.unsubscribed_at, state.has_photo,
      state.has_details, state.has_treatment, state.has_contact
  ), eligible as (
    select activity.*,
      case
        when activity.milestone_enabled and activity.views_30d >= 100
          then 'first_value_milestone'
        when activity.views_7d >= 10 and activity.contacts_7d = 0
          then 'no_contact_action'
        when activity.profile_presentation_published_at <= p_now - interval '3 days'
          and activity.views_30d = 0 then 'zero_traffic'
        when activity.weekly_enabled and activity.views_7d > 0
          and extract(isodow from p_now at time zone 'UTC') = 1
          then 'weekly_performance'
        when p_now >= activity.created_at + interval '24 hours'
          and not (activity.has_photo and activity.has_details
            and activity.has_treatment and activity.has_contact
            and activity.profile_presentation_published_at is not null)
          then 'incomplete_profile'
        else null
      end as selected_campaign
    from activity
    where activity.lifecycle_enabled
      and activity.unsubscribed_at is null
      and activity.permanent_delivery_failure_at is null
      and (activity.support_paused_until is null or activity.support_paused_until <= p_now)
  ), keyed as (
    select eligible.*,
      case eligible.selected_campaign
        when 'first_value_milestone' then 'views:100'
        when 'no_contact_action' then 'no-contact:' || to_char(p_now at time zone 'UTC', 'IYYY-IW')
        when 'zero_traffic' then 'zero-traffic:' || to_char(p_now at time zone 'UTC', 'IYYY-IW')
        when 'weekly_performance' then 'weekly:' || to_char(p_now at time zone 'UTC', 'IYYY-IW')
        when 'incomplete_profile' then 'incomplete:' || to_char(p_now at time zone 'UTC', 'IYYY-IW')
      end as selected_claim_key,
      case eligible.selected_campaign
        when 'first_value_milestone' then 'qualified_views_100'
        when 'no_contact_action' then 'views_without_contact_action'
        when 'zero_traffic' then 'published_without_qualified_view'
        when 'weekly_performance' then 'weekly_activity_available'
        when 'incomplete_profile' then
          case
            when not eligible.has_photo then 'add_profile_photo'
            when not eligible.has_details then 'complete_professional_details'
            when not eligible.has_treatment then 'add_first_treatment'
            when not eligible.has_contact then 'add_contact_action'
            else 'publish_profile'
          end
      end as selected_reason_code
    from eligible
    where eligible.selected_campaign is not null
  )
  select keyed.id, keyed.email::text, keyed.first_name::text,
    keyed.username::text, keyed.selected_campaign::text,
    keyed.selected_claim_key::text, keyed.selected_reason_code::text,
    keyed.views_7d, keyed.contacts_7d,
    keyed.previous_views_7d, keyed.previous_contacts_7d
  from keyed
  where not exists (
    select 1 from public.lifecycle_message_claims claim
    where claim.user_id = keyed.id
      and claim.campaign = keyed.selected_campaign
      and claim.claim_key = keyed.selected_claim_key
  )
  order by case keyed.selected_campaign
      when 'first_value_milestone' then 0
      when 'no_contact_action' then 1
      when 'zero_traffic' then 2
      when 'weekly_performance' then 3
      else 4
    end,
    keyed.created_at,
    keyed.id
  limit p_limit;
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
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
     and not coalesce((select public.is_dashboard_admin()), false) then
    raise exception 'Lifecycle operator authorization required' using errcode = '42501';
  end if;
  if p_campaign not in (
    'incomplete_profile', 'first_value_milestone', 'weekly_performance',
    'no_contact_action', 'zero_traffic'
  ) or p_claim_key is null or char_length(p_claim_key) not between 1 and 120
    or p_claim_key !~ '^[a-z0-9:_-]+$'
    or (p_reason_code is not null and (
      char_length(p_reason_code) not between 1 and 80
      or p_reason_code !~ '^[a-z0-9:_-]+$'
    )) then
    raise exception 'Invalid lifecycle claim' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.get_lifecycle_delivery_candidates(now(), 500) candidate
    where candidate.user_id = p_target_user_id
      and candidate.campaign = p_campaign
      and candidate.claim_key = p_claim_key
      and candidate.reason_code = p_reason_code
  ) then
    return query select null::uuid, 'ineligible'::text, false;
    return;
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

create or replace function public.complete_lifecycle_message(
  p_claim_id uuid,
  p_outcome text,
  p_reason_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.lifecycle_message_claims%rowtype;
begin
  if coalesce((select auth.jwt() ->> 'role'), '') <> 'service_role'
     and not coalesce((select public.is_dashboard_admin()), false) then
    raise exception 'Lifecycle operator authorization required' using errcode = '42501';
  end if;
  if p_outcome not in ('sent', 'cancelled', 'failed', 'suppressed')
     or (p_reason_code is not null and (
       char_length(p_reason_code) not between 1 and 80
       or p_reason_code !~ '^[a-z0-9:_-]+$'
     )) then
    raise exception 'Invalid lifecycle outcome' using errcode = '22023';
  end if;

  select * into v_claim from public.lifecycle_message_claims
  where claim_id = p_claim_id for update;
  if v_claim.claim_id is null then
    raise exception 'Lifecycle claim not found' using errcode = 'P0002';
  end if;
  if v_claim.status <> 'claimed' then
    raise exception 'Lifecycle claim already completed' using errcode = '40001';
  end if;

  update public.lifecycle_message_claims
  set status = p_outcome,
      sent_at = case when p_outcome = 'sent' then now() else sent_at end,
      updated_at = now()
  where claim_id = p_claim_id;

  insert into public.lifecycle_audit_events (
    user_id, claim_id, campaign, outcome, reason_code
  ) values (
    v_claim.user_id, v_claim.claim_id, v_claim.campaign,
    p_outcome, coalesce(p_reason_code, v_claim.reason_code)
  );
end;
$$;

revoke all on function public.get_lifecycle_delivery_candidates(timestamptz,integer)
  from public, anon, authenticated;
revoke all on function public.claim_lifecycle_message(uuid,text,text,text)
  from public, anon, authenticated;
revoke all on function public.complete_lifecycle_message(uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.get_lifecycle_delivery_candidates(timestamptz,integer)
  to authenticated, service_role;
grant execute on function public.claim_lifecycle_message(uuid,text,text,text)
  to authenticated, service_role;
grant execute on function public.complete_lifecycle_message(uuid,text,text)
  to authenticated, service_role;
