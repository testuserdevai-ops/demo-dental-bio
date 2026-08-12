-- Brand configuration is global platform state, not tenant-owned content.
-- Keep public reads, but allow mutations only through the existing unblocked
-- dashboard-admin authority boundary.
drop policy if exists "Authenticated users can manage brands" on public.brands;

create policy "Dashboard admins can manage brands"
on public.brands
for all
to authenticated
using ((select public.is_dashboard_admin()))
with check ((select public.is_dashboard_admin()));

revoke all privileges on table public.brands from anon, authenticated;
grant select on table public.brands to anon, authenticated;
grant insert, update, delete on table public.brands to authenticated;
