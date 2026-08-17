begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000801'::uuid as ordinary_id,
  '00000000-0000-0000-0000-000000000802'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000803'::uuid as security_admin_id,
  '00000000-0000-0000-0000-000000000804'::uuid as blocked_admin_id
\gset

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260810022702'
  ),
  'Phase 8 database-security migration is applied'
);

set local role service_role;
insert into public.users (id, email, username, role)
values
  (:'ordinary_id', 'phase8-ordinary@example.test', 'phase8-ordinary', 'user'),
  (:'admin_id', 'phase8-admin@example.test', 'phase8-admin', 'admin'),
  (:'security_admin_id', 'phase8-security-admin@example.test', 'phase8-security-admin', 'security_admin'),
  (:'blocked_admin_id', 'phase8-blocked-admin@example.test', 'phase8-blocked-admin', 'admin');

update public.users set is_blocked = true where id = :'blocked_admin_id';

select ok(
  (select count(*) from pg_policies
   where schemaname = 'public' and tablename in ('offer_codes', 'settings') and cmd <> 'SELECT') = 2
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offer_codes'
    and policyname = 'Dashboard admins can manage offer codes' and cmd = 'ALL' and roles = array['authenticated']::name[])
  and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'settings'
    and policyname = 'Dashboard admins can manage settings' and cmd = 'ALL' and roles = array['authenticated']::name[]),
  'Only authenticated database admins receive offer-code and setting mutation policies'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'users'
    and policyname = 'Dashboard users can update approved profile fields')
  and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'users'
      and cmd in ('INSERT', 'DELETE')
  ),
  'Users retain the approved UPDATE policy and have no broad INSERT or DELETE policy'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select lives_ok($$ select * from public.settings $$, 'Anonymous callers retain public setting reads');
select throws_ok(
  $$ select * from public.users $$,
  '42501',
  null,
  'Anonymous callers cannot read private user records after the public-directory migration'
);
select throws_ok($$ select * from public.offer_codes $$, '42501', null, 'Anonymous callers cannot read admin-managed offer codes');
select throws_ok(
  $$ insert into public.settings(key, value) values ('phase8-anon', 'denied') $$,
  '42501', null, 'Anonymous callers cannot mutate settings'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select public.is_dashboard_admin()), false, 'Ordinary authenticated fixture is not a database admin');
