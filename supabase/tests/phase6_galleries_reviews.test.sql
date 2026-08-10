begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000901'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000902'::uuid as other_id,
  '00000000-0000-0000-0000-000000000903'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000904'::uuid as trial_id
\gset

insert into public.users (id, email, username, role, subscription_status)
values
  (:'owner_id', 'media-owner@example.test', 'media-owner', 'user', 'PRO'),
  (:'other_id', 'media-other@example.test', 'media-other', 'user', 'PRO'),
  (:'admin_id', 'media-admin@example.test', 'media-admin', 'admin', 'PRO'),
  (:'trial_id', 'media-trial@example.test', 'media-trial', 'user', null);
update public.users set trial_end = now() + interval '1 day' where id = :'trial_id';

select has_function('public', 'create_dashboard_gallery', array['uuid','text','text','text','text','text']);
select has_function('public', 'reorder_dashboard_galleries', array['uuid','bigint[]']);
select has_function('public', 'create_dashboard_general_gallery', array['uuid','text','text']);
select has_function('public', 'create_dashboard_review', array['uuid','text','text','smallint','text','text','timestamp with time zone']);
select has_function('public', 'reorder_dashboard_reviews', array['uuid','bigint[]']);
select has_function('public', 'save_dashboard_external_review_page', array['uuid','text']);
select col_is_unique(
  'public', 'external_review_pages', 'user_id',
  'A profile has one external review page'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_dashboard_gallery(uuid,text,text,text,text,text)',
    'execute'
  ) and not has_function_privilege(
    'anon',
    'public.create_dashboard_review(uuid,text,text,smallint,text,text,timestamp with time zone)',
    'execute'
  ),
  'Anonymous callers cannot execute gallery or review writes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.galleries (user_id, title)
     values ('00000000-0000-0000-0000-000000000901', 'Direct') $$,
  '42501', null,
  'Authenticated callers cannot bypass the gallery function boundary'
);
select throws_ok(
  $$ insert into public.reviews (user_id, reviewer_name)
     values ('00000000-0000-0000-0000-000000000901', 'Direct') $$,
  '42501', null,
  'Authenticated callers cannot bypass the review function boundary'
);
select throws_ok(
  $$ select * from public.create_dashboard_gallery(
    '00000000-0000-0000-0000-000000000902', 'Forged',
    'https://example.test/before.webp', 'https://example.test/after.webp',
    'Before', 'After'
  ) $$,
  '42501', null,
  'An owner cannot create a gallery for another profile'
);
select throws_ok(
  $$ select * from public.create_dashboard_review(
    '00000000-0000-0000-0000-000000000902', 'Forged', 'Content', 5::smallint,
    '', 'Google', now()
  ) $$,
  '42501', null,
  'An owner cannot create a review for another profile'
);
select throws_ok(
  $$ select * from public.create_dashboard_gallery(
    '00000000-0000-0000-0000-000000000901', 'Unsafe case',
    'javascript:alert(1)', 'https://example.test/after.webp',
    'Before', 'After'
  ) $$,
  '22023', null,
  'The database boundary rejects unsafe media URLs'
);

select lives_ok(
  $$ select * from public.create_dashboard_gallery(
    '00000000-0000-0000-0000-000000000901', 'First case',
    'https://example.test/before-1.webp', 'https://example.test/after-1.webp',
    'Before', 'After'
  ) $$,
  'An owner creates a dental gallery'
);
select lives_ok(
  $$ select * from public.create_dashboard_gallery(
    '00000000-0000-0000-0000-000000000901', 'Second case',
    'https://example.test/before-2.webp', 'https://example.test/after-2.webp',
    'Before', 'After'
  ) $$,
  'A second dental gallery receives the next rank'
);
select id as first_gallery_id from public.galleries where title = 'First case' \gset
select id as second_gallery_id from public.galleries where title = 'Second case' \gset
select results_eq(
  $$ select title::text, rank from public.galleries
     where user_id = '00000000-0000-0000-0000-000000000901'
     order by rank $$,
  $$ values ('First case'::text, 1), ('Second case'::text, 2) $$,
  'Gallery create assigns exact one-based ranks'
);
select throws_ok(
  format(
    'select public.reorder_dashboard_galleries(%L,array[%s::bigint,%s::bigint])',
    :'owner_id', :'first_gallery_id', :'first_gallery_id'
  ),
  '22023', null,
  'Duplicate gallery reorder IDs fail exact-set validation'
);
select throws_ok(
  $$ select public.reorder_dashboard_galleries(
    '00000000-0000-0000-0000-000000000901', null
  ) $$,
  '22023', null,
  'A null gallery order fails closed at the database boundary'
);
select lives_ok(
  format(
    'select public.reorder_dashboard_galleries(%L,array[%s::bigint,%s::bigint])',
    :'owner_id', :'second_gallery_id', :'first_gallery_id'
  ),
  'An owner can reorder the exact gallery set'
);
select results_eq(
  $$ select title::text, rank from public.galleries
     where user_id = '00000000-0000-0000-0000-000000000901'
     order by rank $$,
  $$ values ('Second case'::text, 1), ('First case'::text, 2) $$,
  'Gallery reorder persists exact one-based ranks'
);
select lives_ok(
  format(
    'select * from public.delete_dashboard_gallery(%L,%s::bigint)',
    :'owner_id', :'second_gallery_id'
  ),
  'Gallery delete commits inside the ordered collection lock'
);
select results_eq(
  $$ select title::text, rank from public.galleries
     where user_id = '00000000-0000-0000-0000-000000000901' $$,
  $$ values ('First case'::text, 1) $$,
  'Gallery delete compacts the remaining one-based ranks'
);

