begin;

select no_plan();

select
  '00000000-0000-4000-8000-00000000c101'::uuid as owner_id,
  '00000000-0000-4000-8000-00000000c102'::uuid as dentistry_id,
  '00000000-0000-4000-8000-00000000c103'::uuid as link_group_id,
  '00000000-0000-4000-8000-00000000c104'::uuid as public_link_id,
  '00000000-0000-4000-8000-00000000c105'::uuid as private_link_id
\gset

select has_function(
  'public',
  'increment_click_counter',
  array['text', 'jsonb', 'text'],
  'The click RPC has one PostgREST-compatible mixed-identifier boundary'
);
select ok(
  to_regprocedure('public.increment_click_counter(text,bigint,text)') is null,
  'The broken bigint-only signature is removed'
);
select ok(
  not has_function_privilege(
    'public',
    'public.increment_click_counter(text,jsonb,text)',
    'execute'
  )
  and has_function_privilege(
    'anon',
    'public.increment_click_counter(text,jsonb,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.increment_click_counter(text,jsonb,text)',
    'execute'
  )
  and not has_function_privilege(
    'service_role',
    'public.increment_click_counter(text,jsonb,text)',
    'execute'
  ),
  'Only public-profile caller roles can execute the definer RPC'
);
select ok(
  (
    select p.prosecdef
      and coalesce(array_to_string(p.proconfig, ','), '') = 'search_path=""'
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.increment_click_counter(text,jsonb,text)'::regprocedure
  ),
  'The fixed-table function pins an empty search path'
);

set local role service_role;
insert into public.users (id, email, username)
values (:'owner_id', 'click-counter-owner@example.test', 'click-counter-owner');
insert into public.dentistries (dentistry_id, user_id)
values (:'dentistry_id', :'owner_id');
insert into public.blog_groups (id, user_id, name, enabled)
overriding system value
values
  (990101, :'owner_id', 'Public click blogs', true),
  (990102, :'owner_id', 'Disabled click blogs', false);
insert into public.blogs (id, title, content, slug, group_id, enabled, click_counter)
overriding system value
values
  (990101, 'Public blog', 'Body', 'public-click-blog', 990101, true, 4),
  (990102, 'Private blog', 'Body', 'private-click-blog', 990102, true, 9);
insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
values (:'link_group_id', :'dentistry_id', 'Public click links', 1);
insert into public.links (link_id, title, link, is_active, rank, click_counter)
values
  (:'public_link_id', 'Public link', 'https://example.test/public', true, 1, 7),
  (:'private_link_id', 'Private link', 'https://example.test/private', false, 2, 11);
insert into public.dentistry_links (link_group_id, link_id)
values
  (:'link_group_id', :'public_link_id'),
  (:'link_group_id', :'private_link_id');

set local role anon;
select results_eq(
  $$ select public.increment_click_counter('blogs', '990101'::jsonb) $$,
  $$ values (5::integer) $$,
  'Anonymous public-profile traffic atomically increments a numeric blog ID'
);
select results_eq(
  format(
    $$ select public.increment_click_counter('links', to_jsonb(%L::text)) $$,
    :'public_link_id'
  ),
  $$ values (8::integer) $$,
  'Anonymous public-profile traffic atomically increments a UUID link ID'
);
select results_eq(
  $$ select public.increment_click_counter('blogs', '990102'::jsonb) $$,
  $$ values (null::integer) $$,
  'A blog outside the enabled public-profile boundary is not incremented'
);
select results_eq(
  format(
    $$ select public.increment_click_counter('links', to_jsonb(%L::text)) $$,
    :'private_link_id'
  ),
  $$ values (null::integer) $$,
  'An inactive link outside the public-profile boundary is not incremented'
);
select throws_ok(
  $$ select public.increment_click_counter('users', '990101'::jsonb) $$,
  '22023',
  'Invalid click-counter table',
  'The table selector rejects every non-whitelisted relation'
);
select throws_ok(
  $$ select public.increment_click_counter(null, '990101'::jsonb) $$,
  '22023',
  'Invalid click-counter table',
  'A missing table selector cannot fall through to a relation branch'
);
select throws_ok(
  $$ select public.increment_click_counter('blogs', to_jsonb('990101'::text)) $$,
  '22023',
  'Invalid blog identifier',
  'Blog IDs must arrive as JSON numbers'
);
select throws_ok(
  $$ select public.increment_click_counter('blogs', null) $$,
  '22023',
  'Invalid blog identifier',
  'A missing blog identifier is rejected'
);
select throws_ok(
  $$ select public.increment_click_counter('links', to_jsonb('not-a-uuid'::text)) $$,
  '22023',
  'Invalid link identifier',
  'Link IDs must arrive as valid UUID strings'
);

set local role service_role;
select results_eq(
  $$ select click_counter from public.blogs where id = 990102 $$,
  $$ values (9::integer) $$,
  'Rejected blog traffic leaves the stored counter unchanged'
);
select results_eq(
  format($$ select click_counter from public.links where link_id = %L::uuid $$, :'private_link_id'),
  $$ values (11::integer) $$,
  'Rejected link traffic leaves the stored counter unchanged'
);

select * from finish();
rollback;
