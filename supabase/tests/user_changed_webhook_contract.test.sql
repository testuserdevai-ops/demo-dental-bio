begin;

select no_plan();

select has_function(
  'public',
  'notify_user_changed',
  array[]::text[],
  'User-change producer exists as a trigger-only function'
);
select ok(
  not has_function_privilege('public', 'public.notify_user_changed()', 'execute')
  and not has_function_privilege('anon', 'public.notify_user_changed()', 'execute')
  and not has_function_privilege('authenticated', 'public.notify_user_changed()', 'execute')
  and not has_function_privilege('service_role', 'public.notify_user_changed()', 'execute'),
  'User-change producer cannot be called through API roles'
);
select ok(
  coalesce(
    (
      select proconfig @> array['search_path=""']
      from pg_proc
      where oid = 'public.notify_user_changed()'::regprocedure
    ),
    false
  ),
  'User-change producer pins an empty search path'
);
select ok(
  (
    select pg_get_triggerdef(oid) like
      '%BEFORE UPDATE OF subscription_status, billing_cycle, use_dental_brand ON public.users%'
    from pg_trigger
    where tgname = 'trigger-users-table-changed'
      and not tgisinternal
  ),
  'User-change trigger runs before only relevant authority updates'
);

select ok(
  not has_schema_privilege('anon', 'vault', 'usage')
  and not has_schema_privilege('authenticated', 'vault', 'usage')
  and not has_table_privilege('anon', 'vault.decrypted_secrets', 'select')
  and not has_table_privilege('authenticated', 'vault.decrypted_secrets', 'select'),
  'Public API roles cannot read decrypted webhook configuration'
);
select ok(
  has_schema_privilege('service_role', 'vault', 'usage')
  and has_table_privilege('service_role', 'vault.decrypted_secrets', 'select')
  and has_function_privilege(
    'service_role',
    'vault.create_secret(text,text,text,uuid)',
    'execute'
  ),
  'Service role can explicitly provision Vault webhook configuration'
);

create temporary table user_changed_queue_baseline (
  max_id bigint not null
) on commit drop;
insert into user_changed_queue_baseline
select coalesce(max(id), 0) from net.http_request_queue;
grant select on pg_temp.user_changed_queue_baseline to service_role;

delete from vault.secrets
where name in ('user_changed_webhook_url', 'user_changed_webhook_secret');

set local role service_role;
insert into public.users (
  id,
  email,
  username,
  role,
  subscription_status,
  billing_cycle,
  use_dental_brand
)
values (
  '00000000-0000-0000-0000-000000000406',
  'user-change-producer@example.test',
  'user-change-producer',
  'user',
  'PREMIUM PRO',
  'monthly',
  false
);

update public.users
set first_name = 'Unrelated'
where id = '00000000-0000-0000-0000-000000000406';
reset role;
select is(
  (
    select count(*)::integer
    from net.http_request_queue
    where id > (select max_id from pg_temp.user_changed_queue_baseline)
  ),
  0,
  'Unrelated user updates do not invoke the webhook producer'
);

set local role service_role;
update public.users
set subscription_status = 'PRO', use_dental_brand = false
where id = '00000000-0000-0000-0000-000000000406';
reset role;
select results_eq(
  $$ select subscription_status::text, use_dental_brand from public.users where id = '00000000-0000-0000-0000-000000000406' $$,
  $$ values ('PRO'::text, true) $$,
  'Downgrade branding is enforced synchronously in the database'
);
select is(
  (
    select count(*)::integer
    from net.http_request_queue
    where id > (select max_id from pg_temp.user_changed_queue_baseline)
  ),
  0,
  'Missing Vault configuration invokes no HTTP path'
);

select vault.create_secret(
  'http://127.0.0.1:9/api/webhooks/user-changed',
  'user_changed_webhook_url',
  'Provisioned user-change webhook URL'
);
select vault.create_secret(
  'local-user-changed-secret',
  'user_changed_webhook_secret',
  'Provisioned user-change webhook shared secret'
);

set local role service_role;
update public.users
set subscription_status = 'PREMIUM PRO'
where id = '00000000-0000-0000-0000-000000000406';
reset role;

select is(
  (
    select count(*)::integer
    from net.http_request_queue
    where id > (select max_id from pg_temp.user_changed_queue_baseline)
  ),
  1,
  'Configured plan change invokes exactly one asynchronous HTTP path'
);
select results_eq(
  $$ select url from net.http_request_queue where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values ('http://127.0.0.1:9/api/webhooks/user-changed'::text) $$,
  'Producer uses only the provisioned webhook URL'
);
select results_eq(
  $$ select headers from net.http_request_queue where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values (jsonb_build_object('Authorization', 'Bearer local-user-changed-secret', 'Content-Type', 'application/json')) $$,
  'Producer sends the exact authorization and JSON content headers'
);
select results_eq(
  $$ select array_agg(key order by key) from net.http_request_queue cross join lateral jsonb_object_keys(convert_from(body, 'UTF8')::jsonb) as key where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values (array['old_record', 'record']::text[]) $$,
  'Producer body contains only the consumer record keys'
);
select results_eq(
  $$ select array_agg(key order by key) from net.http_request_queue cross join lateral jsonb_object_keys(convert_from(body, 'UTF8')::jsonb->'record') as key where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values (array['billing_cycle', 'email', 'id', 'registered_domain', 'subscription_status', 'use_dental_brand']::text[]) $$,
  'Producer record contains only fields accepted by the consumer contract'
);
select results_eq(
  $$ select array_agg(key order by key) from net.http_request_queue cross join lateral jsonb_object_keys(convert_from(body, 'UTF8')::jsonb->'old_record') as key where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values (array['billing_cycle', 'subscription_status']::text[]) $$,
  'Producer old record contains only fields required by plan-change email'
);
select results_eq(
  $$ select convert_from(body, 'UTF8')::jsonb->'record'->>'subscription_status', convert_from(body, 'UTF8')::jsonb->'old_record'->>'subscription_status' from net.http_request_queue where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values ('PREMIUM PRO'::text, 'PRO'::text) $$,
  'Producer body carries exact new and old records'
);
select results_eq(
  $$ select convert_from(body, 'UTF8')::jsonb->'record'->>'use_dental_brand' from net.http_request_queue where id > (select max_id from pg_temp.user_changed_queue_baseline) $$,
  $$ values ('true'::text) $$,
  'Producer payload contains synchronously corrected branding authority'
);

select is(
  (
    select count(*)::integer
    from net.http_request_queue
    where id > (select max_id from pg_temp.user_changed_queue_baseline)
      and url like '%dental.bio%'
  ),
  0,
  'Producer never queues a hardcoded production destination'
);

select * from finish();
rollback;
