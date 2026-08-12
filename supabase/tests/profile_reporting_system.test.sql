begin;

select no_plan();

select ok(
  exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260812103440'
  ),
  'Profile-reporting migration is applied'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profile_reports'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.profile_report_notes'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.profile_report_audit_log'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.profile_report_submission_limits'::regclass),
  'Every reporting table in the exposed schema has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.profile_reports', 'select')
  and not has_table_privilege('authenticated', 'public.profile_reports', 'select')
  and not has_table_privilege('anon', 'public.profile_report_notes', 'select')
  and not has_table_privilege('authenticated', 'public.profile_report_audit_log', 'select'),
  'Public and ordinary authenticated callers cannot read report data'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.submit_profile_report(uuid,text,text,text,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.moderate_profile_report(uuid,uuid,integer,text,text,uuid,text,text)',
    'execute'
  )
  and has_function_privilege(
    'service_role',
    'public.submit_profile_report(uuid,text,text,text,text,text)',
    'execute'
  ),
  'Only the service boundary can invoke report submission and moderation RPCs'
);

set local role service_role;

select is(
  public.claim_profile_report_submission(repeat('a', 64), 2, 3600),
  true,
  'The first submission in a source window is accepted'
);
select is(
  public.claim_profile_report_submission(repeat('a', 64), 2, 3600),
  true,
  'A second submission within policy remains accepted'
);
select is(
  public.claim_profile_report_submission(repeat('a', 64), 2, 3600),
  false,
  'A source exceeding the bounded window is rate limited'
);

select results_eq(
  $$
    select created
    from public.submit_profile_report(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'unsafe_or_harmful',
      'This public fixture needs urgent review.',
      'reporter@example.test',
      'http://localhost:3247/pro-user',
      repeat('b', 64)
    )
  $$,
  $$ values (true) $$,
  'A valid report is durably created through the service RPC'
);

select results_eq(
  $$
    select created
    from public.submit_profile_report(
      '11111111-1111-4111-8111-111111111111'::uuid,
      'unsafe_or_harmful',
      'This public fixture needs urgent review.',
      'reporter@example.test',
      'http://localhost:3247/pro-user',
      repeat('b', 64)
    )
  $$,
  $$ values (false) $$,
  'An exact report fingerprint returns the original report instead of duplicating it'
);

select results_eq(
  $$
    select severity::text, priority::text, status::text,
      (sla_due_at = created_at + interval '4 hours')
    from public.profile_reports
    where submission_fingerprint = repeat('b', 64)
  $$,
  $$ values ('critical'::text, 'critical'::text, 'new'::text, true) $$,
  'Category policy assigns critical priority and its four-hour SLA'
);

select is(
  (
    select profile_snapshot ->> 'username'
    from public.profile_reports
    where submission_fingerprint = repeat('b', 64)
  ),
  'pro-user',
  'Submission captures a review-safe profile snapshot from the public projection'
);

select is(
  (
    select count(*)::integer
    from public.profile_report_audit_log
    where action = 'submitted'
      and report_id = (
        select id from public.profile_reports
        where submission_fingerprint = repeat('b', 64)
      )
  ),
  1,
  'Submission creates exactly one immutable audit event'
);

select lives_ok(
  $$
    select *
    from public.moderate_profile_report(
      (select id from public.profile_reports where submission_fingerprint = repeat('b', 64)),
      '22222222-2222-4222-8222-222222222222'::uuid,
      1,
      'in_review',
      'critical',
      '22222222-2222-4222-8222-222222222222'::uuid,
      null,
      null
    )
  $$,
  'An authorized administrator can assign and begin reviewing a report'
);

select throws_ok(
  $$
    select *
    from public.moderate_profile_report(
      (select id from public.profile_reports where submission_fingerprint = repeat('b', 64)),
      '22222222-2222-4222-8222-222222222222'::uuid,
      1,
      'resolved',
      'critical',
      null,
      'no_action',
      'No policy violation was found after review.'
    )
  $$,
  'P0001',
  'REPORT_VERSION_CONFLICT',
  'Optimistic concurrency rejects a stale moderation write'
);

select lives_ok(
  $$
    select public.add_profile_report_note(
      (select id from public.profile_reports where submission_fingerprint = repeat('b', 64)),
      '22222222-2222-4222-8222-222222222222'::uuid,
      'Requested a second reviewer because the category is critical.'
    )
  $$,
  'Authorized moderators can append internal notes'
);

select is(
  (
    select count(*)::integer
    from public.profile_report_audit_log
    where report_id = (
      select id from public.profile_reports
      where submission_fingerprint = repeat('b', 64)
    )
  ),
  3,
  'Submission, moderation, and note changes produce a complete audit history'
);

update public.profile_reports
set reporter_email_expires_at = now() - interval '1 second'
where submission_fingerprint = repeat('b', 64);

select is(
  public.expire_profile_report_contacts(now()),
  1::bigint,
  'The retention operation expires reporter contact after its deadline'
);

select ok(
  (
    select reporter_email is null and reporter_email_expires_at is null
    from public.profile_reports
    where submission_fingerprint = repeat('b', 64)
  )
  and exists (
    select 1 from public.profile_report_audit_log
    where action = 'reporter_contact_expired'
  ),
  'Contact expiry preserves an auditable non-sensitive retention event'
);

select throws_ok(
  $$
    select public.add_profile_report_note(
      (select id from public.profile_reports where submission_fingerprint = repeat('b', 64)),
      '11111111-1111-4111-8111-111111111111'::uuid,
      'Ordinary users may not write notes.'
    )
  $$,
  'P0001',
  'REPORT_MODERATOR_FORBIDDEN',
  'Ordinary users cannot add moderation notes through the service RPC'
);

select * from finish();
rollback;
