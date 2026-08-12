-- Product-funnel reporting is intentionally cohort-based. It only reports
-- stages for which DentalBio currently has an authoritative server timestamp.
-- Landing/signup-start, immutable onboarding-completed, paid-conversion,
-- retention/churn/LTV, device/geography and historical backfill remain
-- explicitly unavailable in the returned capability object.

create or replace function public.get_admin_platform_funnel(
  p_start_date date,
  p_end_date date,
  p_plan text default null,
  p_registered_domain text default null,
  p_cohort text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_start_date is null
     or p_end_date is null
     or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730
  then
    raise exception 'Invalid platform funnel date range' using errcode = '22023';
  end if;

  if (p_plan is not null and p_plan not in ('FREE', 'PRO', 'PREMIUM PRO'))
     or p_cohort not in ('all', 'organic', 'referred')
     or (p_registered_domain is not null and (
       char_length(p_registered_domain) > 253
       or p_registered_domain <> lower(p_registered_domain)
       or p_registered_domain !~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?[.])*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
     ))
  then
    raise exception 'Invalid platform funnel filter' using errcode = '22023';
  end if;

  if (select auth.uid()) is null or not exists (
    select 1
    from public.users administrator
    where administrator.id = (select auth.uid())
      and administrator.role = 'admin'
      and not coalesce(administrator.is_blocked, false)
  ) then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;

  with
  analytics_coverage as (
    select min(events.received_at) as started_at
    from public.public_analytics_events events
  ),
  cohort_users as (
    select
      owner.id,
      owner.created_at as registered_at,
      owner.subscription_status,
      owner.registered_domain,
      owner.profile_presentation_published_at as published_at,
      coalesce(auth_owner.email_confirmed_at, auth_owner.confirmed_at) as verified_at,
      registration.completed_at as registration_completed_at,
      registration.referrer_user_id,
      progress.template_id,
      progress.completed_step_ids,
      progress.updated_at as progress_updated_at,
      case progress.template_id
        when 'basic' then array[
          'profile-details', 'social-links', 'links', 'treatments',
          'videos', 'gallery', 'locations'
        ]::text[]
        when 'direct-booking' then array[
          'profile-details', 'social-links', 'treatments', 'locations', 'links'
        ]::text[]
        when 'location-provider-router' then array[
          'profile-details', 'social-links', 'locations', 'treatments', 'links'
        ]::text[]
        when 'services-catalogue' then array[
          'profile-details', 'social-links', 'treatments', 'links', 'locations'
        ]::text[]
        when 'cosmetic-transformation' then array[
          'profile-details', 'social-links', 'treatments', 'gallery', 'reviews',
          'locations'
        ]::text[]
        when 'trust-first-family-practice' then array[
          'profile-details', 'social-links', 'reviews', 'links', 'treatments',
          'locations'
        ]::text[]
        when 'specialist-assessment' then array[
          'profile-details', 'social-links', 'links', 'treatments', 'locations'
        ]::text[]
        when 'expert-educator' then array[
          'profile-details', 'social-links', 'links', 'videos', 'locations'
        ]::text[]
        when 'clinic-commerce' then array[
          'profile-details', 'social-links', 'treatments', 'products', 'locations'
        ]::text[]
        else '{}'::text[]
      end as required_steps
    from public.users owner
    left join auth.users auth_owner on auth_owner.id = owner.id
    left join public.registration_completions registration
      on registration.user_id = owner.id
    left join public.profile_onboarding_progress progress
      on progress.user_id = owner.id
    where owner.role = 'user'
      and owner.created_at >= p_start_date::timestamptz
      and owner.created_at < (p_end_date + 1)::timestamptz
      and (p_plan is null or owner.subscription_status = p_plan)
      and (p_registered_domain is null
        or owner.registered_domain = p_registered_domain)
      and (
        p_cohort = 'all'
        or (p_cohort = 'organic'
          and registration.user_id is not null
          and registration.referrer_user_id is null)
        or (p_cohort = 'referred' and registration.referrer_user_id is not null)
      )
  ),
  profile_events as (
    select
      cohort.id,
      min(events.occurred_at) filter (
        where events.action_type = 'profile_view'
          and cohort.published_at is not null
          and events.occurred_at >= cohort.published_at
      ) as first_view_at
    from cohort_users cohort
    left join public.public_analytics_events events on events.profile_id = cohort.id
    group by cohort.id
  ),
  profile_milestones as (
    select
      profile_events.id,
      profile_events.first_view_at,
      min(events.occurred_at) filter (
        where events.action_type = any (array[
          'link_click', 'blog_click', 'video_open', 'gallery_open',
          'product_click', 'external_review_click', 'treatment_cta_click',
          'service_cta_click', 'booking_click', 'directions_click',
          'email_click', 'phone_click', 'social_click', 'share_click',
          'enquiry_submit'
        ])
          and profile_events.first_view_at is not null
          and events.occurred_at >= profile_events.first_view_at
      ) as first_action_after_view_at
    from profile_events
    left join public.public_analytics_events events
      on events.profile_id = profile_events.id
    group by profile_events.id, profile_events.first_view_at
  ),
  journey as (
    select
      cohort.*,
      profile_milestones.first_view_at,
      profile_milestones.first_action_after_view_at,
      cardinality(cohort.required_steps) as required_step_count,
      cardinality(array(
        select step
        from unnest(coalesce(cohort.completed_step_ids, '{}'::text[])) step
        where step = any (cohort.required_steps)
      )) as completed_required_step_count,
      cohort.verified_at is not null as reached_verification,
      cohort.verified_at is not null
        and cardinality(cohort.required_steps) > 0
        and cohort.required_steps <@ coalesce(cohort.completed_step_ids, '{}'::text[])
        as reached_onboarding,
      cohort.verified_at is not null
        and cardinality(cohort.required_steps) > 0
        and cohort.required_steps <@ coalesce(cohort.completed_step_ids, '{}'::text[])
        and cohort.published_at is not null
        as reached_publication,
      cohort.verified_at is not null
        and cardinality(cohort.required_steps) > 0
        and cohort.required_steps <@ coalesce(cohort.completed_step_ids, '{}'::text[])
        and cohort.published_at is not null
        and profile_milestones.first_view_at is not null
        as reached_view,
      cohort.verified_at is not null
        and cardinality(cohort.required_steps) > 0
        and cohort.required_steps <@ coalesce(cohort.completed_step_ids, '{}'::text[])
        and cohort.published_at is not null
        and profile_milestones.first_view_at is not null
        and profile_milestones.first_action_after_view_at is not null
        as reached_action
    from cohort_users cohort
    join profile_milestones on profile_milestones.id = cohort.id
  ),
  dentistry_ids as (
    select dentistry.user_id, dentistry.dentistry_id,
      nullif(btrim(dentistry.about_title), '') is not null
        or nullif(btrim(dentistry.about_text), '') is not null as has_profile_details
    from public.dentistries dentistry
    join cohort_users cohort on cohort.id = dentistry.user_id
  ),
  adopted_modules as (
    select dentistry.user_id,
      dentistry.has_profile_details,
      exists (
        select 1 from public.socials social
        where social.dentistry_id = dentistry.dentistry_id
          and num_nonnulls(
            nullif(btrim(social.twitter_link), ''),
            nullif(btrim(social.instagram_link), ''),
            nullif(btrim(social.facebook_link), ''),
            nullif(btrim(social.tiktok_link), ''),
            nullif(btrim(social.other_link), '')
          ) > 0
      ) as has_socials,
      exists (
        select 1 from public.dentistry_treatments item
        where item.dentistry_id = dentistry.dentistry_id
      ) as has_treatments,
      exists (
        select 1 from public.dentistry_locations item
        where item.dentistry_id = dentistry.dentistry_id
      ) as has_locations,
      exists (
        select 1
        from public.link_groups link_group
        join public.dentistry_links membership
          on membership.link_group_id = link_group.link_group_id
        join public.links link on link.link_id = membership.link_id
        where link_group.dentistry_id = dentistry.dentistry_id
          and link.is_active
      ) as has_links,
      exists (
        select 1 from public.reviews review
        where review.user_id = dentistry.user_id and review.enabled
      ) as has_reviews,
      exists (
        select 1 from public.galleries gallery
        where gallery.user_id = dentistry.user_id and gallery.enabled
        union all
        select 1 from public.general_galleries gallery
        where gallery.user_id = dentistry.user_id and gallery.enabled
      ) as has_gallery,
      exists (
        select 1
        from public.groups video_group
        join public.videos video on video.group_id = video_group.id
        where video_group.user_id = dentistry.user_id
          and video_group.enabled and video.enabled
      ) as has_videos,
      exists (
        select 1 from public.products product
        where product.user_id = dentistry.user_id and product.enabled
      ) as has_products
    from dentistry_ids dentistry
  ),
  module_adoption_rows as (
    select modules.user_id, adoption.module_name, adoption.adopted
    from adopted_modules modules
    cross join lateral (values
      ('Profile details'::text, modules.has_profile_details),
      ('Social links'::text, modules.has_socials),
      ('Treatments and services'::text, modules.has_treatments),
      ('Locations'::text, modules.has_locations),
      ('Links'::text, modules.has_links),
      ('Reviews'::text, modules.has_reviews),
      ('Gallery'::text, modules.has_gallery),
      ('Videos'::text, modules.has_videos),
      ('Products'::text, modules.has_products)
    ) adoption(module_name, adopted)
  ),
  module_catalog(module_name) as (values
    ('Profile details'::text),
    ('Social links'::text),
    ('Treatments and services'::text),
    ('Locations'::text),
    ('Links'::text),
    ('Reviews'::text),
    ('Gallery'::text),
    ('Videos'::text),
    ('Products'::text)
  ),
  module_counts as (
    select catalog.module_name,
      count(rows.user_id) filter (where rows.adopted)::bigint as owners
    from module_catalog catalog
    left join module_adoption_rows rows using (module_name)
    group by catalog.module_name
  ),
  totals as (
    select
      count(*)::bigint as cohort_size,
      count(*) filter (where registration_completed_at is not null)::bigint
        as registration_completed,
      count(*) filter (where reached_verification)::bigint as verified,
      count(*) filter (where progress_updated_at is not null)::bigint
        as onboarding_started,
      count(*) filter (where reached_onboarding)::bigint as onboarding_completed,
      count(*) filter (where reached_publication)::bigint as published,
      count(*) filter (where reached_view)::bigint as viewed,
      count(*) filter (where reached_action)::bigint as actioned,
      percentile_cont(0.5) within group (
        order by extract(epoch from (verified_at - registered_at)) / 60
      ) filter (where reached_verification and verified_at >= registered_at)
        as verification_minutes,
      percentile_cont(0.5) within group (
        order by extract(epoch from (published_at - registered_at)) / 60
      ) filter (where reached_publication and published_at >= registered_at)
        as publish_minutes,
      percentile_cont(0.5) within group (
        order by extract(epoch from (first_view_at - published_at)) / 60
      ) filter (where reached_view and first_view_at >= published_at)
        as first_view_minutes,
      percentile_cont(0.5) within group (
        order by extract(epoch from (first_action_after_view_at - first_view_at)) / 60
      ) filter (
        where reached_action and first_action_after_view_at >= first_view_at
      ) as first_action_minutes,
      count(*) filter (
        where published_at is not null
          and (select started_at from analytics_coverage) is not null
          and published_at >= (select started_at from analytics_coverage)
          and first_view_at is null
      )::bigint as zero_traffic,
      count(*) filter (
        where published_at is not null
          and first_view_at is not null
          and first_action_after_view_at is null
      )::bigint as viewed_no_action,
      count(*) filter (
        where published_at is not null
          and (select started_at from analytics_coverage) is not null
          and published_at >= (select started_at from analytics_coverage)
      )::bigint as zero_traffic_eligible,
      count(*) filter (where required_step_count = 0
        or completed_required_step_count = 0)::bigint as progress_zero,
      count(*) filter (where required_step_count > 0
        and completed_required_step_count > 0
        and completed_required_step_count * 4 <= required_step_count)::bigint
        as progress_one_to_twenty_five,
      count(*) filter (where required_step_count > 0
        and completed_required_step_count * 4 > required_step_count
        and completed_required_step_count * 2 <= required_step_count)::bigint
        as progress_twenty_six_to_fifty,
      count(*) filter (where required_step_count > 0
        and completed_required_step_count * 2 > required_step_count
        and completed_required_step_count * 4 < required_step_count * 3)::bigint
        as progress_fifty_one_to_seventy_four,
      count(*) filter (where required_step_count > 0
        and completed_required_step_count * 4 >= required_step_count * 3
        and completed_required_step_count < required_step_count)::bigint
        as progress_seventy_five_to_ninety_nine,
      count(*) filter (where required_step_count > 0
        and completed_required_step_count >= required_step_count)::bigint
        as progress_complete
    from journey
  )
  select jsonb_build_object(
    'schemaVersion', 1,
    'cohortSize', totals.cohort_size,
    'stages', jsonb_build_array(
      jsonb_build_object(
        'id', 'registered', 'label', 'Registered', 'count', totals.cohort_size,
        'medianMinutesFromPrevious', null
      ),
      jsonb_build_object(
        'id', 'verified', 'label', 'Email verified', 'count', totals.verified,
        'medianMinutesFromPrevious', totals.verification_minutes
      ),
      jsonb_build_object(
        'id', 'onboarding_completed', 'label', 'Onboarding complete',
        'count', totals.onboarding_completed,
        'medianMinutesFromPrevious', null
      ),
      jsonb_build_object(
        'id', 'profile_published', 'label', 'Profile published',
        'count', totals.published,
        'medianMinutesFromPrevious', totals.publish_minutes,
        'elapsedDefinition', 'registration_to_publish'
      ),
      jsonb_build_object(
        'id', 'first_view', 'label', 'First qualified view',
        'count', totals.viewed,
        'medianMinutesFromPrevious', totals.first_view_minutes
      ),
      jsonb_build_object(
        'id', 'first_action', 'label', 'First outbound action',
        'count', totals.actioned,
        'medianMinutesFromPrevious', totals.first_action_minutes
      )
    ),
    'registrationCoverage', jsonb_build_object(
      'completed', totals.registration_completed,
      'cohort', totals.cohort_size
    ),
    'onboardingStarted', totals.onboarding_started,
    'completionDistribution', jsonb_build_array(
      jsonb_build_object('id', '0', 'label', 'Not started', 'count', totals.progress_zero),
      jsonb_build_object('id', '1-25', 'label', '1–25%', 'count', totals.progress_one_to_twenty_five),
      jsonb_build_object('id', '26-50', 'label', '26–50%', 'count', totals.progress_twenty_six_to_fifty),
      jsonb_build_object('id', '51-74', 'label', '51–74%', 'count', totals.progress_fifty_one_to_seventy_four),
      jsonb_build_object('id', '75-99', 'label', '75–99%', 'count', totals.progress_seventy_five_to_ninety_nine),
      jsonb_build_object('id', '100', 'label', 'Complete', 'count', totals.progress_complete)
    ),
    'trafficGaps', jsonb_build_object(
      'analyticsCoverageStartedAt', (select started_at from analytics_coverage),
      'zeroTraffic', case
        when (select started_at from analytics_coverage) is null then null
        else totals.zero_traffic
      end,
      'zeroTrafficEligible', totals.zero_traffic_eligible,
      'viewedNoAction', totals.viewed_no_action
    ),
    'moduleAdoption', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lower(replace(module_name, ' ', '_')),
        'label', module_name,
        'count', owners
      ) order by module_name)
      from module_counts
    ), '[]'::jsonb),
    'unavailable', jsonb_build_array(
      jsonb_build_object('id', 'landing_visits', 'reason', 'No controlled first-party landing event exists.'),
      jsonb_build_object('id', 'signup_started', 'reason', 'No immutable signup-start timestamp exists.'),
      jsonb_build_object('id', 'onboarding_elapsed', 'reason', 'Progress stores the latest update, not immutable first-completion time.'),
      jsonb_build_object('id', 'trial_and_paid_conversion', 'reason', 'Current entitlements do not prove first paid conversion or distinguish a trial.'),
      jsonb_build_object('id', 'retention_churn_ltv', 'reason', 'No authoritative historical billing and activity cohort source is available.'),
      jsonb_build_object('id', 'device_geography', 'reason', 'Product-funnel account stages do not collect approved device or geography dimensions.'),
      jsonb_build_object('id', 'onboarding_abandonment', 'reason', 'No immutable step-entry and exit event stream exists.'),
      jsonb_build_object('id', 'csv_warehouse', 'reason', 'Audited analyst export is not implemented.'),
      jsonb_build_object('id', 'historical_backfill', 'reason', 'Pre-ingestion traffic is not inferred or backfilled.')
    )
  ) into v_result
  from totals;

  return v_result;
end;
$$;

comment on function public.get_admin_platform_funnel(date, date, text, text, text) is
  'Admin-only signup cohort funnel. Current plan/domain/referral cohort filters are explicit; unsupported stages are returned as unavailable, never as zero.';

revoke all on function public.get_admin_platform_funnel(date, date, text, text, text)
  from public, anon;
grant execute on function public.get_admin_platform_funnel(date, date, text, text, text)
  to authenticated;
