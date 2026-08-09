begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000801'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000802'::uuid as other_id,
  '00000000-0000-0000-0000-000000000803'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000811'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000812'::uuid as other_dentistry_id
\gset

insert into public.users (id, email, username, role)
values
  (:'owner_id', 'profile-owner@example.test', 'profile-owner', 'user'),
  (:'other_id', 'profile-other@example.test', 'profile-other', 'user'),
  (:'admin_id', 'profile-admin@example.test', 'profile-admin', 'admin');
insert into public.dentistries (dentistry_id, user_id, about_title)
values
  (:'owner_dentistry_id', :'owner_id', 'Owner'),
  (:'other_dentistry_id', :'other_id', 'Other');
insert into storage.buckets (id, name, public)
values ('profile-pics', 'profile-pics', true)
on conflict (id) do nothing;

select has_function(
  'public', 'save_dashboard_profile',
  array['uuid','uuid','text','text','text','text','text','text','text','text','text','text','boolean']
);
select has_function(
  'public', 'save_dashboard_socials',
  array['uuid','text','text','text','text','text','text']
);
select col_is_unique(
  'public', 'socials', 'dentistry_id',
  'A dentistry has one social record'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.save_dashboard_profile(uuid,uuid,text,text,text,text,text,text,text,text,text,text,boolean)',
    'execute'
  ) and not has_function_privilege(
    'anon',
    'public.save_dashboard_socials(uuid,text,text,text,text,text,text)',
    'execute'
  ),
  'Anonymous callers cannot execute profile writes'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.socials (dentistry_id) values
     ('00000000-0000-0000-0000-000000000811') $$,
  '42501', null,
  'Authenticated callers cannot bypass the social Action boundary'
);
select throws_ok(
  $$ select public.save_dashboard_profile(
    '00000000-0000-0000-0000-000000000802',
    '00000000-0000-0000-0000-000000000812',
    '', '', '', '', 'Forged', '', '', '', '', '', false
  ) $$,
  '42501', null,
  'An owner cannot update another profile'
);
select throws_ok(
  $$ select * from public.save_dashboard_socials(
    '00000000-0000-0000-0000-000000000812', '', '', '', '', '', ''
  ) $$,
  '42501', null,
  'An owner cannot update another social record'
);

select lives_ok(
  $$ select public.save_dashboard_profile(
    '00000000-0000-0000-0000-000000000801',
    '00000000-0000-0000-0000-000000000811',
    'Dr', 'Dentist', 'GDC 1', 'BDS', 'Owner profile', 'About',
    '+44 20 1234', 'owner@example.test', 'https://example.test',
    'https://example.test/book', true
  ) $$,
  'An owner saves user and dentistry presentation fields atomically'
);
select results_eq(
  $$ select users.title::text, users.position::text, dentistries.about_title::text,
            dentistries.booking_link_enabled
     from public.users join public.dentistries on dentistries.user_id = users.id
     where users.id = '00000000-0000-0000-0000-000000000801' $$,
  $$ values ('Dr'::text, 'Dentist'::text, 'Owner profile'::text, true) $$,
  'Only submitted profile presentation data is persisted'
);
select lives_ok(
  $$ select * from public.save_dashboard_socials(
    '00000000-0000-0000-0000-000000000811',
    'https://www.linkedin.com/in/profileowner',
    'https://x.com/profileowner', 'https://instagram.com/profileowner',
    '', '', 'https://example.test/social'
  ) $$,
  'An owner creates the single social record'
);
select lives_ok(
  $$ select * from public.save_dashboard_socials(
    '00000000-0000-0000-0000-000000000811', '', '', '', '', '', ''
  ) $$,
  'A second social save updates rather than duplicates the record'
);
select is(
  (select count(*)::integer from public.socials
   where dentistry_id = :'owner_dentistry_id'),
  1,
  'Social upsert preserves the one-row invariant'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'profile-pics',
       '00000000-0000-0000-0000-000000000811/profile-pic-owner.webp',
       '00000000-0000-0000-0000-000000000801'
     ) $$,
  'An owner can upload inside the owned dentistry folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'profile-pics',
       '00000000-0000-0000-0000-000000000812/profile-pic-forged.webp',
       '00000000-0000-0000-0000-000000000801'
     ) $$,
  '42501', null,
  'An owner cannot upload inside another dentistry folder'
);

select set_config('request.jwt.claim.sub', :'admin_id', true);
select lives_ok(
  $$ select public.save_dashboard_profile(
    '00000000-0000-0000-0000-000000000802',
    '00000000-0000-0000-0000-000000000812',
    '', '', '', '', 'Admin update', '', '', '', '', '', false
  ) $$,
  'A secured admin can update an explicit target'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values (
       'profile-pics',
       '00000000-0000-0000-0000-000000000812/profile-pic-admin.webp',
       '00000000-0000-0000-0000-000000000803'
     ) $$,
  'A secured admin can upload inside the explicit dentistry folder'
);

select * from finish();
rollback;
