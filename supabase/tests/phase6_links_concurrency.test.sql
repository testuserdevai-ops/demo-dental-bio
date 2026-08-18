select no_plan();

create extension if not exists dblink with schema extensions;

delete from public.dentistries
where dentistry_id = '00000000-0000-0000-0000-000000000871';
delete from public.users
where id = '00000000-0000-0000-0000-000000000861';

insert into public.users (id, email, username, role)
values (
  '00000000-0000-0000-0000-000000000861',
  'link-concurrency@example.test',
  'link-concurrency',
  'user'
);
insert into public.dentistries (dentistry_id, user_id)
values (
  '00000000-0000-0000-0000-000000000871',
  '00000000-0000-0000-0000-000000000861'
);

drop trigger if exists phase6_test_slow_link_group_insert on public.link_groups;
drop trigger if exists phase6_test_slow_link_insert on public.links;
drop function if exists public.phase6_test_slow_link_group_insert();
drop function if exists public.phase6_test_slow_link_insert();

create or replace function public.phase6_test_slow_link_group_insert()
returns trigger
language plpgsql
as $$
begin
  if new.heading like 'Concurrent group %' then
    perform pg_sleep(0.25);
  end if;
  return new;
end;
$$;
create or replace function public.phase6_test_slow_link_insert()
returns trigger
language plpgsql
as $$
begin
  if new.title like 'Concurrent link %' then
    perform pg_sleep(0.25);
  end if;
  return new;
end;
$$;
create trigger phase6_test_slow_link_group_insert
before insert on public.link_groups
for each row execute function public.phase6_test_slow_link_group_insert();
create trigger phase6_test_slow_link_insert
before insert on public.links
for each row execute function public.phase6_test_slow_link_insert();

select extensions.dblink_connect(
  'phase6_link_one',
  'host=db.supabase.internal port=5432 dbname=' || current_database()
    || ' user=postgres password=postgres'
);
select extensions.dblink_connect(
  'phase6_link_two',
  'host=db.supabase.internal port=5432 dbname=' || current_database()
    || ' user=postgres password=postgres'
);
select extensions.dblink_exec('phase6_link_one', 'set role authenticated');
select extensions.dblink_exec(
  'phase6_link_one',
  $$ set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000861' $$
);
select extensions.dblink_exec('phase6_link_two', 'set role authenticated');
select extensions.dblink_exec(
  'phase6_link_two',
  $$ set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000861' $$
);

select is(
  extensions.dblink_send_query(
    'phase6_link_one',
    $$ select * from public.create_link_group(
      '00000000-0000-0000-0000-000000000871', 'Concurrent group one'
    ) $$
  ),
  1,
  'The first group create starts asynchronously'
);
select is(
  extensions.dblink_send_query(
    'phase6_link_two',
    $$ select * from public.create_link_group(
      '00000000-0000-0000-0000-000000000871', 'Concurrent group two'
    ) $$
  ),
  1,
  'The second group create starts while the first transaction is open'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_one') as result(
      link_group_id uuid,
      dentistry_id uuid,
      heading varchar,
      rank integer
    )
  ),
  1,
  'The first concurrent group create commits one row'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_two') as result(
      link_group_id uuid,
      dentistry_id uuid,
      heading varchar,
      rank integer
    )
  ),
  1,
  'The second concurrent group create commits one row'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_one') as result(
      link_group_id uuid,
      dentistry_id uuid,
      heading varchar,
      rank integer
    )
  ),
  0,
  'The first asynchronous group result is fully consumed'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_two') as result(
      link_group_id uuid,
      dentistry_id uuid,
      heading varchar,
      rank integer
    )
  ),
  0,
  'The second asynchronous group result is fully consumed'
);
select results_eq(
  $$ select heading::text from public.link_groups
     where dentistry_id = '00000000-0000-0000-0000-000000000871'
     order by heading $$,
  $$ values ('Concurrent group one'::text), ('Concurrent group two'::text) $$,
  'Concurrent group creates retain both requested rows'
);
select results_eq(
  $$ select rank from public.link_groups
     where dentistry_id = '00000000-0000-0000-0000-000000000871'
     order by rank $$,
  $$ values (1), (2) $$,
  'Concurrent group creates serialize to distinct contiguous ranks regardless of scheduler order'
);

select link_group_id as concurrent_group_id
from public.link_groups where heading = 'Concurrent group one'
\gset

select is(
  extensions.dblink_send_query(
    'phase6_link_one',
    format(
      'select * from public.create_dentistry_link(%L,%L,%L,%L)',
      '00000000-0000-0000-0000-000000000871', :'concurrent_group_id',
      'Concurrent link one', 'https://one.example.test'
    )
  ),
  1,
  'The first link create starts asynchronously'
);
select is(
  extensions.dblink_send_query(
    'phase6_link_two',
    format(
      'select * from public.create_dentistry_link(%L,%L,%L,%L)',
      '00000000-0000-0000-0000-000000000871', :'concurrent_group_id',
      'Concurrent link two', 'https://two.example.test'
    )
  ),
  1,
  'The second link create starts while the first transaction is open'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_one') as result(
      link_id uuid,
      title varchar,
      link varchar,
      is_active boolean,
      rank integer,
      click_counter integer,
      image_url text,
      image_variant text,
      image_alt text,
      image_decorative boolean,
      is_featured boolean,
      analytics_campaign_id uuid
    )
  ),
  1,
  'The first concurrent link create commits one row'
);
select is(
  (
    select count(*)::integer
    from extensions.dblink_get_result('phase6_link_two') as result(
      link_id uuid,
      title varchar,
      link varchar,
      is_active boolean,
      rank integer,
      click_counter integer,
      image_url text,
      image_variant text,
      image_alt text,
      image_decorative boolean,
      is_featured boolean,
      analytics_campaign_id uuid
    )
  ),
  1,
  'The second concurrent link create commits one row'
);
select results_eq(
  format(
    $$ select links.title::text
       from public.dentistry_links join public.links using (link_id)
       where dentistry_links.link_group_id = %L
       order by links.title $$,
    :'concurrent_group_id'
  ),
  $$ values ('Concurrent link one'::text), ('Concurrent link two'::text) $$,
  'Concurrent link creates retain both requested rows'
);
select results_eq(
  format(
    $$ select links.rank
       from public.dentistry_links join public.links using (link_id)
       where dentistry_links.link_group_id = %L
       order by links.rank $$,
    :'concurrent_group_id'
  ),
  $$ values (1), (2) $$,
  'Concurrent link creates serialize to distinct contiguous ranks regardless of scheduler order'
);

select extensions.dblink_disconnect('phase6_link_one');
select extensions.dblink_disconnect('phase6_link_two');

delete from public.dentistries
where dentistry_id = '00000000-0000-0000-0000-000000000871';
delete from public.users
where id = '00000000-0000-0000-0000-000000000861';
drop trigger phase6_test_slow_link_group_insert on public.link_groups;
drop trigger phase6_test_slow_link_insert on public.links;
drop function public.phase6_test_slow_link_group_insert();
drop function public.phase6_test_slow_link_insert();
drop extension dblink;

select * from finish();