select throws_ok(
  $$ insert into public.offer_codes(university, offer_code, trial_duration) values ('Phase 8', 'ORDINARY', 1) $$,
  '42501', null, 'Ordinary authenticated callers cannot create offer codes'
);
select throws_ok(
  $$ insert into public.settings(key, value) values ('phase8-ordinary', 'denied') $$,
  '42501', null, 'Ordinary authenticated callers cannot create settings'
);
select throws_ok(
  $$ insert into public.users(id, email, username, role) values ('00000000-0000-0000-0000-000000000805', 'phase8-forged@example.test', 'phase8-forged', 'admin') $$,
  '42501', null, 'Ordinary authenticated callers cannot create users'
);
select throws_ok(
  $$ delete from public.users where id = '00000000-0000-0000-0000-000000000802' $$,
  '42501', null, 'Ordinary authenticated callers cannot delete users'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'security_admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select public.is_dashboard_admin()), false, 'Security admins do not inherit platform-admin database authority');
select throws_ok(
  $$ insert into public.settings(key, value) values ('phase8-security-admin', 'denied') $$,
  '42501', null, 'Security admins cannot mutate platform settings'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'blocked_admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select public.is_dashboard_admin()), false, 'Blocked admins lose database admin authority');
select throws_ok(
  $$ insert into public.offer_codes(university, offer_code, trial_duration) values ('Phase 8', 'BLOCKED', 1) $$,
  '42501', null, 'Blocked admins cannot mutate offer codes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select public.is_dashboard_admin()), true, 'Admin policy fixture is recognized by is_dashboard_admin');
select lives_ok(
  $$ insert into public.offer_codes(university, offer_code, trial_duration) values ('Phase 8', 'ADMIN', 1) $$,
  'Authenticated database admins can create offer codes'
);
select lives_ok($$ select * from public.offer_codes $$, 'Authenticated database admins can read offer codes');
select lives_ok(
  $$ insert into public.settings(key, value) values ('phase8-admin', 'allowed') $$,
  'Authenticated database admins can create settings'
);
select lives_ok(
  $$ update public.settings set value = 'updated' where key = 'phase8-admin' $$,
  'Authenticated database admins can update settings'
);
select ok(
  not has_table_privilege('anon', 'public.offer_codes', 'select')
  and not has_table_privilege('anon', 'public.offer_codes', 'truncate')
  and not has_table_privilege('anon', 'public.offer_codes', 'references')
  and not has_table_privilege('anon', 'public.offer_codes', 'trigger')
  and not has_table_privilege('anon', 'public.settings', 'insert')
  and not has_table_privilege('anon', 'public.settings', 'truncate')
  and not has_table_privilege('anon', 'public.settings', 'references')
  and not has_table_privilege('anon', 'public.settings', 'trigger')
  and not has_table_privilege('anon', 'public.users', 'update')
  and not has_table_privilege('anon', 'public.users', 'truncate')
  and not has_table_privilege('anon', 'public.users', 'references')
  and not has_table_privilege('anon', 'public.users', 'trigger')
  and not has_table_privilege('authenticated', 'public.offer_codes', 'truncate')
  and not has_table_privilege('authenticated', 'public.offer_codes', 'references')
  and not has_table_privilege('authenticated', 'public.offer_codes', 'trigger')
  and not has_table_privilege('authenticated', 'public.settings', 'truncate')
  and not has_table_privilege('authenticated', 'public.settings', 'references')
  and not has_table_privilege('authenticated', 'public.settings', 'trigger')
  and not has_table_privilege('authenticated', 'public.users', 'insert')
  and not has_table_privilege('authenticated', 'public.users', 'delete')
  and not has_table_privilege('authenticated', 'public.users', 'truncate')
  and not has_table_privilege('authenticated', 'public.users', 'references')
  and not has_table_privilege('authenticated', 'public.users', 'trigger')
  and has_table_privilege('authenticated', 'public.offer_codes', 'select')
  and has_table_privilege('authenticated', 'public.offer_codes', 'insert')
  and has_table_privilege('service_role', 'public.offer_codes', 'select')
  and has_table_privilege('service_role', 'public.offer_codes', 'insert'),
  'Direct table privileges exclude legacy TRUNCATE, REFERENCES, and TRIGGER grants'
);
select ok(
  not has_sequence_privilege('anon', 'public.offer_code_id_seq', 'usage')
  and not has_sequence_privilege('anon', 'public.settings_id_seq', 'usage')
  and has_sequence_privilege('authenticated', 'public.offer_code_id_seq', 'usage')
  and has_sequence_privilege('authenticated', 'public.settings_id_seq', 'usage'),
  'Only authenticated admin flows retain generated-ID sequence access'
);
select ok(
  has_column_privilege('authenticated', 'public.users', 'first_name', 'update')
  and has_column_privilege('authenticated', 'public.users', 'birthday', 'update')
  and not has_column_privilege('authenticated', 'public.users', 'role', 'update')
  and not has_column_privilege('authenticated', 'public.users', 'subscription_status', 'update')
  and not has_column_privilege('authenticated', 'public.users', 'domain', 'update')
  and not has_column_privilege('authenticated', 'public.users', 'use_dental_brand', 'update'),
  'Authenticated users retain only the approved presentation-field update grants'
);
select lives_ok(
  $$ delete from public.settings where key = 'phase8-admin' $$,
  'Authenticated database admins can delete settings'
);

set local role service_role;
select lives_ok(
  $$ insert into public.settings(key, value) values ('phase8-service', 'allowed') $$,
  'Trusted service role retains its operational write boundary'
);
select lives_ok(
  $$ delete from public.settings where key = 'phase8-service' $$,
  'Trusted service role retains its operational delete boundary'
);

select ok(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.oid::regprocedure::text in ('handle_auth_user_deleted()', 'lowercase_username()', 'update_updated_at_column()', 'increment_click_counter(text,jsonb,text)')
     and coalesce(array_to_string(p.proconfig, ','), '') = 'search_path=""') = 4,
  'Advisor-flagged functions pin an empty search path'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','), '') <> 'search_path=""'
  ),
  'Every public/private SECURITY DEFINER function pins an empty search path'
);
select ok(
  exists (
    select 1
    from pg_default_acl defaults
    join pg_roles owner_role on owner_role.oid = defaults.defaclrole
    where owner_role.rolname = 'postgres'
      and defaults.defaclnamespace = 0
      and defaults.defaclobjtype = 'f'
      and not exists (
        select 1 from aclexplode(defaults.defaclacl) acl where acl.grantee = 0
      )
  )
  and not exists (
    select 1
    from pg_default_acl defaults
    join pg_roles owner_role on owner_role.oid = defaults.defaclrole
    join pg_namespace schema_name on schema_name.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) acl
    left join pg_roles granted_role on granted_role.oid = acl.grantee
    where owner_role.rolname = 'postgres'
      and schema_name.nspname in ('public', 'private')
      and defaults.defaclobjtype = 'f'
      and (acl.grantee = 0 or granted_role.rolname in ('anon', 'authenticated', 'service_role'))
  ),
  'New public/private functions do not receive PUBLIC EXECUTE by default'
);

