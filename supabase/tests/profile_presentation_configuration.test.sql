begin;

select plan(24);

select
  '00000000-0000-0000-0000-000000000971'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000972'::uuid as other_id,
  '00000000-0000-0000-0000-000000000981'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000982'::uuid as other_dentistry_id
\gset

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260811111407'
  ),
  'Profile presentation migration is applied'
);

select ok(
  has_table_privilege('anon', 'public.public_profiles', 'select')
  and not has_table_privilege('anon', 'public.public_profiles', 'update')
  and not has_table_privilege('anon', 'public.users', 'select'),
  'Anonymous access remains limited to the read-only projection'
);

select ok(
  not has_function_privilege('anon', 'public.save_profile_presentation_draft(uuid,bigint,jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.publish_profile_presentation(uuid,bigint,bigint)', 'execute')
  and has_function_privilege('authenticated', 'public.save_profile_presentation_draft(uuid,bigint,jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.publish_profile_presentation(uuid,bigint,bigint)', 'execute'),
  'Only authenticated sessions can invoke presentation writes'
);

select ok(
  not has_column_privilege('authenticated', 'public.users', 'profile_presentation_published', 'update')
  and not has_column_privilege('authenticated', 'public.users', 'profile_presentation_draft', 'update'),
  'Presentation state cannot bypass the validated RPC boundary'
);

set local role service_role;
insert into public.users (id, email, username, role, subscription_status, trial_end, registered_domain)
values
  (:'owner_id', 'presentation-owner@example.test', 'presentation-owner', 'user', 'FREE', null, 'dental.bio'),
  (:'other_id', 'presentation-other@example.test', 'presentation-other', 'user', 'FREE', null, 'dental.bio');
insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');

select is(
  (select profile_presentation ->> 'templateId' from public.public_profiles where profile_id = :'owner_id'),
  'basic',
  'Existing and new owners default to the Basic published template'
);

select is(
  (select profile_presentation_revision from public.public_profiles where profile_id = :'owner_id'),
  0::bigint,
  'The initial public presentation revision is deterministic'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"cosmetic-transformation","themeId":"premium-contrast","layoutVariant":"hero-overlap","answers":{}}'::jsonb) $$,
    :'owner_id'
  ),
  '22023',
  'Profile presentation configuration is invalid or unavailable',
  'Free owners cannot save premium presentation selections'
);

select throws_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"direct-booking","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{"freeText":"private"}}'::jsonb) $$,
    :'owner_id'
  ),
  '22023',
  'Profile presentation configuration is invalid or unavailable',
  'The database rejects unrecognized answer keys and free text'
);

select throws_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"direct-booking","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{"featuredTreatmentIds":["0"]}}'::jsonb) $$,
    :'owner_id'
  ),
  '22023',
  'Profile presentation configuration is invalid or unavailable',
  'Entity references reject zero because stable integer IDs are positive'
);

select lives_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"direct-booking","themeId":"warm-care","layoutVariant":"classic-stack","answers":{"primaryAction":"booking","featuredTreatmentIds":["1","2"]}}'::jsonb) $$,
    :'owner_id'
  ),
  'An owner can save a valid controlled draft'
);

select is(
  (select profile_presentation_draft_revision from public.users where id = :'owner_id'),
  1::bigint,
  'Saving a draft advances only its compare-and-swap revision'
);

select is(
  (select profile_presentation ->> 'templateId' from public.public_profiles where profile_id = :'owner_id'),
  'basic',
  'A saved draft cannot change the public profile'
);

select throws_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb) $$,
    :'owner_id'
  ),
  '40001',
  'Profile presentation draft changed concurrently',
  'A stale draft save is rejected instead of overwriting newer work'
);

select throws_ok(
  format(
    $$ select public.publish_profile_presentation(%L::uuid, 0, 0) $$,
    :'owner_id'
  ),
  '40001',
  'Profile presentation changed concurrently',
  'Publishing requires the current draft and published revisions'
);

select lives_ok(
  format($$ select public.publish_profile_presentation(%L::uuid, 1, 0) $$, :'owner_id'),
  'The current draft publishes atomically'
);

select results_eq(
  format(
    $$ select profile_presentation ->> 'templateId', profile_presentation_revision from public.public_profiles where profile_id = %L::uuid $$,
    :'owner_id'
  ),
  $$ values ('direct-booking'::text, 1::bigint) $$,
  'The trigger projects only the newly published configuration and revision'
);

select throws_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 0, '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb) $$,
    :'other_id'
  ),
  '42501',
  'Profile presentation access denied',
  'An owner cannot mutate another profile'
);

set local role service_role;
select throws_ok(
  format(
    $$ update public.users set profile_presentation_published = '{"schemaVersion":1,"templateId":"unknown","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb where id = %L::uuid $$,
    :'owner_id'
  ),
  '23514',
  null,
  'The private source rejects malformed published configuration even for direct service writes'
);

update public.users
set subscription_status = 'PRO', trial_end = null
where id = :'owner_id';

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  format(
    $$ select public.save_profile_presentation_draft(%L::uuid, 1, '{"schemaVersion":1,"templateId":"cosmetic-transformation","themeId":"premium-contrast","layoutVariant":"hero-overlap","answers":{"signatureTreatmentId":"42"}}'::jsonb) $$,
    :'owner_id'
  ),
  'A paid owner can save a supported premium configuration'
);
select lives_ok(
  format($$ select public.publish_profile_presentation(%L::uuid, 2, 1) $$, :'owner_id'),
  'A paid owner can publish a supported premium configuration'
);

set local role service_role;
update public.users set subscription_status = 'FREE' where id = :'owner_id';

select results_eq(
  format(
    $$ select profile_presentation ->> 'templateId', profile_presentation ->> 'themeId', profile_presentation ->> 'layoutVariant' from public.public_profiles where profile_id = %L::uuid $$,
    :'owner_id'
  ),
  $$ values ('cosmetic-transformation'::text, 'clinical-light'::text, 'classic-stack'::text) $$,
  'Downgrade projects a safe free fallback without discarding template intent'
);

select results_eq(
  format(
    $$ select profile_presentation_published ->> 'themeId', profile_presentation_published ->> 'layoutVariant' from public.users where id = %L::uuid $$,
    :'owner_id'
  ),
  $$ values ('premium-contrast'::text, 'hero-overlap'::text) $$,
  'Entitlement fallback does not delete the owner saved configuration'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select results_eq(
  format(
    $$ select profile_presentation ->> 'themeId' from public.public_profiles where profile_id = %L::uuid $$,
    :'owner_id'
  ),
  $$ values ('clinical-light'::text) $$,
  'Anonymous reads receive only the effective published presentation'
);

select throws_ok(
  format(
    $$ select profile_presentation_draft from public.users where id = %L::uuid $$,
    :'owner_id'
  ),
  '42501',
  null,
  'Anonymous callers cannot read presentation drafts from users'
);

select * from finish();
rollback;
