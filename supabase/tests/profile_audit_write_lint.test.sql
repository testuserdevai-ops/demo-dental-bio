begin;

select plan(10);

select
  '00000000-0000-0000-0000-000000000851'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000852'::uuid as dentistry_id,
  '00000000-0000-0000-0000-000000000853'::uuid as link_group_id,
  '00000000-0000-0000-0000-000000000854'::uuid as link_id,
  '00000000-0000-0000-0000-000000000855'::uuid as dentistry_link_id
\gset

select ok(
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260817204018'
  ),
  'The typed audit-writer migration is applied'
);

set local role service_role;

insert into public.users (id, email, username)
values (:'owner_id', 'audit-writer@example.test', 'audit-writer');

insert into public.dentistries (
  dentistry_id,
  user_id,
  about_title
)
values (:'dentistry_id', :'owner_id', 'Original profile');

insert into public.link_groups (
  link_group_id,
  dentistry_id,
  heading,
  rank
)
values (:'link_group_id', :'dentistry_id', 'Resources', 1);

insert into public.links (link_id, title, link, rank, click_counter)
values (:'link_id', 'Original resource', 'https://example.test/original', 1, 0);

insert into public.dentistry_links (
  dentistry_links_id,
  link_group_id,
  link_id
)
values (:'dentistry_link_id', :'link_group_id', :'link_id');

delete from public.profile_audit_log where user_id = :'owner_id';

update public.dentistries
set about_title = 'Updated profile'
where dentistry_id = :'dentistry_id';

update public.links
set title = 'Updated resource'
where link_id = :'link_id';

select is(
  (
    select count(*)::bigint
    from public.profile_audit_log
    where user_id = :'owner_id'
  ),
  2::bigint,
  'Representative direct and indirect updates each produce one audit row'
);

select is(
  (
    select changed_keys
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'dentistries'
      and operation = 'UPDATE'
  ),
  array['about_title']::text[],
  'The direct trigger records only the changed dentistry key'
);

select is(
  (
    select old_values ->> 'about_title'
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'dentistries'
      and operation = 'UPDATE'
  ),
  'Original profile',
  'The direct trigger preserves the previous value'
);

select is(
  (
    select new_values ->> 'about_title'
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'dentistries'
      and operation = 'UPDATE'
  ),
  'Updated profile',
  'The direct trigger preserves the new value'
);

select is(
  (
    select changed_keys
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'links'
      and operation = 'UPDATE'
  ),
  array['title']::text[],
  'The indirect link trigger records only the changed link key'
);

select is(
  (
    select old_values ->> 'title'
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'links'
      and operation = 'UPDATE'
  ),
  'Original resource',
  'The indirect trigger preserves the previous value'
);

select is(
  (
    select new_values ->> 'title'
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'links'
      and operation = 'UPDATE'
  ),
  'Updated resource',
  'The indirect trigger preserves the new value'
);

update public.links
set click_counter = click_counter + 1
where link_id = :'link_id';

select is(
  (
    select count(*)::bigint
    from public.profile_audit_log
    where user_id = :'owner_id'
  ),
  2::bigint,
  'A click-counter-only update remains excluded from profile audit history'
);

select is(
  (
    select actor_role
    from public.profile_audit_log
    where user_id = :'owner_id'
      and table_name = 'links'
      and operation = 'UPDATE'
  ),
  'system',
  'Service-role trigger writes retain the existing system actor classification'
);

select * from finish();
rollback;
