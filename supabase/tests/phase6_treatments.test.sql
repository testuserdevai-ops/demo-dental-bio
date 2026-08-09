begin;

select no_plan();

select
  '00000000-0000-0000-0000-000000000501'::uuid as owner_id,
  '00000000-0000-0000-0000-000000000502'::uuid as other_id,
  '00000000-0000-0000-0000-000000000503'::uuid as admin_id,
  '00000000-0000-0000-0000-000000000504'::uuid as attacker_id,
  '00000000-0000-0000-0000-000000000511'::uuid as owner_dentistry_id,
  '00000000-0000-0000-0000-000000000512'::uuid as other_dentistry_id
\gset

insert into public.users (id, email, username, role)
values
  (:'owner_id', 'treatment-owner@example.test', 'treatment-owner', 'user'),
  (:'other_id', 'treatment-other@example.test', 'treatment-other', 'user'),
  (:'admin_id', 'treatment-admin@example.test', 'treatment-admin', 'admin'),
  (:'attacker_id', 'treatment-attacker@example.test', 'treatment-attacker', 'user');

insert into public.dentistries (dentistry_id, user_id)
values
  (:'owner_dentistry_id', :'owner_id'),
  (:'other_dentistry_id', :'other_id');

create function pg_temp.fail_treatment_join()
returns trigger
language plpgsql
as $$
begin
  if current_setting('phase6.fail_treatment_join', true) = 'on' then
    raise exception 'Injected treatment join failure';
  end if;
  return new;
end;
$$;

create trigger phase6_fail_treatment_join
before insert on public.dentistry_treatments
for each row execute function pg_temp.fail_treatment_join();

select has_function(
  'public',
  'create_dentistry_treatment',
  array['uuid', 'text', 'text', 'boolean'],
  'Treatment creation has one restricted transaction function'
);
select has_function(
  'public',
  'update_dentistry_treatment',
  array['uuid', 'uuid', 'text', 'text'],
  'Treatment updates have one restricted transaction function'
);
select has_function(
  'public',
  'delete_dentistry_treatment',
  array['uuid', 'uuid'],
  'Treatment deletion has one restricted transaction function'
);
select has_function(
  'public',
  'reorder_dentistry_treatments',
  array['uuid', 'uuid[]'],
  'Treatment ordering has one restricted transaction function'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.create_dentistry_treatment(uuid,text,text,boolean)',
    'execute'
  ),
  'Anonymous callers cannot execute treatment writes'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.update_dentistry_treatment(uuid,uuid,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.delete_dentistry_treatment(uuid,uuid)',
    'execute'
  )
  and not has_function_privilege(
    'anon',
    'public.reorder_dentistry_treatments(uuid,uuid[])',
    'execute'
  ),
  'Anonymous callers cannot execute update, delete, or reorder functions'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_dentistry_treatment(uuid,text,text,boolean)',
    'execute'
  ),
  'Authenticated callers can execute the authorized treatment boundary'
);
select col_is_unique(
  'public',
  'dentistry_treatments',
  'treatment_id',
  'A treatment entity belongs to exactly one dentistry'
);
select has_index(
  'public',
  'dentistry_treatments',
  'dentistry_treatments_dentistry_rank_unique',
  'Scoped ranks have a database concurrency backstop'
);
select matches(
  pg_get_functiondef(
    'public.create_dentistry_treatment(uuid,text,text,boolean)'::regprocedure
  ),
  'for update',
  'Create serializes rank allocation by locking the scoped dentistry row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.treatments (title) values ('Direct write') $$,
  '42501',
  null,
  'Authenticated callers cannot mutate standalone treatments directly'
);
select throws_ok(
  $$ insert into public.dentistry_treatments (dentistry_id, treatment_id, rank)
     values ('00000000-0000-0000-0000-000000000511', gen_random_uuid(), 1) $$,
  '42501',
  null,
  'Authenticated callers cannot mutate treatment joins directly'
);
select throws_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000512',
       'Cross-owner treatment',
       'Denied',
       false
     ) $$,
  '42501',
  null,
  'An owner cannot create a treatment for another profile'
);
select throws_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000599',
       'Unknown profile',
       'Denied',
       false
     ) $$,
  'P0002',
  null,
  'An unknown target fails closed'
);

