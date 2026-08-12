begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000901'::uuid as ordinary_id,
  '00000000-0000-0000-0000-000000000902'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000903'::uuid as brand_id
\gset

select ok(
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260811112926'
  ),
  'Brands RLS migration is applied'
);

set local role service_role;
insert into public.users (id, email, username, role)
values
  (:'ordinary_id', 'brands-ordinary@example.test', 'brands-ordinary', 'user'),
  (:'admin_id', 'brands-admin@example.test', 'brands-admin', 'admin');

insert into public.brands (
  id,
  domain,
  brand_name,
  logo_path,
  email_from,
  base_url
)
values (
  :'brand_id',
  'brands-rls.example.test',
  'Brands RLS',
  '/brands-rls.svg',
  'brands-rls@example.test',
  'https://brands-rls.example.test'
);

select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brands'
      and policyname = 'Dashboard admins can manage brands'
      and cmd = 'ALL'
      and roles = array['authenticated']::name[]
  )
  and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'brands'
      and policyname = 'Authenticated users can manage brands'
  ),
  'Only dashboard admins receive the brand mutation policy'
);

select ok(
  has_table_privilege('anon', 'public.brands', 'select')
  and not has_table_privilege('anon', 'public.brands', 'insert')
  and not has_table_privilege('anon', 'public.brands', 'update')
  and not has_table_privilege('anon', 'public.brands', 'delete')
  and not has_table_privilege('anon', 'public.brands', 'truncate')
  and has_table_privilege('authenticated', 'public.brands', 'select')
  and has_table_privilege('authenticated', 'public.brands', 'insert')
  and has_table_privilege('authenticated', 'public.brands', 'update')
  and has_table_privilege('authenticated', 'public.brands', 'delete')
  and not has_table_privilege('authenticated', 'public.brands', 'truncate'),
  'Brand grants preserve reads and remove legacy non-CRUD privileges'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select lives_ok(
  $$ select * from public.brands where id = '00000000-0000-0000-0000-000000000903' $$,
  'Anonymous callers retain public brand reads'
);
select throws_ok(
  $$ delete from public.brands where id = '00000000-0000-0000-0000-000000000903' $$,
  '42501',
  null,
  'Anonymous callers cannot delete brands'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'ordinary_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select public.is_dashboard_admin()),
  false,
  'Ordinary authenticated fixture is not a dashboard admin'
);
select throws_ok(
  $$
    insert into public.brands (
      domain,
      brand_name,
      logo_path,
      email_from,
      base_url
    ) values (
      'brands-forged.example.test',
      'Forged Brand',
      '/forged.svg',
      'forged@example.test',
      'https://brands-forged.example.test'
    )
  $$,
  '42501',
  null,
  'Ordinary authenticated callers cannot create brands'
);
select lives_ok(
  $$ update public.brands set brand_name = 'Forged Brand' where id = '00000000-0000-0000-0000-000000000903' $$,
  'Denied brand updates complete without leaking row visibility'
);
select is(
  (select brand_name from public.brands where id = :'brand_id'),
  'Brands RLS',
  'Ordinary authenticated callers cannot update brands'
);
select lives_ok(
  $$ delete from public.brands where id = '00000000-0000-0000-0000-000000000903' $$,
  'Denied brand deletes complete without leaking row visibility'
);
select is(
  (select count(*) from public.brands where id = :'brand_id'),
  1::bigint,
  'Ordinary authenticated callers cannot delete brands'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is(
  (select public.is_dashboard_admin()),
  true,
  'Admin fixture is recognized as a dashboard admin'
);
select lives_ok(
  $$ update public.brands set brand_name = 'Admin Brand' where id = '00000000-0000-0000-0000-000000000903' $$,
  'Dashboard admins can update brands'
);
select lives_ok(
  $$ delete from public.brands where id = '00000000-0000-0000-0000-000000000903' $$,
  'Dashboard admins can delete brands'
);

set local role service_role;
select lives_ok(
  $$
    insert into public.brands (
      domain,
      brand_name,
      logo_path,
      email_from,
      base_url
    ) values (
      'brands-service.example.test',
      'Service Brand',
      '/service.svg',
      'service@example.test',
      'https://brands-service.example.test'
    )
  $$,
  'Service role retains operational brand writes'
);

select * from finish();
rollback;
