alter table public.dentistries
  add column external_review_section_title text,
  add constraint dentistries_external_review_section_title_check check (
    external_review_section_title is null
    or (
      external_review_section_title = btrim(external_review_section_title)
      and char_length(external_review_section_title) between 1 and 100
      and external_review_section_title !~ '[[:cntrl:]]'
    )
  );

alter table public.public_profiles
  add column external_review_section_title text,
  add constraint public_profiles_external_review_section_title_check check (
    external_review_section_title is null
    or (
      external_review_section_title = btrim(external_review_section_title)
      and char_length(external_review_section_title) between 1 and 100
      and external_review_section_title !~ '[[:cntrl:]]'
    )
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
    external_review_section_title,
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
    dentistries.external_review_section_title,
    now()
  from public.users
  join public.dentistries on dentistries.user_id = users.id
  where users.id = p_user_id
    and not coalesce(users.is_blocked, false);
end;
$$;

drop trigger if exists sync_public_profile_from_dentistry on public.dentistries;
create trigger sync_public_profile_from_dentistry
after insert or update of user_id, treatment_section_title, service_section_title,
  external_review_section_title or delete
on public.dentistries
for each row execute function private.sync_public_profile_from_dentistry();

create or replace function public.save_external_review_section_title(
  p_dentistry_id uuid,
  p_external_review_section_title text
)
returns table(external_review_section_title text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_title text := nullif(btrim(p_external_review_section_title), '');
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
    raise exception using errcode = '42501', message = 'External review section title access denied';
  end if;
  if v_title is not null and (
    char_length(v_title) > 100
    or v_title ~ '[[:cntrl:]]'
  ) then
    raise exception using errcode = '22023', message = 'External review section title must be plain text up to 100 characters';
  end if;

  return query
  update public.dentistries as d
  set external_review_section_title = v_title
  where d.dentistry_id = p_dentistry_id
  returning d.external_review_section_title;
end;
$$;

revoke all on function public.save_external_review_section_title(uuid, text)
from public, anon, authenticated, service_role;
grant execute on function public.save_external_review_section_title(uuid, text)
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