select lives_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000511',
       'Owner treatment',
       'First description',
       false
     ) $$,
  'An owner can create a treatment atomically'
);
select lives_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000511',
       'Owner service',
       'Second description',
       true
     ) $$,
  'A second create receives the next scoped rank'
);
select set_config('phase6.fail_treatment_join', 'on', true);
select throws_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000511',
       'Rolled back treatment',
       'The join write fails',
       false
     ) $$,
  'P0001',
  'Injected treatment join failure',
  'A failed second write aborts the atomic create'
);
select set_config('phase6.fail_treatment_join', 'off', true);
select is(
  (select count(*)::integer from public.treatments where title = 'Rolled back treatment'),
  0,
  'A failed join write leaves no orphan treatment entity'
);
select results_eq(
  $$
    select t.title::text, dt.rank
    from public.dentistry_treatments dt
    join public.treatments t on t.treatment_id = dt.treatment_id
    where dt.dentistry_id = '00000000-0000-0000-0000-000000000511'
    order by dt.rank
  $$,
  $$ values ('Owner treatment'::text, 1), ('Owner service'::text, 2) $$,
  'Committed treatment ranks are contiguous and one-based'
);

select treatment_id as first_treatment_id
from public.treatments
where title = 'Owner treatment'
\gset
select treatment_id as second_treatment_id
from public.treatments
where title = 'Owner service'
\gset

select lives_ok(
  format(
    'select * from public.update_dentistry_treatment(%L, %L, %L, %L)',
    :'owner_dentistry_id',
    :'first_treatment_id',
    'Updated treatment',
    'Updated description'
  ),
  'An owner can update only a scoped treatment'
);
select is(
  (select title from public.treatments where treatment_id = :'first_treatment_id'),
  'Updated treatment',
  'The authorized update persists'
);

select throws_ok(
  format(
    'select public.reorder_dentistry_treatments(%L, array[%L::uuid, %L::uuid])',
    :'owner_dentistry_id',
    :'first_treatment_id',
    :'first_treatment_id'
  ),
  '22023',
  null,
  'Duplicate reorder IDs fail exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_dentistry_treatments(%L, array[%L::uuid])',
    :'owner_dentistry_id',
    :'first_treatment_id'
  ),
  '22023',
  null,
  'Omitted reorder IDs fail exact-set validation'
);
select results_eq(
  $$
    select treatment_id, rank
    from public.dentistry_treatments
    where dentistry_id = '00000000-0000-0000-0000-000000000511'
    order by rank
  $$,
  format(
    'values (%L::uuid, 1), (%L::uuid, 2)',
    :'first_treatment_id',
    :'second_treatment_id'
  ),
  'Failed reorder attempts preserve the previous ranks'
);
select lives_ok(
  format(
    'select public.reorder_dentistry_treatments(%L, array[%L::uuid, %L::uuid])',
    :'owner_dentistry_id',
    :'second_treatment_id',
    :'first_treatment_id'
  ),
  'An exact ordered set is accepted'
);
select results_eq(
  $$
    select treatment_id, rank
    from public.dentistry_treatments
    where dentistry_id = '00000000-0000-0000-0000-000000000511'
    order by rank
  $$,
  format(
    'values (%L::uuid, 1), (%L::uuid, 2)',
    :'second_treatment_id',
    :'first_treatment_id'
  ),
  'Reorder persists the submitted one-based order'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select lives_ok(
  $$ select * from public.create_dentistry_treatment(
       '00000000-0000-0000-0000-000000000512',
       'Admin target service',
       'Authorized target',
       true
     ) $$,
  'A database-authorized admin can create for an existing target'
);
select treatment_id as foreign_treatment_id
from public.treatments
where title = 'Admin target service'
\gset

set local role authenticated;
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok(
  format(
    'select public.reorder_dentistry_treatments(%L, array[%L::uuid, %L::uuid])',
    :'owner_dentistry_id',
    :'first_treatment_id',
    :'foreign_treatment_id'
  ),
  '22023',
  null,
  'A foreign treatment ID fails exact-set validation'
);
select throws_ok(
  format(
    'select public.reorder_dentistry_treatments(%L, array[%L::uuid, %L::uuid])',
    :'owner_dentistry_id',
    :'first_treatment_id',
    '00000000-0000-0000-0000-000000000599'
  ),
  '22023',
  null,
  'A missing treatment ID fails exact-set validation'
);
select lives_ok(
  format(
    'select public.delete_dentistry_treatment(%L, %L)',
    :'owner_dentistry_id',
    :'second_treatment_id'
  ),
  'An owner can delete a scoped treatment atomically'
);
select is(
  (select count(*)::integer from public.treatments where treatment_id = :'second_treatment_id'),
  0,
  'Delete removes the standalone entity'
);
select is(
  (
    select rank
    from public.dentistry_treatments
    where dentistry_id = :'owner_dentistry_id'
      and treatment_id = :'first_treatment_id'
  ),
  1,
  'Delete compacts the remaining scoped order'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', :'attacker_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq(
  $$
    update public.dentistries
    set user_id = '00000000-0000-0000-0000-000000000504'
    where dentistry_id = '00000000-0000-0000-0000-000000000512'
    returning dentistry_id
  $$,
  $$ values (null::uuid) limit 0 $$,
  'An authenticated user cannot seize another dentistry before calling treatment RPCs'
);

select * from finish();
rollback;
