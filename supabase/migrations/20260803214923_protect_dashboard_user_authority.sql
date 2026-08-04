create or replace function public.is_dashboard_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = (select auth.uid()) and role = 'admin'
  )
$$;

revoke all on function public.is_dashboard_admin() from public, anon;
grant execute on function public.is_dashboard_admin() to authenticated;

drop policy if exists "Enable update for users based on email" on public.users;

create policy "Dashboard users can update approved profile fields"
on public.users
for update
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_dashboard_admin())
)
with check (
  id = (select auth.uid())
  or (select public.is_dashboard_admin())
);

revoke update on table public.users from anon, authenticated;
grant update (
  first_name,
  middle_name,
  last_name,
  username,
  country,
  position,
  title,
  gdc_no,
  qualification,
  birthday,
  domain,
  use_dental_brand
) on table public.users to authenticated;
