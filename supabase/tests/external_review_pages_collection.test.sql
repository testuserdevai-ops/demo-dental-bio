begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000a01'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000a02'::uuid as other_id,
  '00000000-0000-0000-0000-000000000a03'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000a04'::uuid as expired_id
\gset

insert into public.users (id, email, username, role, subscription_status)
values
  (:'owner_id', 'external-pages-owner@example.test', 'external-pages-owner', 'user', 'PRO'),
  (:'other_id', 'external-pages-other@example.test', 'external-pages-other', 'user', 'PRO'),
  (:'admin_id', 'external-pages-admin@example.test', 'external-pages-admin', 'admin', 'PRO'),
  (:'expired_id', 'external-pages-expired@example.test', 'external-pages-expired', 'user', null);

select has_function('public', 'create_dashboard_external_review_page', array['uuid','text']);
select has_function('public', 'update_dashboard_external_review_page', array['uuid','bigint','text','boolean']);
select has_function('public', 'delete_dashboard_external_review_page', array['uuid','bigint']);
select has_function('public', 'reorder_dashboard_external_review_pages', array['uuid','bigint[]']);
select hasnt_function('public', 'save_dashboard_external_review_page', array['uuid','text']);
select col_not_null('public', 'external_review_pages', 'rank', 'External page rank is required');
select col_not_null('public', 'external_review_pages', 'enabled', 'External page visibility is required');
select ok(
  not has_function_privilege(
    'anon',
    'public.create_dashboard_external_review_page(uuid,text)',
    'execute'
  ) and has_function_privilege(
    'authenticated',
    'public.create_dashboard_external_review_page(uuid,text)',
    'execute'
  ),
  'Only authenticated callers can execute collection mutations'
);
select ok(
  has_function_privilege(
    'service_role',
    'private.is_safe_external_review_page_url(text)',
    'execute'
  ),
  'Service-role seed and maintenance writes can evaluate the URL check'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a02',
    'https://other.reviews.test/profile'
  ) $$,
  'An admin can create for an explicit target'
);
select id as other_page_id
from public.external_review_pages
where user_id = :'other_id'
\gset

select set_config('request.jwt.claim.sub', :'owner_id', true);
select throws_ok(
  $$ insert into public.external_review_pages (user_id, link, rank, enabled)
     values (
       '00000000-0000-0000-0000-000000000a01',
       'https://direct.reviews.test', 1, true
     ) $$,
  '42501', null,
  'Owners cannot bypass the RPC mutation boundary'
);
select throws_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a02',
    'https://forged.reviews.test'
  ) $$,
  '42501', null,
  'An owner cannot create for another profile'
);
select throws_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a01',
    'http://unsafe.reviews.test'
  ) $$,
  '22023', null,
  'HTTP destinations fail closed'
);
select throws_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a01',
    'https://user:secret@unsafe.reviews.test'
  ) $$,
  '22023', null,
  'Credential-bearing destinations fail closed'
);
select throws_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a01',
    E'https://unsafe.reviews.test/line\nbreak'
  ) $$,
  '22023', null,
  'Control characters fail closed'
);

select lives_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a01',
    'https://first.reviews.test/profile'
  ) $$,
  'An owner creates the first external review page'
);
select lives_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a01',
    'https://second.reviews.test/profile'
  ) $$,
  'An owner creates a second external review page'
);
select id as first_page_id
from public.external_review_pages
where user_id = :'owner_id' and link like 'https://first.%'
\gset
select id as second_page_id
from public.external_review_pages
where user_id = :'owner_id' and link like 'https://second.%'
\gset

select results_eq(
  $$ select link::text, rank, enabled
     from public.external_review_pages
     where user_id = '00000000-0000-0000-0000-000000000a01'
     order by rank, id $$,
  $$ values
    ('https://first.reviews.test/profile'::text, 1, true),
    ('https://second.reviews.test/profile'::text, 2, true) $$,
  'Creates append exact one-based ranks without replacing prior rows'
);
select throws_ok(
  format(
    'select * from public.update_dashboard_external_review_page(%L,%s::bigint,%L,true)',
    :'owner_id', :'other_page_id', 'https://forged.reviews.test/profile'
  ),
  'P0002', null,
  'An owner cannot update another profile page by immutable ID'
);
select lives_ok(
  format(
    'select * from public.update_dashboard_external_review_page(%L,%s::bigint,%L,false)',
    :'owner_id', :'first_page_id', 'https://first.reviews.test/updated'
  ),
  'An owner edits and disables an owned page'
);
select throws_ok(
  format(
    'select public.reorder_dashboard_external_review_pages(%L,array[%s::bigint])',
    :'owner_id', :'first_page_id'
  ),
  '22023', null,
  'An incomplete reorder fails exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_dashboard_external_review_pages(%L,array[%s::bigint,%s::bigint])',
    :'owner_id', :'first_page_id', :'first_page_id'
  ),
  '22023', null,
  'Duplicate reorder IDs fail exact-set validation'
);
select lives_ok(
  format(
    'select public.reorder_dashboard_external_review_pages(%L,array[%s::bigint,%s::bigint])',
    :'owner_id', :'second_page_id', :'first_page_id'
  ),
  'An owner reorders the complete enabled and disabled collection'
);
select results_eq(
  $$ select id, rank from public.external_review_pages
     where user_id = '00000000-0000-0000-0000-000000000a01'
     order by rank $$,
  format(
    $$ values (%s::bigint, 1), (%s::bigint, 2) $$,
    :'second_page_id', :'first_page_id'
  ),
  'Reorder persists exact one-based ranks'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select results_eq(
  $$ select link::text from public.external_review_pages
     where user_id = '00000000-0000-0000-0000-000000000a01'
     order by rank $$,
  $$ values ('https://second.reviews.test/profile'::text) $$,
  'Anonymous reads expose every enabled page and hide disabled pages'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select count(*)::integer from public.external_review_pages where user_id = :'owner_id'),
  2,
  'An owner can manage enabled and disabled pages'
);
select lives_ok(
  format(
    'select * from public.delete_dashboard_external_review_page(%L,%s::bigint)',
    :'owner_id', :'second_page_id'
  ),
  'An owner deletes an owned page'
);
select results_eq(
  $$ select id, rank, enabled from public.external_review_pages
     where user_id = '00000000-0000-0000-0000-000000000a01' $$,
  format(
    $$ values (%s::bigint, 1, false) $$,
    :'first_page_id'
  ),
  'Delete compacts remaining ranks and preserves visibility state'
);
select throws_ok(
  format(
    'select * from public.delete_dashboard_external_review_page(%L,%s::bigint)',
    :'owner_id', :'other_page_id'
  ),
  'P0002', null,
  'An owner cannot delete another profile page by immutable ID'
);

select set_config('request.jwt.claim.sub', :'expired_id', true);
select throws_ok(
  $$ select * from public.create_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000a04',
    'https://expired.reviews.test/profile'
  ) $$,
  '42501', null,
  'An expired profile cannot mutate external review pages'
);

select * from finish();
rollback;
