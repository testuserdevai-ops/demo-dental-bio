drop policy if exists "Enable insert for authenticated users only"
  on public.dentistries;
drop policy if exists "Enable update for users based on email"
  on public.dentistries;
drop policy if exists "Enable delete for users based on user_id"
  on public.dentistries;

create policy "Dashboard owners can insert their dentistry"
on public.dentistries
for insert
to authenticated
with check (
  dentistries.user_id = (select auth.uid())
  or (select public.is_dashboard_admin())
);

create policy "Dashboard owners can update their dentistry"
on public.dentistries
for update
to authenticated
using (
  dentistries.user_id = (select auth.uid())
  or (select public.is_dashboard_admin())
)
with check (
  dentistries.user_id = (select auth.uid())
  or (select public.is_dashboard_admin())
);

create policy "Dashboard owners can delete their dentistry"
on public.dentistries
for delete
to authenticated
using (
  dentistries.user_id = (select auth.uid())
  or (select public.is_dashboard_admin())
);
