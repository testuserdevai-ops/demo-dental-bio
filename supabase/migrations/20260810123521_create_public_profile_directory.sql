create table public.public_profiles (
  profile_id uuid primary key references public.users(id) on delete cascade,
  dentistry_id uuid not null unique references public.dentistries(dentistry_id) on delete cascade,
  username character varying(50) not null unique,
  position text,
  first_name character varying(100),
  last_name character varying(100),
  title text,
  gdc_no character varying,
  qualification character varying,
  "isVerified" boolean,
  use_dental_brand boolean,
  subscription_status character varying(50),
  registered_domain text not null,
  verified_domain character varying,
  updated_at timestamp with time zone not null default now(),
  constraint public_profiles_username_format_check
    check (username::text ~ '^[a-z0-9._-]{3,30}$'::text)
);

create unique index public_profiles_verified_domain_unique_idx
on public.public_profiles (verified_domain)
where verified_domain is not null;

alter table public.public_profiles enable row level security;

create policy "Public profiles are readable"
on public.public_profiles
for select
to anon, authenticated
using (true);

revoke all privileges on table public.public_profiles from public, anon, authenticated;
grant select on table public.public_profiles to anon, authenticated;
grant select, insert, update, delete on table public.public_profiles to service_role;

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
    case
      when users.domain_verified then lower(users.domain)
      else null
    end,
    now()
  from public.users
  join public.dentistries on dentistries.user_id = users.id
  where users.id = p_user_id
    and not coalesce(users.is_blocked, false);
end;
$$;

create or replace function private.sync_public_profile_from_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profiles where profile_id = old.id;
    return old;
  end if;

  perform private.sync_public_profile(new.id);
  return new;
end;
$$;

create or replace function private.sync_public_profile_from_dentistry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profiles where dentistry_id = old.dentistry_id;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform private.sync_public_profile(old.user_id);
  end if;

  perform private.sync_public_profile(new.user_id);
  return new;
end;
$$;

revoke execute on function private.sync_public_profile(uuid) from public, anon, authenticated;
revoke execute on function private.sync_public_profile_from_user() from public, anon, authenticated;
revoke execute on function private.sync_public_profile_from_dentistry() from public, anon, authenticated;
grant execute on function private.sync_public_profile(uuid) to service_role;

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
  registered_domain,
  domain,
  domain_verified,
  is_blocked
or delete
on public.users
for each row execute function private.sync_public_profile_from_user();

create trigger sync_public_profile_from_dentistry
after insert or update of user_id or delete
on public.dentistries
for each row execute function private.sync_public_profile_from_dentistry();

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
  now()
from public.users
join public.dentistries on dentistries.user_id = users.id
where not coalesce(users.is_blocked, false);

drop policy if exists "Enable read access for all users" on public.users;

create policy "Users can read own row or dashboard admins"
on public.users
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_dashboard_admin())
);

revoke all privileges on table public.users from anon;
revoke select on table public.users from authenticated;
grant select on table public.users to authenticated;
