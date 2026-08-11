-- Profile presentation configuration is private owner state on public.users.
-- Only the normalized, published configuration is copied to public_profiles.

create or replace function private.is_profile_presentation_entity_id(p_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value ~ '^[1-9][0-9]*$'
    or p_value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
$$;

create or replace function private.is_profile_presentation_entity_id_array(
  p_value jsonb,
  p_maximum integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) <= p_maximum
    and not exists (
      select 1
      from jsonb_array_elements(p_value) value
      where jsonb_typeof(value) <> 'string'
        or not private.is_profile_presentation_entity_id(value #>> '{}')
    )
    and (
      select count(*) = count(distinct value)
      from jsonb_array_elements_text(p_value) value
    )
$$;

create or replace function private.is_valid_profile_presentation_configuration(
  p_configuration jsonb,
  p_allow_premium boolean
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_template text;
  v_theme text;
  v_layout text;
  v_answers jsonb;
begin
  if jsonb_typeof(p_configuration) <> 'object'
    or not p_configuration ?& array['schemaVersion', 'templateId', 'themeId', 'layoutVariant', 'answers']
    or p_configuration - array['schemaVersion', 'templateId', 'themeId', 'layoutVariant', 'answers'] <> '{}'::jsonb
    or jsonb_typeof(p_configuration -> 'schemaVersion') <> 'number'
    or p_configuration ->> 'schemaVersion' <> '1'
    or jsonb_typeof(p_configuration -> 'templateId') <> 'string'
    or jsonb_typeof(p_configuration -> 'themeId') <> 'string'
    or jsonb_typeof(p_configuration -> 'layoutVariant') <> 'string'
    or jsonb_typeof(p_configuration -> 'answers') <> 'object'
  then
    return false;
  end if;

  v_template := p_configuration ->> 'templateId';
  v_theme := p_configuration ->> 'themeId';
  v_layout := p_configuration ->> 'layoutVariant';
  v_answers := p_configuration -> 'answers';

  if v_template not in (
    'basic',
    'direct-booking',
    'location-provider-router',
    'services-catalogue',
    'cosmetic-transformation',
    'trust-first-family-practice',
    'specialist-assessment',
    'expert-educator',
    'clinic-commerce'
  ) or v_theme not in (
    'clinical-light',
    'warm-care',
    'editorial-expert',
    'modern-specialist',
    'premium-contrast'
  ) or v_layout not in (
    'classic-stack',
    'hero-overlap',
    'editorial-split',
    'section-navigator'
  ) then
    return false;
  end if;

  if (v_theme = 'premium-contrast' or v_layout <> 'classic-stack')
    and not p_allow_premium
  then
    return false;
  end if;

  if (v_template in ('basic', 'direct-booking') and v_layout <> 'classic-stack')
    or (v_template = 'location-provider-router' and v_layout not in ('classic-stack', 'section-navigator'))
    or (v_template = 'services-catalogue' and v_layout not in ('classic-stack', 'section-navigator'))
    or (v_template = 'trust-first-family-practice' and v_layout not in ('classic-stack', 'hero-overlap', 'editorial-split'))
    or (v_template = 'specialist-assessment' and v_layout not in ('classic-stack', 'section-navigator'))
    or (v_template in ('expert-educator', 'clinic-commerce') and v_layout not in ('classic-stack', 'editorial-split', 'section-navigator'))
  then
    return false;
  end if;

  if v_template = 'basic' then
    return v_answers = '{}'::jsonb;
  elsif v_template = 'direct-booking' then
    if v_answers - array['primaryAction', 'secondaryAction', 'featuredTreatmentIds'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'primaryAction' and (
      jsonb_typeof(v_answers -> 'primaryAction') <> 'string'
      or v_answers ->> 'primaryAction' not in ('booking', 'assessment', 'website', 'whatsapp', 'phone', 'email')
    )) or (v_answers ? 'secondaryAction' and (
      jsonb_typeof(v_answers -> 'secondaryAction') <> 'string'
      or v_answers ->> 'secondaryAction' not in ('booking', 'assessment', 'website', 'whatsapp', 'phone', 'email')
    )) or (v_answers ? 'featuredTreatmentIds' and not private.is_profile_presentation_entity_id_array(v_answers -> 'featuredTreatmentIds', 3)) then
      return false;
    end if;
  elsif v_template = 'location-provider-router' then
    if v_answers - array['routerKind', 'defaultLocationId'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'routerKind' and (
      jsonb_typeof(v_answers -> 'routerKind') <> 'string'
      or v_answers ->> 'routerKind' not in ('location', 'provider', 'appointment-type')
    )) or (v_answers ? 'defaultLocationId' and (
      jsonb_typeof(v_answers -> 'defaultLocationId') <> 'string'
      or not private.is_profile_presentation_entity_id(v_answers ->> 'defaultLocationId')
    )) then
      return false;
    end if;
  elsif v_template = 'services-catalogue' then
    if v_answers - array['featuredTreatmentIds', 'showFinancingBeforeTeam'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'featuredTreatmentIds' and not private.is_profile_presentation_entity_id_array(v_answers -> 'featuredTreatmentIds', 3))
      or (v_answers ? 'showFinancingBeforeTeam' and jsonb_typeof(v_answers -> 'showFinancingBeforeTeam') <> 'boolean')
    then
      return false;
    end if;
  elsif v_template = 'cosmetic-transformation' then
    if v_answers - array['signatureTreatmentId', 'consultationKind', 'featuredGalleryIds', 'featuredReviewIds'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'signatureTreatmentId' and (
      jsonb_typeof(v_answers -> 'signatureTreatmentId') <> 'string'
      or not private.is_profile_presentation_entity_id(v_answers ->> 'signatureTreatmentId')
    )) or (v_answers ? 'consultationKind' and (
      jsonb_typeof(v_answers -> 'consultationKind') <> 'string'
      or v_answers ->> 'consultationKind' not in ('in-person', 'virtual', 'free')
    )) or (v_answers ? 'featuredGalleryIds' and not private.is_profile_presentation_entity_id_array(v_answers -> 'featuredGalleryIds', 6))
      or (v_answers ? 'featuredReviewIds' and not private.is_profile_presentation_entity_id_array(v_answers -> 'featuredReviewIds', 3))
    then
      return false;
    end if;
  elsif v_template = 'trust-first-family-practice' then
    if v_answers - array['featuredReviewIds', 'priorityInformation'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'featuredReviewIds' and not private.is_profile_presentation_entity_id_array(v_answers -> 'featuredReviewIds', 2))
      or (v_answers ? 'priorityInformation' and (
        jsonb_typeof(v_answers -> 'priorityInformation') <> 'array'
        or jsonb_array_length(v_answers -> 'priorityInformation') > 4
        or exists (
          select 1 from jsonb_array_elements(v_answers -> 'priorityInformation') value
          where jsonb_typeof(value) <> 'string'
            or value #>> '{}' not in ('payment', 'insurance', 'accessibility', 'anxiety-care')
        )
      ))
    then
      return false;
    end if;
  elsif v_template = 'specialist-assessment' then
    if v_answers - array['primaryPath', 'referralRequired', 'showEmergencyFirst'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'primaryPath' and (
      jsonb_typeof(v_answers -> 'primaryPath') <> 'string'
      or v_answers ->> 'primaryPath' not in ('assessment', 'consultation')
    )) or (v_answers ? 'referralRequired' and jsonb_typeof(v_answers -> 'referralRequired') <> 'boolean')
      or (v_answers ? 'showEmergencyFirst' and jsonb_typeof(v_answers -> 'showEmergencyFirst') <> 'boolean')
    then
      return false;
    end if;
  elsif v_template = 'expert-educator' then
    if v_answers - array['defaultAudience', 'featuredContentId'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'defaultAudience' and (
      jsonb_typeof(v_answers -> 'defaultAudience') <> 'string'
      or v_answers ->> 'defaultAudience' not in ('patients', 'professionals')
    )) or (v_answers ? 'featuredContentId' and (
      jsonb_typeof(v_answers -> 'featuredContentId') <> 'string'
      or not private.is_profile_presentation_entity_id(v_answers ->> 'featuredContentId')
    )) then
      return false;
    end if;
  elsif v_template = 'clinic-commerce' then
    if v_answers - array['defaultAudience', 'featuredProductId'] <> '{}'::jsonb then
      return false;
    end if;
    if (v_answers ? 'defaultAudience' and (
      jsonb_typeof(v_answers -> 'defaultAudience') <> 'string'
      or v_answers ->> 'defaultAudience' not in ('clinic', 'shop')
    )) or (v_answers ? 'featuredProductId' and (
      jsonb_typeof(v_answers -> 'featuredProductId') <> 'string'
      or not private.is_profile_presentation_entity_id(v_answers ->> 'featuredProductId')
    )) then
      return false;
    end if;
  end if;

  return true;
end;
$$;

create or replace function private.resolve_public_profile_presentation(
  p_configuration jsonb,
  p_subscription_status text,
  p_trial_end timestamptz
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_default constant jsonb := '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb;
  v_has_premium boolean := p_subscription_status in ('PRO', 'PREMIUM PRO')
    or (p_trial_end is not null and p_trial_end > now());
  v_resolved jsonb;
begin
  if private.is_valid_profile_presentation_configuration(p_configuration, v_has_premium) then
    return p_configuration;
  end if;

  if private.is_valid_profile_presentation_configuration(p_configuration, true) then
    v_resolved := jsonb_set(
      jsonb_set(p_configuration, '{themeId}', '"clinical-light"'::jsonb),
      '{layoutVariant}',
      '"classic-stack"'::jsonb
    );
    if private.is_valid_profile_presentation_configuration(v_resolved, false) then
      return v_resolved;
    end if;
  end if;

  return v_default;
end;
$$;

alter table public.users
  add column profile_presentation_published jsonb not null
    default '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb,
  add column profile_presentation_published_revision bigint not null default 0,
  add column profile_presentation_published_at timestamptz,
  add column profile_presentation_draft jsonb,
  add column profile_presentation_draft_revision bigint not null default 0,
  add column profile_presentation_draft_updated_at timestamptz,
  add constraint users_profile_presentation_published_valid_check check (
    private.is_valid_profile_presentation_configuration(profile_presentation_published, true)
  ),
  add constraint users_profile_presentation_draft_valid_check check (
    profile_presentation_draft is null
    or private.is_valid_profile_presentation_configuration(profile_presentation_draft, true)
  ),
  add constraint users_profile_presentation_revision_check check (
    profile_presentation_published_revision >= 0
    and profile_presentation_draft_revision >= 0
  );

alter table public.public_profiles
  add column profile_presentation jsonb not null
    default '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb,
  add column profile_presentation_revision bigint not null default 0,
  add constraint public_profiles_profile_presentation_valid_check check (
    private.is_valid_profile_presentation_configuration(profile_presentation, true)
  );

revoke update (
  profile_presentation_published,
  profile_presentation_published_revision,
  profile_presentation_published_at,
  profile_presentation_draft,
  profile_presentation_draft_revision,
  profile_presentation_draft_updated_at
) on table public.users from anon, authenticated;

create or replace function public.save_profile_presentation_draft(
  p_target_user_id uuid,
  p_expected_revision bigint,
  p_configuration jsonb
)
returns table(configuration jsonb, revision bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subscription_status text;
  v_trial_end timestamptz;
  v_allow_premium boolean;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if (select auth.uid()) <> p_target_user_id and not (select public.is_dashboard_admin()) then
    raise exception using errcode = '42501', message = 'Profile presentation access denied';
  end if;

  select users.subscription_status, users.trial_end
  into v_subscription_status, v_trial_end
  from public.users
  where users.id = p_target_user_id and not coalesce(users.is_blocked, false)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile owner was not found';
  end if;

  v_allow_premium := v_subscription_status in ('PRO', 'PREMIUM PRO')
    or (v_trial_end is not null and v_trial_end > now());
  if not private.is_valid_profile_presentation_configuration(p_configuration, v_allow_premium) then
    raise exception using errcode = '22023', message = 'Profile presentation configuration is invalid or unavailable';
  end if;

  return query
  update public.users
  set profile_presentation_draft = p_configuration,
      profile_presentation_draft_revision = profile_presentation_draft_revision + 1,
      profile_presentation_draft_updated_at = now()
  where id = p_target_user_id
    and profile_presentation_draft_revision = p_expected_revision
  returning profile_presentation_draft,
    profile_presentation_draft_revision,
    profile_presentation_draft_updated_at;

  if not found then
    raise exception using errcode = '40001', message = 'Profile presentation draft changed concurrently';
  end if;
end;
$$;

create or replace function public.publish_profile_presentation(
  p_target_user_id uuid,
  p_expected_draft_revision bigint,
  p_expected_published_revision bigint
)
returns table(configuration jsonb, revision bigint, published_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft jsonb;
  v_subscription_status text;
  v_trial_end timestamptz;
  v_allow_premium boolean;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;
  if (select auth.uid()) <> p_target_user_id and not (select public.is_dashboard_admin()) then
    raise exception using errcode = '42501', message = 'Profile presentation access denied';
  end if;

  select users.profile_presentation_draft,
    users.subscription_status,
    users.trial_end
  into v_draft, v_subscription_status, v_trial_end
  from public.users
  where users.id = p_target_user_id and not coalesce(users.is_blocked, false)
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Profile owner was not found';
  end if;
  if v_draft is null then
    raise exception using errcode = '22023', message = 'No profile presentation draft is available';
  end if;

  v_allow_premium := v_subscription_status in ('PRO', 'PREMIUM PRO')
    or (v_trial_end is not null and v_trial_end > now());
  if not private.is_valid_profile_presentation_configuration(v_draft, v_allow_premium) then
    raise exception using errcode = '22023', message = 'Profile presentation draft is no longer available for this plan';
  end if;

  return query
  update public.users
  set profile_presentation_published = v_draft,
      profile_presentation_published_revision = profile_presentation_published_revision + 1,
      profile_presentation_published_at = now()
  where id = p_target_user_id
    and profile_presentation_draft_revision = p_expected_draft_revision
    and profile_presentation_published_revision = p_expected_published_revision
  returning profile_presentation_published,
    profile_presentation_published_revision,
    profile_presentation_published_at;

  if not found then
    raise exception using errcode = '40001', message = 'Profile presentation changed concurrently';
  end if;
end;
$$;

revoke all on function public.save_profile_presentation_draft(uuid, bigint, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.publish_profile_presentation(uuid, bigint, bigint) from public, anon, authenticated, service_role;
grant execute on function public.save_profile_presentation_draft(uuid, bigint, jsonb) to authenticated;
grant execute on function public.publish_profile_presentation(uuid, bigint, bigint) to authenticated;

create or replace function private.sync_public_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.public_profiles where profile_id = p_user_id;

  insert into public.public_profiles (
    profile_id,
    dentistry_id,
    username,
    position,
    first_name,
    last_name,
    title,
    gdc_no,
    qualification,
    "isVerified",
    use_dental_brand,
    subscription_status,
    registered_domain,
    verified_domain,
    profile_presentation,
    profile_presentation_revision,
    updated_at
  )
  select
    users.id,
    dentistries.dentistry_id,
    users.username,
    users.position,
    users.first_name,
    users.last_name,
    users.title,
    users.gdc_no,
    users.qualification,
    users."isVerified",
    users.use_dental_brand,
    users.subscription_status,
    users.registered_domain,
    case when users.domain_verified then lower(users.domain) else null end,
    private.resolve_public_profile_presentation(
      users.profile_presentation_published,
      users.subscription_status,
      users.trial_end
    ),
    users.profile_presentation_published_revision,
    now()
  from public.users
  join public.dentistries on dentistries.user_id = users.id
  where users.id = p_user_id
    and not coalesce(users.is_blocked, false);
end;
$$;

drop trigger if exists sync_public_profile_from_user on public.users;
create trigger sync_public_profile_from_user
after insert or update of
  username,
  position,
  first_name,
  last_name,
  title,
  gdc_no,
  qualification,
  "isVerified",
  use_dental_brand,
  subscription_status,
  trial_end,
  registered_domain,
  domain,
  domain_verified,
  is_blocked,
  profile_presentation_published,
  profile_presentation_published_revision
or delete
on public.users
for each row execute function private.sync_public_profile_from_user();

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select users.id from public.users loop
    perform private.sync_public_profile(v_user_id);
  end loop;
end;
$$;

revoke execute on function private.is_profile_presentation_entity_id(text) from public, anon, authenticated;
revoke execute on function private.is_profile_presentation_entity_id_array(jsonb, integer) from public, anon, authenticated;
revoke execute on function private.is_valid_profile_presentation_configuration(jsonb, boolean) from public, anon, authenticated;
revoke execute on function private.resolve_public_profile_presentation(jsonb, text, timestamptz) from public, anon, authenticated;
-- The users check constraints evaluate this pure validator for authorized
-- profile-field updates. It is not exposed by PostgREST because private is not
-- an exposed schema; mutation authority remains in the two public RPCs.
grant execute on function private.is_valid_profile_presentation_configuration(jsonb, boolean) to authenticated, service_role;
