-- Phase 8: remove legacy permissive mutations while preserving public reads,
-- then close direct execution of internal SECURITY DEFINER functions.

-- offer_codes are an admin/server-managed model. Settings retain their public
-- read model, but both tables are mutated through the admin boundary only.
create or replace function public.is_dashboard_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
      and not coalesce(is_blocked, false)
  )
$$;

revoke all on function public.is_dashboard_admin() from public, anon;
grant execute on function public.is_dashboard_admin() to authenticated;

drop policy if exists "Enable delete for users based on user_id" on public.offer_codes;
drop policy if exists "Enable insert for authenticated users only" on public.offer_codes;
drop policy if exists "Enable read access for all users" on public.offer_codes;
drop policy if exists "Enable update for users based on email" on public.offer_codes;

create policy "Dashboard admins can manage offer codes"
on public.offer_codes
for all
to authenticated
using ((select public.is_dashboard_admin()))
with check ((select public.is_dashboard_admin()));

revoke all privileges on table public.offer_codes from anon, authenticated;
grant select, insert, update, delete on table public.offer_codes to authenticated;
revoke all privileges on sequence public.offer_code_id_seq from anon, authenticated;
grant usage, select on sequence public.offer_code_id_seq to authenticated;

drop policy if exists "Enable delete for users based on user_id" on public.settings;
drop policy if exists "Enable insert for authenticated users only" on public.settings;
drop policy if exists "Enable update for users based on email" on public.settings;

create policy "Dashboard admins can manage settings"
on public.settings
for all
to authenticated
using ((select public.is_dashboard_admin()))
with check ((select public.is_dashboard_admin()));

revoke all privileges on table public.settings from anon, authenticated;
grant select on table public.settings to anon, authenticated;
grant insert, update, delete on table public.settings to authenticated;
revoke all privileges on sequence public.settings_id_seq from anon, authenticated;
grant usage, select on sequence public.settings_id_seq to authenticated;

-- Users are created by the auth trigger/service boundary. Their existing
-- approved self/admin UPDATE and public SELECT policies stay in place.
drop policy if exists "Enable delete for users based on user_id" on public.users;
drop policy if exists "Enable insert for authenticated users only" on public.users;

revoke all privileges on table public.users from anon, authenticated;
grant select on table public.users to anon, authenticated;
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
  birthday
) on table public.users to authenticated;

-- Every reviewed body below already qualifies its relation references. Pin an
-- empty search path so a caller cannot influence SECURITY DEFINER resolution.
alter function public.handle_auth_user_deleted() set search_path = '';
alter function public.lowercase_username() set search_path = '';
alter function public.update_updated_at_column() set search_path = '';
alter function public.increment_click_counter(text, bigint, text) set search_path = '';
alter function public.fn_audit_profile_change() set search_path = '';
alter function public.fn_audit_write(uuid, text, text, text, jsonb, jsonb) set search_path = '';
alter function public.fn_audit_socials() set search_path = '';
alter function public.fn_audit_link_groups() set search_path = '';
alter function public.fn_audit_dentistry_links() set search_path = '';
alter function public.fn_audit_links() set search_path = '';
alter function public.purge_profile_audit_log(integer) set search_path = '';

-- PostgreSQL grants EXECUTE to PUBLIC for new functions by default. Keep new
-- internal helpers closed unless a future migration grants a caller explicitly.
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated, service_role;

-- These helpers are invoked by triggers or trusted server-side flows, never
-- direct Data API callers. Keep service_role available for operational jobs.
revoke execute on function private.assert_dashboard_media_plan(uuid) from public, anon, authenticated;
revoke execute on function private.dashboard_media_path(text, text, uuid, text) from public, anon, authenticated;
revoke execute on function private.enqueue_dashboard_media_cleanup(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.assert_dashboard_content_owner(uuid) from public, anon, authenticated;
revoke execute on function private.dashboard_unique_blog_slug(text, bigint) from public, anon, authenticated;
revoke execute on function private.assert_dashboard_location_owner(uuid) from public, anon, authenticated;

revoke execute on function public.handle_auth_user_deleted() from public, anon, authenticated;
revoke execute on function public.fn_audit_profile_change() from public, anon, authenticated;
revoke execute on function public.fn_audit_write(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.fn_audit_socials() from public, anon, authenticated;
revoke execute on function public.fn_audit_link_groups() from public, anon, authenticated;
revoke execute on function public.fn_audit_dentistry_links() from public, anon, authenticated;
revoke execute on function public.fn_audit_links() from public, anon, authenticated;
revoke execute on function public.purge_profile_audit_log(integer) from public, anon, authenticated;

grant execute on function private.assert_dashboard_media_plan(uuid) to service_role;
grant execute on function private.dashboard_media_path(text, text, uuid, text) to service_role;
grant execute on function private.enqueue_dashboard_media_cleanup(uuid, text, text) to service_role;
grant execute on function private.assert_dashboard_content_owner(uuid) to service_role;
grant execute on function private.dashboard_unique_blog_slug(text, bigint) to service_role;
grant execute on function private.assert_dashboard_location_owner(uuid) to service_role;
grant execute on function public.handle_auth_user_deleted() to service_role;
grant execute on function public.fn_audit_profile_change() to service_role;
grant execute on function public.fn_audit_write(uuid, text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.fn_audit_socials() to service_role;
grant execute on function public.fn_audit_link_groups() to service_role;
grant execute on function public.fn_audit_dentistry_links() to service_role;
grant execute on function public.fn_audit_links() to service_role;
grant execute on function public.purge_profile_audit_log(integer) to service_role;

-- Public click endpoints intentionally call this RPC without a session.
revoke execute on function public.increment_click_counter(text, bigint, text) from public;
grant execute on function public.increment_click_counter(text, bigint, text) to anon, authenticated, service_role;
