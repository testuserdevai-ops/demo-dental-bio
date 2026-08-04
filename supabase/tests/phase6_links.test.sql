begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000701'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000702'::uuid as other_id,
  '00000000-0000-0000-0000-000000000703'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000711'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000712'::uuid as other_dentistry_id
\gset

insert into public.users (id, email, username, role)
values
  (:'owner_id', 'link-owner@example.test', 'link-owner', 'user'),
  (:'other_id', 'link-other@example.test', 'link-other', 'user'),
  (:'admin_id', 'link-admin@example.test', 'link-admin', 'admin');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');

create function pg_temp.fail_link_join()
returns trigger
language plpgsql
as $$
begin
  if current_setting('phase6.fail_link_join', true) = 'on' then
    raise exception 'Injected link join failure';
  end if;
  return new;
end;
$$;

create trigger phase6_fail_link_join
before insert on public.dentistry_links
for each row execute function pg_temp.fail_link_join();

select has_function('public', 'create_link_group', array['uuid', 'text']);
select has_function('public', 'update_link_group', array['uuid', 'uuid', 'text']);
select has_function('public', 'delete_link_group', array['uuid', 'uuid']);
select has_function('public', 'reorder_link_groups', array['uuid', 'uuid[]']);
select has_function('public', 'create_dentistry_link', array['uuid', 'uuid', 'text', 'text']);
select has_function(
  'public',
  'update_dentistry_link',
  array['uuid', 'uuid', 'uuid', 'text', 'text', 'boolean']
);
select has_function('public', 'delete_dentistry_link', array['uuid', 'uuid', 'uuid']);
select has_function('public', 'reorder_dentistry_links', array['uuid', 'uuid', 'uuid[]']);

select ok(
  not has_function_privilege('anon', 'public.create_link_group(uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.update_link_group(uuid,uuid,text)', 'execute')
  and not has_function_privilege('anon', 'public.delete_link_group(uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.reorder_link_groups(uuid,uuid[])', 'execute')
  and not has_function_privilege('anon', 'public.create_dentistry_link(uuid,uuid,text,text)', 'execute')
  and not has_function_privilege('anon', 'public.update_dentistry_link(uuid,uuid,uuid,text,text,boolean)', 'execute')
  and not has_function_privilege('anon', 'public.delete_dentistry_link(uuid,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'public.reorder_dentistry_links(uuid,uuid,uuid[])', 'execute'),
  'Anonymous callers cannot execute link writes'
);
select col_is_unique(
  'public',
  'dentistry_links',
  'link_id',
  'A link entity belongs to exactly one group'
);
select has_index(
  'public',
  'link_groups',
  'link_groups_dentistry_rank_unique',
  'Group ranks have a scoped concurrency backstop'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.link_groups (dentistry_id, heading, rank)
     values ('00000000-0000-0000-0000-000000000711', 'Direct group', 1) $$,
  '42501',
  null,
  'Authenticated callers cannot directly insert link groups'
);
select throws_ok(
  $$ insert into public.links (title, link, is_active, rank)
     values ('Direct link', 'https://example.test', true, 1) $$,
  '42501',
  null,
  'Authenticated callers cannot directly insert links'
);
select throws_ok(
  $$ select * from public.create_link_group(
       '00000000-0000-0000-0000-000000000712', 'Cross-owner group'
     ) $$,
  '42501',
  null,
  'An owner cannot create a group for another profile'
);
select throws_ok(
  $$ select * from public.create_link_group(
       '00000000-0000-0000-0000-000000000799', 'Missing profile'
     ) $$,
  'P0002',
  null,
  'An unknown target fails closed'
);

select lives_ok(
  $$ select * from public.create_link_group(
       '00000000-0000-0000-0000-000000000711', 'Primary links'
     ) $$,
  'An owner can create a link group atomically'
);
select lives_ok(
  $$ select * from public.create_link_group(
       '00000000-0000-0000-0000-000000000711', 'Secondary links'
     ) $$,
  'A second group receives the next rank'
);
select link_group_id as first_group_id
from public.link_groups where heading = 'Primary links'
\gset
select link_group_id as second_group_id
from public.link_groups where heading = 'Secondary links'
\gset

select lives_ok(
  format(
    'select * from public.create_dentistry_link(%L,%L,%L,%L)',
    :'owner_dentistry_id', :'first_group_id', 'Website', 'https://example.test'
  ),
  'An owner can atomically create and join a link'
);
select lives_ok(
  format(
    'select * from public.create_dentistry_link(%L,%L,%L,%L)',
    :'owner_dentistry_id', :'first_group_id', 'Booking', 'https://example.test/book'
  ),
  'A second link receives the next group rank'
);
select link_id as first_link_id from public.links where title = 'Website'
\gset
select link_id as second_link_id from public.links where title = 'Booking'
\gset

select set_config('phase6.fail_link_join', 'on', true);
select throws_ok(
  format(
    'select * from public.create_dentistry_link(%L,%L,%L,%L)',
    :'owner_dentistry_id', :'first_group_id', 'Rolled back link', 'https://rollback.test'
  ),
  'P0001',
  'Injected link join failure',
  'A failed join aborts the link entity insert'
);
select set_config('phase6.fail_link_join', 'off', true);
select is(
  (select count(*)::integer from public.links where title = 'Rolled back link'),
  0,
  'A failed link create leaves no orphan entity'
);

select throws_ok(
  format(
    'select public.reorder_link_groups(%L,array[%L::uuid,%L::uuid])',
    :'owner_dentistry_id', :'first_group_id', :'first_group_id'
  ),
  '22023',
  null,
  'Duplicate group reorder IDs fail exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_link_groups(%L,array[%L::uuid])',
    :'owner_dentistry_id', :'first_group_id'
  ),
  '22023',
  null,
  'Omitted group reorder IDs fail exact-set validation'
);
select lives_ok(
  format(
    'select public.reorder_link_groups(%L,array[%L::uuid,%L::uuid])',
    :'owner_dentistry_id', :'second_group_id', :'first_group_id'
  ),
  'An exact group set persists its submitted order'
);
select results_eq(
  $$ select heading::text, rank from public.link_groups
     where dentistry_id = '00000000-0000-0000-0000-000000000711'
     order by rank $$,
  $$ values ('Secondary links'::text, 1), ('Primary links'::text, 2) $$,
  'Group order remains contiguous and one-based'
);

