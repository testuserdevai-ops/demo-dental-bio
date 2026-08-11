begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000b01'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000b02'::uuid as other_id,
  '00000000-0000-0000-0000-000000000b11'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000b12'::uuid as other_dentistry_id,
  '00000000-0000-0000-0000-000000000b21'::uuid as owner_group_id,
  '00000000-0000-0000-0000-000000000b22'::uuid as other_group_id
\gset

insert into public.users (id, email, username, role)
values
  (:'owner_id', 'link-media-owner@example.test', 'link-media-owner', 'user'),
  (:'other_id', 'link-media-other@example.test', 'link-media-other', 'user');
insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');
insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
values
  (:'owner_group_id', :'owner_dentistry_id', 'Owner links', 1),
  (:'other_group_id', :'other_dentistry_id', 'Other links', 1);
insert into storage.objects (bucket_id, name, owner_id)
values
  ('link-images', :'owner_id' || '/links/owner.webp', :'owner_id'),
  ('link-images', :'other_id' || '/links/other.webp', :'other_id');

select has_column('public', 'links', 'image_url', 'Links persist an owned image URL');
select has_column('public', 'links', 'image_variant', 'Links persist a controlled image variant');
select has_column('public', 'links', 'image_alt', 'Links persist bounded informative alt text');
select has_column('public', 'links', 'image_decorative', 'Links persist an explicit decorative choice');
select has_column('public', 'links', 'is_featured', 'Links persist featured emphasis');
select has_function(
  'public', 'create_dentistry_link_with_media',
  array['uuid','uuid','text','text','text','text','text','boolean','boolean']
);
select has_function(
  'public', 'update_dentistry_link_with_media',
  array['uuid','uuid','uuid','text','text','boolean','text','text','text','boolean','boolean']
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_dentistry_link_with_media(uuid,uuid,text,text,text,text,text,boolean,boolean)',
    'execute'
  ),
  'Anonymous callers cannot write link media'
);
select is(
  (select public from storage.buckets where id = 'link-images'),
  true,
  'Link images are publicly downloadable'
);
select is(
  (select file_size_limit from storage.buckets where id = 'link-images'),
  6291456::bigint,
  'The bucket enforces the six-megabyte server limit'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"iss":"https://storage.test/auth/v1"}', true);

select is(
  (select count(*)::integer from storage.objects where bucket_id = 'link-images'),
  1,
  'Storage metadata selection is owner scoped even though downloads are public'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'link-images',
       '00000000-0000-0000-0000-000000000b02/links/forged.webp',
       '00000000-0000-0000-0000-000000000b01'
     ) $$,
  '42501', null,
  'An owner cannot upload into another profile path'
);
select throws_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b12',
    '00000000-0000-0000-0000-000000000b22',
    'Forged', 'https://example.test/forged', null, 'none', null, true, false
  ) $$,
  '42501', null,
  'An owner cannot add link presentation to another profile'
);
select throws_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b11',
    '00000000-0000-0000-0000-000000000b21',
    'Unsafe alt', 'https://example.test/unsafe',
    'https://storage.test/storage/v1/object/public/link-images/00000000-0000-0000-0000-000000000b01/links/owner.webp',
    'small-icon', null, false, false
  ) $$,
  '22023', null,
  'Informative link images require bounded owner-provided alt text'
);

select lives_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b11',
    '00000000-0000-0000-0000-000000000b21',
    'Small icon', 'https://example.test/icon',
    'https://storage.test/storage/v1/object/public/link-images/00000000-0000-0000-0000-000000000b01/links/owner.webp',
    'small-icon', 'Calendar icon', false, true
  ) $$,
  'An owner can save an informative small-icon link'
);
select lives_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b11',
    '00000000-0000-0000-0000-000000000b21',
    'Large image', 'https://example.test/large',
    'https://storage.test/storage/v1/object/public/link-images/00000000-0000-0000-0000-000000000b01/links/owner.webp',
    'large-image', null, true, true
  ) $$,
  'An owner can save a decorative large-image link'
);
select lives_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b11',
    '00000000-0000-0000-0000-000000000b21',
    'Text only', 'https://example.test/text', null, 'none', null, true, true
  ) $$,
  'Featured styling is independent from the image variant'
);
select throws_ok(
  $$ select * from public.create_dentistry_link_with_media(
    '00000000-0000-0000-0000-000000000b11',
    '00000000-0000-0000-0000-000000000b21',
    'Fourth feature', 'https://example.test/fourth', null, 'none', null, true, true
  ) $$,
  '22023', 'A link group can feature at most three links',
  'The database enforces at most three featured links per group'
);
select results_eq(
  $$ select links.title::text, links.image_variant::text, links.image_alt::text,
       links.image_decorative, links.is_featured
     from public.links join public.dentistry_links using (link_id)
     where dentistry_links.link_group_id = '00000000-0000-0000-0000-000000000b21'
     order by links.rank $$,
  $$ values
    ('Small icon'::text, 'small-icon'::text, 'Calendar icon'::text, false, true),
    ('Large image'::text, 'large-image'::text, null::text, true, true),
    ('Text only'::text, 'none'::text, null::text, true, true) $$,
  'Both variants and the text fallback persist with coherent alt policy'
);
select link_id as media_link_id from public.links
where title = 'Small icon' \gset
select lives_ok(
  format(
    'select public.delete_dentistry_link(%L,%L,%L)',
    :'owner_dentistry_id', :'owner_group_id', :'media_link_id'
  ),
  'Deleting a media link keeps object cleanup inside the authorized mutation'
);
set local role postgres;
select is(
  (
    select count(*)::integer from private.dashboard_media_cleanup_jobs
    where user_id = :'owner_id' and bucket = 'link-images'
      and object_path = :'owner_id' || '/links/owner.webp'
      and completed_at is null
  ),
  1,
  'Deleting a link enqueues its superseded Storage object exactly once'
);

select * from finish();
rollback;
