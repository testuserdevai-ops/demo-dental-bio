begin;

select no_plan();

select has_function(
  'public',
  'notify_isverified_change',
  array[]::text[],
  'Verification-change producer exists as a trigger-only function'
);
select ok(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.notify_isverified_change()'::regprocedure
  ),
  'Verification-change producer is security definer'
);
select ok(
  coalesce(
    (
      select proconfig @> array['search_path=""']
      from pg_proc
      where oid = 'public.notify_isverified_change()'::regprocedure
    ),
    false
  ),
  'Verification-change producer pins an empty search path'
);
select ok(
  not has_function_privilege('public', 'public.notify_isverified_change()', 'execute')
  and not has_function_privilege('anon', 'public.notify_isverified_change()', 'execute')
  and not has_function_privilege('authenticated', 'public.notify_isverified_change()', 'execute')
  and not has_function_privilege('service_role', 'public.notify_isverified_change()', 'execute'),
  'Verification-change producer cannot be called through API roles'
);
select ok(
  (
    select pg_get_triggerdef(oid) like
      '%AFTER UPDATE OF "isVerified" ON public.users%'
    from pg_trigger
    where tgname = 'on_isverified_change'
      and not tgisinternal
  ),
  'Verification-change trigger runs after only verification updates'
);

create temporary table verification_queue_baseline (
  max_id bigint not null
) on commit drop;
insert into verification_queue_baseline
select coalesce(max(id), 0) from net.http_request_queue;
grant select on pg_temp.verification_queue_baseline to service_role;

delete from vault.secrets
where name in (
  'verification_changed_webhook_url',
  'verification_changed_webhook_secret'
);

set local role service_role;
insert into public.users (
  id,
  email,
  username,
  first_name,
  role,
  "isVerified"
)
values (
  '00000000-0000-0000-0000-000000000410',
  'verification-producer@example.test',
  'verification-producer',
  'Verification',
  'user',
  false
);
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410' $$,
  'Missing Vault configuration leaves verification updates independent of HTTP'
);
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  0,
  'Missing Vault configuration invokes no HTTP path'
);

set local role service_role;
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
reset role;
select vault.create_secret(
  '',
  'verification_changed_webhook_url',
  'Blank verification URL fixture'
);
select vault.create_secret(
  'local-verification-secret',
  'verification_changed_webhook_secret',
  'Configured verification secret fixture'
);
set local role service_role;
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410' $$,
  'Blank Vault URL fails closed without aborting verification'
);
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  0,
  'Blank Vault URL invokes no HTTP path'
);
delete from vault.secrets
where name in ('verification_changed_webhook_url', 'verification_changed_webhook_secret');

set local role service_role;
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
reset role;
select vault.create_secret(
  '   ',
  'verification_changed_webhook_url',
  'Whitespace verification URL fixture'
);
select vault.create_secret(
  'local-verification-secret',
  'verification_changed_webhook_secret',
  'Configured verification secret fixture'
);
set local role service_role;
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410' $$,
  'Whitespace Vault URL fails closed without aborting verification'
);
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  0,
  'Whitespace Vault URL invokes no HTTP path'
);
delete from vault.secrets
where name in ('verification_changed_webhook_url', 'verification_changed_webhook_secret');

set local role service_role;
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
reset role;
select vault.create_secret(
  'http://127.0.0.1:9/api/webhooks/verification-changed',
  'verification_changed_webhook_url',
  'Configured verification URL fixture'
);
select vault.create_secret(
  '',
  'verification_changed_webhook_secret',
  'Blank verification secret fixture'
);
set local role service_role;
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410' $$,
  'Blank Vault secret fails closed without aborting verification'
);
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  0,
  'Blank Vault secret invokes no HTTP path'
);
delete from vault.secrets
where name in ('verification_changed_webhook_url', 'verification_changed_webhook_secret');

