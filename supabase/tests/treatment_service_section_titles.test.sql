begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000a01'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000a02'::uuid as other_id,
  '00000000-0000-0000-0000-000000000a03'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000a11'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000a12'::uuid as other_dentistry_id,
  '00000000-0000-0000-0000-000000000a13'::uuid as admin_dentistry_id
\gset

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260816201715'
  ),
  'Treatment and service section-title migration is applied'
);

select has_function(
  'public',
  'save_treatment_service_section_titles',
  array['uuid', 'text', 'text'],
  'Section titles have one restricted atomic write boundary'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.save_treatment_service_section_titles(uuid,text,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.save_treatment_service_section_titles(uuid,text,text)',
    'execute'
  ),
  'Only authenticated callers can invoke the section-title write boundary'
);

set local role service_role;
insert into public.users (id, email, username, role)
values
  (:'owner_id', 'section-title-owner@example.test', 'section-title-owner', 'user'),
  (:'other_id', 'section-title-other@example.test', 'section-title-other', 'user'),
  (:'admin_id', 'section-title-admin@example.test', 'section-title-admin', 'admin');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id'),
  (:'admin_dentistry_id', :'admin_id');

select results_eq(
  $$
    select treatment_section_title, service_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000a01'::uuid
  $$,
  $$ values ('Treatments'::text, 'Services'::text) $$,
  'Legacy and new profiles receive stable public defaults'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select treatment_section_title, service_section_title
    from public.save_treatment_service_section_titles(
      '00000000-0000-0000-0000-000000000a11'::uuid,
      '  Smile treatments  ',
      'Patient services'
    )
  $$,
  $$ values ('Smile treatments'::text, 'Patient services'::text) $$,
  'An owner can atomically save trimmed section titles'
);

select results_eq(
  $$
    select treatment_section_title, service_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000a01'::uuid
  $$,
  $$ values ('Smile treatments'::text, 'Patient services'::text) $$,
  'Dentistry changes synchronize immediately to the public projection'
);

select throws_ok(
  $$
    select * from public.save_treatment_service_section_titles(
      '00000000-0000-0000-0000-000000000a12'::uuid,
      'Cross-owner treatments',
      'Cross-owner services'
    )
  $$,
  '42501',
  'Treatment section title access denied',
  'An owner cannot change another profile section titles'
);

select throws_ok(
  $$
    select * from public.save_treatment_service_section_titles(
      '00000000-0000-0000-0000-000000000a11'::uuid,
      E'Invalid\ntitle',
      'Services'
    )
  $$,
  '22023',
  'Section titles must be plain text between 1 and 100 characters',
  'The database rejects non-plain-text titles independently of the client'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    select * from public.save_treatment_service_section_titles(
      '00000000-0000-0000-0000-000000000a12'::uuid,
      'Admin-managed treatments',
      'Admin-managed services'
    )
  $$,
  'A dashboard admin can manage an explicitly targeted profile'
);

select results_eq(
  $$
    select treatment_section_title, service_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000a02'::uuid
  $$,
  $$ values ('Admin-managed treatments'::text, 'Admin-managed services'::text) $$,
  'Admin-managed titles synchronize to the targeted public projection'
);

select * from finish();
rollback;
