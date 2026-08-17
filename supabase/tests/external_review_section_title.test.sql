begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000b01'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000b02'::uuid as other_id,
  '00000000-0000-0000-0000-000000000b03'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000b11'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000b12'::uuid as other_dentistry_id,
  '00000000-0000-0000-0000-000000000b13'::uuid as admin_dentistry_id
\gset

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260817201434'
  ),
  'External review section-title migration is applied'
);

select has_column(
  'public',
  'dentistries',
  'external_review_section_title',
  'Dentistries own the private heading authority'
);
select has_column(
  'public',
  'public_profiles',
  'external_review_section_title',
  'The anonymous projection exposes only the public heading value'
);
select has_function(
  'public',
  'save_external_review_section_title',
  array['uuid', 'text'],
  'The heading has one restricted dashboard RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.save_external_review_section_title(uuid,text)',
    'execute'
  )
  and has_function_privilege(
    'authenticated',
    'public.save_external_review_section_title(uuid,text)',
    'execute'
  ),
  'Anonymous callers cannot invoke the owner write boundary'
);

set local role service_role;
insert into public.users (id, email, username, role)
values
  (:'owner_id', 'external-title-owner@example.test', 'external-title-owner', 'user'),
  (:'other_id', 'external-title-other@example.test', 'external-title-other', 'user'),
  (:'admin_id', 'external-title-admin@example.test', 'external-title-admin', 'admin');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id'),
  (:'admin_dentistry_id', :'admin_id');

select results_eq(
  $$
    select external_review_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000b01'::uuid
  $$,
  $$ values (null::text) $$,
  'Legacy and new profiles have no unmanaged public fallback'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$
    select external_review_section_title
    from public.save_external_review_section_title(
      '00000000-0000-0000-0000-000000000b11'::uuid,
      '  More owner reviews  '
    )
  $$,
  $$ values ('More owner reviews'::text) $$,
  'An owner can save a trimmed external review heading'
);

select results_eq(
  $$
    select external_review_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000b01'::uuid
  $$,
  $$ values ('More owner reviews'::text) $$,
  'The dentistry trigger immediately synchronizes the public projection'
);

select is_empty(
  $$
    update public.dentistries
    set external_review_section_title = 'Cross-owner direct update'
    where dentistry_id = '00000000-0000-0000-0000-000000000b12'::uuid
    returning dentistry_id
  $$,
  'Dentistry RLS hides another owner from direct updates'
);

select throws_ok(
  $$
    select * from public.save_external_review_section_title(
      '00000000-0000-0000-0000-000000000b12'::uuid,
      'Cross-owner RPC update'
    )
  $$,
  '42501',
  'External review section title access denied',
  'The RPC independently rejects a cross-owner target'
);

select throws_ok(
  $$
    select * from public.save_external_review_section_title(
      '00000000-0000-0000-0000-000000000b11'::uuid,
      E'Reviews\nelsewhere'
    )
  $$,
  '22023',
  'External review section title must be plain text up to 100 characters',
  'The database rejects control characters independently of the client'
);

select results_eq(
  $$
    select external_review_section_title
    from public.save_external_review_section_title(
      '00000000-0000-0000-0000-000000000b11'::uuid,
      '   '
    )
  $$,
  $$ values (null::text) $$,
  'Blank owner input removes the public heading instead of inventing copy'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select results_eq(
  $$
    select external_review_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000b01'::uuid
  $$,
  $$ values (null::text) $$,
  'Anonymous reads receive the synchronized projection without private user data'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$
    select external_review_section_title
    from public.save_external_review_section_title(
      '00000000-0000-0000-0000-000000000b12'::uuid,
      'Admin-managed owner heading'
    )
  $$,
  $$ values ('Admin-managed owner heading'::text) $$,
  'A dashboard admin can manage an explicitly targeted owner profile'
);

select results_eq(
  $$
    select external_review_section_title
    from public.public_profiles
    where profile_id = '00000000-0000-0000-0000-000000000b02'::uuid
  $$,
  $$ values ('Admin-managed owner heading'::text) $$,
  'Admin-managed copy synchronizes to the targeted public projection'
);

select * from finish();
rollback;