set local role service_role;
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
reset role;
select vault.create_secret(
  'http://127.0.0.1:9/api/webhooks/verification-changed',
  'verification_changed_webhook_url',
  'Configured verification URL fixture'
);
select vault.create_secret(
  '   ',
  'verification_changed_webhook_secret',
  'Whitespace verification secret fixture'
);
set local role service_role;
select lives_ok(
  $$ update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410' $$,
  'Whitespace Vault secret fails closed without aborting verification'
);
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  0,
  'Whitespace Vault secret invokes no HTTP path'
);
delete from vault.secrets
where name in ('verification_changed_webhook_url', 'verification_changed_webhook_secret');

select ok(
  not has_table_privilege('postgres', 'vault.secrets', 'update'),
  'The database test role cannot corrupt protected Vault ciphertext'
);

set local role service_role;
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
reset role;
select vault.create_secret(
  'http://127.0.0.1:9/api/webhooks/verification-changed',
  'verification_changed_webhook_url',
  'Provisioned verification webhook URL'
);
select vault.create_secret(
  'local-verification-secret',
  'verification_changed_webhook_secret',
  'Provisioned verification webhook shared secret'
);
set local role service_role;
update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410';
reset role;

select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  1,
  'Configured false-to-true verification queues exactly one request'
);
select results_eq(
  $$ select url from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline) $$,
  $$ values ('http://127.0.0.1:9/api/webhooks/verification-changed'::text) $$,
  'Verification producer uses only the provisioned URL'
);
select results_eq(
  $$ select headers from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline) $$,
  $$ values (jsonb_build_object('Authorization', 'Bearer local-verification-secret', 'Content-Type', 'application/json')) $$,
  'Verification producer sends exact authorization and content headers'
);
select results_eq(
  $$ select array_agg(key order by key) from net.http_request_queue cross join lateral jsonb_object_keys(convert_from(body, 'UTF8')::jsonb) as key where id > (select max_id from pg_temp.verification_queue_baseline) $$,
  $$ values (array['email', 'first_name', 'id', 'isVerified', 'timestamp', 'username']::text[]) $$,
  'Verification producer body contains only strict consumer fields'
);
select results_eq(
  $$ select convert_from(body, 'UTF8')::jsonb->>'id', convert_from(body, 'UTF8')::jsonb->>'email', convert_from(body, 'UTF8')::jsonb->>'username', convert_from(body, 'UTF8')::jsonb->>'first_name', convert_from(body, 'UTF8')::jsonb->>'isVerified' from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline) $$,
  $$ values ('00000000-0000-0000-0000-000000000410'::text, 'verification-producer@example.test'::text, 'verification-producer'::text, 'Verification'::text, 'true'::text) $$,
  'Verification producer body carries the exact verified user fields'
);
select ok(
  (
    select (convert_from(body, 'UTF8')::jsonb->>'timestamp')::timestamptz is not null
    from net.http_request_queue
    where id > (select max_id from pg_temp.verification_queue_baseline)
  ),
  'Verification producer emits a parseable timestamp'
);

set local role service_role;
update public.users set first_name = 'Changed' where id = '00000000-0000-0000-0000-000000000410';
update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410';
update public.users set "isVerified" = false where id = '00000000-0000-0000-0000-000000000410';
update public.users set "isVerified" = null where id = '00000000-0000-0000-0000-000000000410';
update public.users set "isVerified" = true where id = '00000000-0000-0000-0000-000000000410';
reset role;
select is(
  (select count(*)::integer from net.http_request_queue where id > (select max_id from pg_temp.verification_queue_baseline)),
  2,
  'Only false-or-null to true verification transitions queue requests'
);
select is(
  (
    select count(*)::integer
    from net.http_request_queue
    where id > (select max_id from pg_temp.verification_queue_baseline)
      and url like '%dental.bio%'
  ),
  0,
  'Verification producer never queues a hardcoded production destination'
);

select * from finish();
rollback;