select throws_ok(
  format(
    'select public.reorder_dentistry_links(%L,%L,array[%L::uuid,%L::uuid])',
    :'owner_dentistry_id', :'first_group_id', :'first_link_id', :'first_link_id'
  ),
  '22023',
  null,
  'Duplicate link reorder IDs fail exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_dentistry_links(%L,%L,array[%L::uuid])',
    :'owner_dentistry_id', :'first_group_id', :'first_link_id'
  ),
  '22023',
  null,
  'Omitted link reorder IDs fail exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_dentistry_links(%L,%L,array[%L::uuid,%L::uuid])',
    :'owner_dentistry_id', :'first_group_id', :'first_link_id',
    '00000000-0000-0000-0000-000000000799'
  ),
  '22023',
  null,
  'Missing link reorder IDs fail exact-set validation'
);
select lives_ok(
  format(
    'select public.reorder_dentistry_links(%L,%L,array[%L::uuid,%L::uuid])',
    :'owner_dentistry_id', :'first_group_id', :'second_link_id', :'first_link_id'
  ),
  'An exact link set persists its submitted order'
);
select results_eq(
  format(
    $$ select links.title::text, links.rank
       from public.dentistry_links join public.links using (link_id)
       where dentistry_links.link_group_id = %L
       order by links.rank $$,
    :'first_group_id'
  ),
  $$ values ('Booking'::text, 1), ('Website'::text, 2) $$,
  'Link order remains contiguous and one-based within its group'
);

select lives_ok(
  format(
    'select * from public.update_dentistry_link(%L,%L,%L,%L,%L,%L)',
    :'owner_dentistry_id', :'first_group_id', :'first_link_id',
    'Updated website', 'https://example.test/updated', false
  ),
  'An owner can update and deactivate an owned link'
);
select is(
  (select is_active from public.links where link_id = :'first_link_id'),
  false,
  'The active state persists through the atomic link update'
);

select lives_ok(
  format(
    'select public.delete_dentistry_link(%L,%L,%L)',
    :'owner_dentistry_id', :'first_group_id', :'second_link_id'
  ),
  'An owner can delete one scoped link atomically'
);
select is(
  (select rank from public.links where link_id = :'first_link_id'),
  1,
  'Deleting a link compacts its group order'
);
select lives_ok(
  format(
    'select public.delete_link_group(%L,%L)',
    :'owner_dentistry_id', :'first_group_id'
  ),
  'Deleting a group removes its children atomically'
);
select is(
  (select count(*)::integer from public.links where link_id = :'first_link_id'),
  0,
  'Group deletion removes the orphaned link entity'
);
select is(
  (select rank from public.link_groups where link_group_id = :'second_group_id'),
  1,
  'Group deletion compacts the remaining group order'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select * from public.create_link_group(
       '00000000-0000-0000-0000-000000000712', 'Admin target links'
     ) $$,
  'An authorized admin can create for an existing target'
);

select * from finish();
rollback;
