create table public.profile_onboarding_progress (
  user_id uuid primary key references public.users(id) on delete cascade,
  template_id text not null,
  completed_step_ids text[] not null default '{}'::text[],
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint profile_onboarding_progress_template_check check (
    template_id in (
      'basic',
      'direct-booking',
      'location-provider-router',
      'services-catalogue',
      'cosmetic-transformation',
      'trust-first-family-practice',
      'specialist-assessment',
      'expert-educator',
      'clinic-commerce'
    )
  ),
  constraint profile_onboarding_progress_steps_check check (
    cardinality(completed_step_ids) <= 16
    and completed_step_ids <@ array[
      'profile-details',
      'social-links',
      'treatments',
      'locations',
      'links',
      'reviews',
      'gallery',
      'videos',
      'products'
    ]::text[]
  )
);

alter table public.profile_onboarding_progress enable row level security;
revoke all on table public.profile_onboarding_progress from anon, authenticated;

create or replace function public.get_profile_onboarding_progress(
  p_target_user_id uuid
)
returns table (
  template_id text,
  completed_step_ids text[],
  revision bigint,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if (select auth.uid()) <> p_target_user_id
    and not (select public.is_dashboard_admin())
  then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    progress.template_id,
    progress.completed_step_ids,
    progress.revision,
    progress.updated_at
  from public.profile_onboarding_progress progress
  where progress.user_id = p_target_user_id;
end;
$$;

create or replace function public.complete_profile_onboarding_step(
  p_target_user_id uuid,
  p_template_id text,
  p_step_id text
)
returns table (
  template_id text,
  completed_step_ids text[],
  revision bigint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if (select auth.uid()) <> p_target_user_id
    and not (select public.is_dashboard_admin())
  then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_template_id not in (
    'basic',
    'direct-booking',
    'location-provider-router',
    'services-catalogue',
    'cosmetic-transformation',
    'trust-first-family-practice',
    'specialist-assessment',
    'expert-educator',
    'clinic-commerce'
  ) then
    raise exception 'Unknown template' using errcode = '22023';
  end if;
  if p_step_id not in (
    'profile-details',
    'social-links',
    'treatments',
    'locations',
    'links',
    'reviews',
    'gallery',
    'videos',
    'products'
  ) then
    raise exception 'Unknown onboarding step' using errcode = '22023';
  end if;

  insert into public.profile_onboarding_progress as progress (
    user_id,
    template_id,
    completed_step_ids
  ) values (
    p_target_user_id,
    p_template_id,
    array[p_step_id]
  )
  on conflict (user_id) do update
  set
    template_id = excluded.template_id,
    completed_step_ids = case
      when progress.template_id = excluded.template_id then
        array(
          select distinct step_id
          from unnest(progress.completed_step_ids || excluded.completed_step_ids) step_id
          order by step_id
        )
      else excluded.completed_step_ids
    end,
    revision = progress.revision + 1,
    updated_at = now();

  return query
  select
    saved.template_id,
    saved.completed_step_ids,
    saved.revision,
    saved.updated_at
  from public.profile_onboarding_progress saved
  where saved.user_id = p_target_user_id;
end;
$$;

revoke all on function public.get_profile_onboarding_progress(uuid) from public, anon;
revoke all on function public.complete_profile_onboarding_step(uuid, text, text) from public, anon;
grant execute on function public.get_profile_onboarding_progress(uuid) to authenticated;
grant execute on function public.complete_profile_onboarding_step(uuid, text, text) to authenticated;
