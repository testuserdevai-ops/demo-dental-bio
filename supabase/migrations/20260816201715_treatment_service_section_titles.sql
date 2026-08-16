alter table public.dentistries
  add column treatment_section_title text not null default 'Treatments',
  add column service_section_title text not null default 'Services',
  add constraint dentistries_treatment_section_title_check check (
    treatment_section_title = btrim(treatment_section_title)
    and char_length(treatment_section_title) between 1 and 100
    and treatment_section_title !~ '[[:cntrl:]]'
  ),
  add constraint dentistries_service_section_title_check check (
    service_section_title = btrim(service_section_title)
    and char_length(service_section_title) between 1 and 100
    and service_section_title !~ '[[:cntrl:]]'
  );

alter table public.public_profiles
  add column treatment_section_title text not null default 'Treatments',
  add column service_section_title text not null default 'Services',
  add constraint public_profiles_treatment_section_title_check check (
    treatment_section_title = btrim(treatment_section_title)
    and char_length(treatment_section_title) between 1 and 100
    and treatment_section_title !~ '[[:cntrl:]]'
  ),
  add constraint public_profiles_service_section_title_check check (
    service_section_title = btrim(service_section_title)
    and char_length(service_section_title) between 1 and 100
    and service_section_title !~ '[[:cntrl:]]'
  );

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
    treatment_section_title,
    service_section_title,
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
    dentistries.treatment_section_title,
    dentistries.service_section_title,
    now()
  from public.users
  join public.dentistries on dentistries.user_id = users.id
  where users.id = p_user_id
    and not coalesce(users.is_blocked, false);
end;
$$;

drop trigger if exists sync_public_profile_from_dentistry on public.dentistries;
create trigger sync_public_profile_from_dentistry
after insert or update of user_id, treatment_section_title, service_section_title or delete
on public.dentistries
for each row execute function private.sync_public_profile_from_dentistry();

create or replace function public.save_treatment_service_section_titles(
  p_dentistry_id uuid,
  p_treatment_section_title text,
  p_service_section_title text
)
returns table(treatment_section_title text, service_section_title text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_treatment_title text := btrim(p_treatment_section_title);
  v_service_title text := btrim(p_service_section_title);
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication is required';
  end if;

  select dentistries.user_id
  into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Dentistry was not found';
  end if;
  if (select auth.uid()) <> v_owner_id and not (select public.is_dashboard_admin()) then
    raise exception using errcode = '42501', message = 'Treatment section title access denied';
  end if;
  if v_treatment_title is null
    or char_length(v_treatment_title) not between 1 and 100
    or v_treatment_title ~ '[[:cntrl:]]'
    or v_service_title is null
    or char_length(v_service_title) not between 1 and 100
    or v_service_title ~ '[[:cntrl:]]'
  then
    raise exception using errcode = '22023', message = 'Section titles must be plain text between 1 and 100 characters';
  end if;

  return query
  update public.dentistries as d
  set treatment_section_title = v_treatment_title,
      service_section_title = v_service_title
  where d.dentistry_id = p_dentistry_id
  returning d.treatment_section_title, d.service_section_title;
end;
$$;

revoke all on function public.save_treatment_service_section_titles(uuid, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.save_treatment_service_section_titles(uuid, text, text)
to authenticated;

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in select users.id from public.users loop
    perform private.sync_public_profile(v_user_id);
  end loop;
end;
$$;
