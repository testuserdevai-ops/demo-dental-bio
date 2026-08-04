alter table public.dentistry_treatments
  alter column dentistry_id set not null,
  alter column treatment_id set not null,
  alter column rank set not null;

alter table public.dentistry_treatments
  add constraint dentistry_treatments_treatment_id_unique unique (treatment_id),
  add constraint dentistry_treatments_dentistry_rank_unique
    unique (dentistry_id, rank) deferrable initially deferred,
  add constraint dentistry_treatments_rank_positive check (rank > 0);

drop policy if exists "Enable insert for authenticated users only"
  on public.dentistry_treatments;
drop policy if exists "Enable update for users based on email"
  on public.dentistry_treatments;
drop policy if exists "Enable delete for users based on user_id"
  on public.dentistry_treatments;

create policy "Dashboard owners can insert treatment joins"
on public.dentistry_treatments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = dentistry_treatments.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can update treatment joins"
on public.dentistry_treatments
for update
to authenticated
using (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = dentistry_treatments.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
)
with check (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = dentistry_treatments.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can delete treatment joins"
on public.dentistry_treatments
for delete
to authenticated
using (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = dentistry_treatments.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

drop policy if exists "Enable insert for authenticated users only"
  on public.treatments;
drop policy if exists "Enable update for users based on email"
  on public.treatments;
drop policy if exists "Enable delete for users based on user_id"
  on public.treatments;

revoke insert, update, delete on table public.treatments
  from anon, authenticated;
revoke insert, update, delete on table public.dentistry_treatments
  from anon, authenticated;

create or replace function public.create_dentistry_treatment(
  p_dentistry_id uuid,
  p_title text,
  p_description text,
  p_is_service boolean
)
returns setof public.treatments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_rank integer;
  v_treatment public.treatments%rowtype;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100 then
    raise exception 'Invalid treatment title' using errcode = '22023';
  end if;
  if nullif(btrim(p_description), '') is null or length(btrim(p_description)) > 200 then
    raise exception 'Invalid treatment description' using errcode = '22023';
  end if;
  if p_is_service is null then
    raise exception 'Treatment kind is required' using errcode = '22023';
  end if;

  select dentistries.user_id
  into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;

  if not found then
    raise exception 'Dentistry not found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Treatment target is not authorized' using errcode = '42501';
  end if;

  select coalesce(max(dentistry_treatments.rank), 0) + 1
  into v_rank
  from public.dentistry_treatments
  where dentistry_treatments.dentistry_id = p_dentistry_id;

  insert into public.treatments (title, description, "isService")
  values (btrim(p_title), btrim(p_description), p_is_service)
  returning * into v_treatment;

  insert into public.dentistry_treatments (
    dentistry_id,
    treatment_id,
    rank
  ) values (
    p_dentistry_id,
    v_treatment.treatment_id,
    v_rank
  );

  return next v_treatment;
end;
$$;

create or replace function public.update_dentistry_treatment(
  p_dentistry_id uuid,
  p_treatment_id uuid,
  p_title text,
  p_description text
)
returns setof public.treatments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_treatment public.treatments%rowtype;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100 then
    raise exception 'Invalid treatment title' using errcode = '22023';
  end if;
  if nullif(btrim(p_description), '') is null or length(btrim(p_description)) > 200 then
    raise exception 'Invalid treatment description' using errcode = '22023';
  end if;

  select dentistries.user_id
  into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;

  if not found then
    raise exception 'Dentistry not found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Treatment target is not authorized' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.dentistry_treatments
    where dentistry_treatments.dentistry_id = p_dentistry_id
      and dentistry_treatments.treatment_id = p_treatment_id
  ) then
    raise exception 'Treatment not found' using errcode = 'P0002';
  end if;

  update public.treatments
  set title = btrim(p_title),
      description = btrim(p_description)
  where treatments.treatment_id = p_treatment_id
  returning * into v_treatment;

  if not found then
    raise exception 'Treatment not found' using errcode = 'P0002';
  end if;

  return next v_treatment;
end;
$$;

create or replace function public.delete_dentistry_treatment(
  p_dentistry_id uuid,
  p_treatment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  select dentistries.user_id
  into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;

  if not found then
    raise exception 'Dentistry not found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Treatment target is not authorized' using errcode = '42501';
  end if;

  delete from public.dentistry_treatments
  where dentistry_treatments.dentistry_id = p_dentistry_id
    and dentistry_treatments.treatment_id = p_treatment_id;

  if not found then
    raise exception 'Treatment not found' using errcode = 'P0002';
  end if;

  delete from public.treatments
  where treatments.treatment_id = p_treatment_id;

  with ordered as (
    select
      dentistry_treatments.dentistry_treatment_id,
      row_number() over (order by dentistry_treatments.rank)::integer as rank
    from public.dentistry_treatments
    where dentistry_treatments.dentistry_id = p_dentistry_id
  )
  update public.dentistry_treatments
  set rank = ordered.rank
  from ordered
  where dentistry_treatments.dentistry_treatment_id = ordered.dentistry_treatment_id;
end;
$$;

create or replace function public.reorder_dentistry_treatments(
  p_dentistry_id uuid,
  p_treatment_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_existing_count integer;
  v_distinct_count integer;
  v_matching_count integer;
  v_updated_count integer;
begin
  select dentistries.user_id
  into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;

  if not found then
    raise exception 'Dentistry not found' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then
    raise exception 'Treatment target is not authorized' using errcode = '42501';
  end if;
  if p_treatment_ids is null or cardinality(p_treatment_ids) = 0 then
    raise exception 'Treatment order must not be empty' using errcode = '22023';
  end if;

  perform 1
  from public.dentistry_treatments
  where dentistry_treatments.dentistry_id = p_dentistry_id
  for update;

  select count(*)::integer
  into v_existing_count
  from public.dentistry_treatments
  where dentistry_treatments.dentistry_id = p_dentistry_id;

  select count(distinct treatment_id)::integer
  into v_distinct_count
  from unnest(p_treatment_ids) as treatment_id;

  select count(*)::integer
  into v_matching_count
  from public.dentistry_treatments
  where dentistry_treatments.dentistry_id = p_dentistry_id
    and dentistry_treatments.treatment_id = any(p_treatment_ids);

  if cardinality(p_treatment_ids) <> v_existing_count
    or v_distinct_count <> cardinality(p_treatment_ids)
    or v_matching_count <> v_existing_count then
    raise exception 'Treatment order must match the exact scoped set'
      using errcode = '22023';
  end if;

  with requested as (
    select ordered.treatment_id, ordered.rank::integer
    from unnest(p_treatment_ids) with ordinality
      as ordered(treatment_id, rank)
  )
  update public.dentistry_treatments
  set rank = requested.rank
  from requested
  where dentistry_treatments.dentistry_id = p_dentistry_id
    and dentistry_treatments.treatment_id = requested.treatment_id;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> v_existing_count then
    raise exception 'Treatment order changed concurrently'
      using errcode = '40001';
  end if;
end;
$$;

revoke all on function public.create_dentistry_treatment(uuid, text, text, boolean)
  from public, anon;
revoke all on function public.update_dentistry_treatment(uuid, uuid, text, text)
  from public, anon;
revoke all on function public.delete_dentistry_treatment(uuid, uuid)
  from public, anon;
revoke all on function public.reorder_dentistry_treatments(uuid, uuid[])
  from public, anon;

grant execute on function public.create_dentistry_treatment(uuid, text, text, boolean)
  to authenticated;
grant execute on function public.update_dentistry_treatment(uuid, uuid, text, text)
  to authenticated;
grant execute on function public.delete_dentistry_treatment(uuid, uuid)
  to authenticated;
grant execute on function public.reorder_dentistry_treatments(uuid, uuid[])
  to authenticated;