select ok(
  not exists (
    select 1
    from (values
      ('private.assert_dashboard_media_plan(uuid)'::text),
      ('private.dashboard_media_path(text,text,uuid,text)'::text),
      ('private.enqueue_dashboard_media_cleanup(uuid,text,text)'::text),
      ('private.assert_dashboard_content_owner(uuid)'::text),
      ('private.dashboard_unique_blog_slug(text,bigint)'::text),
      ('private.assert_dashboard_location_owner(uuid)'::text),
      ('public.handle_auth_user_deleted()'::text),
      ('public.fn_audit_profile_change()'::text),
      ('public.fn_audit_write(uuid,text,text,text,jsonb,jsonb)'::text),
      ('public.fn_audit_socials()'::text),
      ('public.fn_audit_link_groups()'::text),
      ('public.fn_audit_dentistry_links()'::text),
      ('public.fn_audit_links()'::text),
      ('public.purge_profile_audit_log(integer)'::text)
    ) internal(function_name)
    cross join (values ('public'::name), ('anon'::name), ('authenticated'::name)) roles(role_name)
    where has_function_privilege(roles.role_name, internal.function_name, 'execute')
  ),
  'Private and audit helpers are not executable by public Data API roles'
);
select ok(
  has_function_privilege('service_role', 'private.assert_dashboard_media_plan(uuid)', 'execute')
  and has_function_privilege('service_role', 'public.purge_profile_audit_log(integer)', 'execute'),
  'Trusted service role retains internal operational helper access'
);
select ok(
  not has_function_privilege('public', 'public.increment_click_counter(text,jsonb,text)', 'execute')
  and has_function_privilege('anon', 'public.increment_click_counter(text,jsonb,text)', 'execute')
  and has_function_privilege('authenticated', 'public.increment_click_counter(text,jsonb,text)', 'execute')
  and not has_function_privilege('service_role', 'public.increment_click_counter(text,jsonb,text)', 'execute'),
  'Only anonymous and authenticated public click flows retain the RPC grant'
);
select ok(
  not has_function_privilege('anon', 'public.create_dentistry_treatment(uuid,text,text,boolean)', 'execute')
  and has_function_privilege('authenticated', 'public.create_dentistry_treatment(uuid,text,text,boolean)', 'execute')
  and has_function_privilege('service_role', 'public.create_dentistry_treatment(uuid,text,text,boolean)', 'execute'),
  'Phase 6 RPC grants remain unchanged'
);

select * from finish();
rollback;
