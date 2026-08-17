select no_plan();

create extension if not exists dblink with schema extensions;

delete from public.dentistry_treatments
where dentistry_id = '00000000-0000-0000-0000-000000000611';
delete from public.treatments
where title in ('Concurrent treatment one', 'Concurrent treatment two');
delete from public.dentistries
where dentistry_id = '00000000-0000-0000-0000-000000000611';
delete from public.users
where id = '00000000-0000-0000-0000-000000000601';

insert into public.users (id, email, username, role)
values (
  '00000000-0000-0000-0000-000000000601',
  'treatment-concurrency@example.test',
  'treatment-concurrency',
  'user'
);

insert into public.dentistries (dentistry_id, user_id)
values (
  '00000000-0000-0000-0000-000000000611',
  '00000000-0000-0000-0000-000000000601'
);

create or replace function public.phase6_test_slow_treatment_insert()
returns trigger
language plpgsql
as $$
begin
  if new.title like 'Concurrent treatment %' then
    perform pg_sleep(0.25);
  end if;
  return new;
end;
$$;

create trigger phase6_test_slow_treatment_insert
before insert on public.treatments
for each row execute function public.phase6_test_slow_treatment_insert();

select extensions.dblink_connect(
  'phase6_treatment_one',
  'host=db.supabase.internal port=5432 dbname=' || current_database()
    || ' user=postgres password=postgres'
);
select extensions.dblink_connect(
  'phase6_treatment_two',
  'host=db.supabase.internal port=5432 dbname=' || current_database()
    || ' user=postgres password=postgres'
);

select extensions.dblink_exec('phase6_treatment_one', 'set role authenticated');
select extensions.dblink_exec(
  'phase6_treatment_one',
  $$ set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000601' $$
);
select extensions.dblink_exec('phase6_treatment_two', 'set role authenticated');
select extensions.dblink_exec(
  'phase6_treatment_two',
  $$ set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000601' $$
);

select is(
  extensions.dblink_send_query(
    'phase6_treatment_one',
    $$ select * from public.create_dentistry_treatment(
      '00000000-0000-0000-0000-000000000611',
      'Concurrent treatment one',
      'First concurrent description',
      false
    ) $$
  ),
  1,
  'The first treatment create starts asynchronously'
);
select is(
  extensions.dblink_send_query(
    'phase6_treatment_two',
    $$ select * from public.create_dentistry_treatment(
      '00000000-0000-0000-0000-000000000611',
      'Concurrent treatment two',
      'Second concurrent description',
      false
    ) $$
  ),
  1,
  'The second treatment create starts while the first transaction is open'
);

select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_treatment_one') as result(
      treatment_id uuid,
      title varchar,
      description text,
      "isService" boolean
    )
  ),
  1,
  'The first concurrent create commits one treatment'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_treatment_two') as result(
      treatment_id uuid,
      title varchar,
      description text,
      "isService" boolean
    )
  ),
  1,
  'The second concurrent create commits one treatment'
);

select results_eq(
  $$
    select treatments.title::text, dentistry_treatments.rank
    from public.dentistry_treatments
    join public.treatments using (treatment_id)
    where dentistry_treatments.dentistry_id =
      '00000000-0000-0000-0000-000000000611'
    order by dentistry_treatments.rank
  $$,
  $$
    values
      ('Concurrent treatment one'::text, 1),
      ('Concurrent treatment two'::text, 2)
  $$,
  'Concurrent creates serialize to distinct contiguous ranks'
);

select extensions.dblink_disconnect('phase6_treatment_one');
select extensions.dblink_disconnect('phase6_treatment_two');

delete from public.dentistry_treatments
where dentistry_id = '00000000-0000-0000-0000-000000000611';
delete from public.treatments
where title in ('Concurrent treatment one', 'Concurrent treatment two');
delete from public.dentistries
where dentistry_id = '00000000-0000-0000-0000-000000000611';
delete from public.users
where id = '00000000-0000-0000-0000-000000000601';

drop trigger phase6_test_slow_treatment_insert on public.treatments;
drop function public.phase6_test_slow_treatment_insert();
drop extension dblink;

select * from finish();
