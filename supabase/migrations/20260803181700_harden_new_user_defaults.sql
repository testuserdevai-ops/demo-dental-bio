-- User metadata is editable by the authenticated user. It may initialize
-- profile fields, but it must never grant roles, plans, or billing state.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_data jsonb := new.raw_user_meta_data;
begin
  insert into public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    title,
    birthday,
    offer_code,
    country,
    position,
    role,
    subscription_status,
    created_at
  )
  values (
    new.id,
    new.email,
    raw_data ->> 'username',
    raw_data ->> 'first_name',
    raw_data ->> 'last_name',
    raw_data ->> 'title',
    case
      when raw_data ->> 'birthday' is null or raw_data ->> 'birthday' = ''
      then null
      else to_date(raw_data ->> 'birthday', 'DD/MM/YYYY')
    end,
    raw_data ->> 'offer_code',
    raw_data ->> 'country',
    raw_data ->> 'position',
    'user',
    null,
    now()
  );

  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Initializes non-authorizing profile fields. Roles, plans, subscriptions, and billing state use trusted server defaults only.';

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