select lives_ok(
  $$ select * from public.create_dashboard_general_gallery(
    '00000000-0000-0000-0000-000000000901', 'Practice',
    'https://example.test/practice.webp'
  ) $$,
  'An owner creates a general gallery'
);
select lives_ok(
  $$ select * from public.create_dashboard_review(
    '00000000-0000-0000-0000-000000000901', 'Patient A', 'Excellent care', 5::smallint,
    '', 'Google', now()
  ) $$,
  'An owner creates a review'
);
select lives_ok(
  $$ select * from public.create_dashboard_review(
    '00000000-0000-0000-0000-000000000901', 'Patient B', 'Very helpful', 4::smallint,
    '', 'Google', now()
  ) $$,
  'A second review receives the next rank'
);
select id as first_review_id from public.reviews where reviewer_name = 'Patient A' \gset
select id as second_review_id from public.reviews where reviewer_name = 'Patient B' \gset
select throws_ok(
  format(
    'select public.reorder_dashboard_reviews(%L,array[%s::bigint])',
    :'owner_id', :'first_review_id'
  ),
  '22023', null,
  'An incomplete review order fails exact-set validation'
);
select lives_ok(
  format(
    'select public.reorder_dashboard_reviews(%L,array[%s::bigint,%s::bigint])',
    :'owner_id', :'second_review_id', :'first_review_id'
  ),
  'An owner can reorder the exact review set'
);
select lives_ok(
  format(
    'select * from public.delete_dashboard_review(%L,%s::bigint)',
    :'owner_id', :'second_review_id'
  ),
  'Review delete commits inside the ordered collection lock'
);
select results_eq(
  $$ select reviewer_name::text, rank from public.reviews
     where user_id = '00000000-0000-0000-0000-000000000901' $$,
  $$ values ('Patient A'::text, 1::smallint) $$,
  'Review delete compacts the remaining one-based ranks'
);
select lives_ok(
  $$ select * from public.save_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000901', 'https://example.test/reviews'
  ) $$,
  'An owner creates an external review page'
);
select lives_ok(
  $$ select * from public.save_dashboard_external_review_page(
    '00000000-0000-0000-0000-000000000901', 'https://example.test/reviews/latest'
  ) $$,
  'A second external-page save updates instead of duplicating'
);
select is(
  (select count(*)::integer from public.external_review_pages
   where user_id = :'owner_id'),
  1,
  'External-page save preserves the one-row invariant'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'gallery-images',
       '00000000-0000-0000-0000-000000000901/gallery/owned.webp',
       '00000000-0000-0000-0000-000000000901'
     ) $$,
  'An owner can upload inside the owned gallery folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'review-images',
       '00000000-0000-0000-0000-000000000902/review/forged.webp',
       '00000000-0000-0000-0000-000000000901'
     ) $$,
  '42501', null,
  'An owner cannot upload inside another review folder'
);

select set_config('request.jwt.claim.sub', :'trial_id', true);
select lives_ok(
  $$ select * from public.create_dashboard_general_gallery(
    '00000000-0000-0000-0000-000000000904', 'Trial gallery',
    'https://example.test/trial.webp'
  ) $$,
  'An active trial preserves premium gallery creation behavior'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);
select lives_ok(
  $$ select * from public.create_dashboard_review(
    '00000000-0000-0000-0000-000000000902', 'Admin review', 'Managed', 5::smallint,
    '', 'Google', now()
  ) $$,
  'A secured admin can create for an explicit target'
);

select * from finish();
rollback;
