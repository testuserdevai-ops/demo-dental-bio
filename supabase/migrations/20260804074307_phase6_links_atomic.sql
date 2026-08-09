-- Normalize legacy rows before tightening the originally nullable schema. Rows
-- without an owner/join target cannot be presented or authorized, so remove
-- only those invalid records. Duplicate joins are preserved by cloning the
-- shared link entity before the new one-owner invariant is applied.
delete from public.dentistry_links
where link_group_id is null or link_id is null;

with removed_joins as (
  delete from public.dentistry_links dentistry_links
  using public.link_groups link_groups
  where dentistry_links.link_group_id = link_groups.link_group_id
    and (
      link_groups.dentistry_id is null
      or nullif(btrim(link_groups.heading), '') is null
      or length(btrim(link_groups.heading)) > 100
    )
  returning dentistry_links.link_id
)
delete from public.links links
using removed_joins
where links.link_id = removed_joins.link_id
  and not exists (
    select 1 from public.dentistry_links remaining
    where remaining.link_id = links.link_id
  );

delete from public.link_groups
where dentistry_id is null
   or nullif(btrim(heading), '') is null
   or length(btrim(heading)) > 100;

with removed_joins as (
  delete from public.dentistry_links dentistry_links
  using public.links links
  where dentistry_links.link_id = links.link_id
    and (
      nullif(btrim(links.title), '') is null
      or length(btrim(links.title)) > 100
      or nullif(btrim(links.link), '') is null
      or length(btrim(links.link)) > 255
      or btrim(links.link) !~* '^https?://[^[:space:]]+$'
      or links.is_active is null
    )
  returning dentistry_links.link_id
)
delete from public.links links
using removed_joins
where links.link_id = removed_joins.link_id;

delete from public.links
where nullif(btrim(title), '') is null
   or length(btrim(title)) > 100
   or nullif(btrim(link), '') is null
   or length(btrim(link)) > 255
   or btrim(link) !~* '^https?://[^[:space:]]+$'
   or is_active is null;

do $$
declare
  duplicate_join record;
  cloned_link_id uuid;
begin
  for duplicate_join in
    select dentistry_links.dentistry_links_id, dentistry_links.link_id
    from (
      select dentistry_links.*,
             row_number() over (
               partition by dentistry_links.link_id
               order by dentistry_links.dentistry_links_id
             ) as occurrence
      from public.dentistry_links
    ) dentistry_links
    where dentistry_links.occurrence > 1
  loop
    insert into public.links (title, link, is_active, rank, click_counter)
    select links.title, links.link, links.is_active, links.rank,
           links.click_counter
    from public.links
    where links.link_id = duplicate_join.link_id
    returning link_id into cloned_link_id;

    update public.dentistry_links
    set link_id = cloned_link_id
    where dentistry_links_id = duplicate_join.dentistry_links_id;
  end loop;
end;
$$;

with ranked_groups as (
  select link_group_id,
         row_number() over (
           partition by dentistry_id
           order by rank nulls last, link_group_id
         )::integer as normalized_rank
  from public.link_groups
)
update public.link_groups link_groups
set rank = ranked_groups.normalized_rank
from ranked_groups
where ranked_groups.link_group_id = link_groups.link_group_id;

with ranked_links as (
  select links.link_id,
         row_number() over (
           partition by link_groups.link_group_id
           order by links.rank nulls last, links.link_id
         )::integer as normalized_rank
  from public.links
  join public.dentistry_links using (link_id)
  join public.link_groups using (link_group_id)
)
update public.links links
set rank = ranked_links.normalized_rank
from ranked_links
where ranked_links.link_id = links.link_id;

update public.links
set rank = 1
where rank is null or rank < 1;

alter table public.link_groups
  alter column dentistry_id set not null,
  alter column heading set not null,
  alter column rank set not null;

alter table public.dentistry_links
  alter column link_group_id set not null,
  alter column link_id set not null;

alter table public.links
  alter column title set not null,
  alter column link set not null,
  alter column is_active set not null,
  alter column rank set not null;

alter table public.link_groups
  add constraint link_groups_dentistry_rank_unique
    unique (dentistry_id, rank) deferrable initially deferred,
  add constraint link_groups_rank_positive check (rank > 0);

alter table public.dentistry_links
  add constraint dentistry_links_link_id_unique unique (link_id),
  add constraint dentistry_links_group_link_unique unique (link_group_id, link_id);

alter table public.links
  add constraint links_rank_positive check (rank > 0);

drop policy if exists "Enable insert for authenticated users only"
  on public.link_groups;
drop policy if exists "Enable update for users based on email"
  on public.link_groups;
drop policy if exists "Enable delete for users based on user_id"
  on public.link_groups;

create policy "Dashboard owners can insert link groups"
on public.link_groups
for insert
to authenticated
with check (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = link_groups.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can update link groups"
on public.link_groups
for update
to authenticated
using (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = link_groups.dentistry_id
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
    where dentistries.dentistry_id = link_groups.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can delete link groups"
on public.link_groups
for delete
to authenticated
using (
  exists (
    select 1
    from public.dentistries
    where dentistries.dentistry_id = link_groups.dentistry_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

drop policy if exists "Enable insert for authenticated users only"
  on public.dentistry_links;
drop policy if exists "Enable update for users based on email"
  on public.dentistry_links;
drop policy if exists "Enable delete for users based on user_id"
  on public.dentistry_links;

create policy "Dashboard owners can insert link joins"
on public.dentistry_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.link_groups
    join public.dentistries using (dentistry_id)
    where link_groups.link_group_id = dentistry_links.link_group_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can update link joins"
on public.dentistry_links
for update
to authenticated
using (
  exists (
    select 1
    from public.link_groups
    join public.dentistries using (dentistry_id)
    where link_groups.link_group_id = dentistry_links.link_group_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
)
with check (
  exists (
    select 1
    from public.link_groups
    join public.dentistries using (dentistry_id)
    where link_groups.link_group_id = dentistry_links.link_group_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

create policy "Dashboard owners can delete link joins"
on public.dentistry_links
for delete
to authenticated
using (
  exists (
    select 1
    from public.link_groups
    join public.dentistries using (dentistry_id)
    where link_groups.link_group_id = dentistry_links.link_group_id
      and (
        dentistries.user_id = (select auth.uid())
        or (select public.is_dashboard_admin())
      )
  )
);

drop policy if exists "Enable insert for authenticated users only"
  on public.links;
drop policy if exists "Enable update for users based on email"
  on public.links;
drop policy if exists "Enable delete for users based on user_id"
  on public.links;

revoke insert, update, delete on table public.link_groups
  from anon, authenticated;
revoke insert, update, delete on table public.dentistry_links
  from anon, authenticated;
revoke insert, update, delete on table public.links
  from anon, authenticated;

create or replace function public.create_link_group(
  p_dentistry_id uuid,
  p_heading text
)
returns setof public.link_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_rank integer;
  v_group public.link_groups%rowtype;
begin
  if nullif(btrim(p_heading), '') is null or length(btrim(p_heading)) > 255 then
    raise exception 'Invalid link group heading' using errcode = '22023';
  end if;

  select dentistries.user_id into v_owner_id
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
    raise exception 'Link target is not authorized' using errcode = '42501';
  end if;

  select coalesce(max(link_groups.rank), 0) + 1 into v_rank
  from public.link_groups
  where link_groups.dentistry_id = p_dentistry_id;

  insert into public.link_groups (dentistry_id, heading, rank)
  values (p_dentistry_id, btrim(p_heading), v_rank)
  returning * into v_group;
  return next v_group;
end;
$$;

create or replace function public.update_link_group(
  p_dentistry_id uuid,
  p_group_id uuid,
  p_heading text
)
returns setof public.link_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_group public.link_groups%rowtype;
begin
  if nullif(btrim(p_heading), '') is null or length(btrim(p_heading)) > 255 then
    raise exception 'Invalid link group heading' using errcode = '22023';
  end if;
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;

  update public.link_groups
  set heading = btrim(p_heading)
  where link_groups.link_group_id = p_group_id
    and link_groups.dentistry_id = p_dentistry_id
  returning * into v_group;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;
  return next v_group;
end;
$$;

create or replace function public.delete_link_group(
  p_dentistry_id uuid,
  p_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_link_ids uuid[];
begin
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;

  select array_agg(dentistry_links.link_id) into v_link_ids
  from public.dentistry_links
  where dentistry_links.link_group_id = p_group_id;

  delete from public.link_groups
  where link_groups.link_group_id = p_group_id
    and link_groups.dentistry_id = p_dentistry_id;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;

  if v_link_ids is not null then
    delete from public.links where links.link_id = any(v_link_ids);
  end if;

  with ordered as (
    select link_groups.link_group_id,
      row_number() over (order by link_groups.rank)::integer as rank
    from public.link_groups
    where link_groups.dentistry_id = p_dentistry_id
  )
  update public.link_groups
  set rank = ordered.rank
  from ordered
  where link_groups.link_group_id = ordered.link_group_id;
end;
$$;

create or replace function public.reorder_link_groups(
  p_dentistry_id uuid,
  p_group_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_expected integer;
  v_updated integer;
begin
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;

  select count(*)::integer into v_expected
  from public.link_groups where link_groups.dentistry_id = p_dentistry_id;
  if p_group_ids is null
    or cardinality(p_group_ids) <> v_expected
    or exists (select 1 from unnest(p_group_ids) as item(id) where id is null)
    or (select count(distinct id) from unnest(p_group_ids) as item(id)) <> v_expected
    or exists (
      select 1 from unnest(p_group_ids) as item(id)
      where not exists (
        select 1 from public.link_groups
        where link_groups.dentistry_id = p_dentistry_id
          and link_groups.link_group_id = item.id
      )
    )
  then raise exception 'Invalid link group order' using errcode = '22023'; end if;

  with ordered as (
    select id, ordinality::integer as rank
    from unnest(p_group_ids) with ordinality as item(id, ordinality)
  )
  update public.link_groups
  set rank = ordered.rank
  from ordered
  where link_groups.dentistry_id = p_dentistry_id
    and link_groups.link_group_id = ordered.id;
  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Invalid link group order' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.create_dentistry_link(
  p_dentistry_id uuid,
  p_group_id uuid,
  p_title text,
  p_url text
)
returns setof public.links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_rank integer;
  v_link public.links%rowtype;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 255 then
    raise exception 'Invalid link title' using errcode = '22023';
  end if;
  if nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 255
    or btrim(p_url) !~* '^https?://[^[:space:]]+$'
  then raise exception 'Invalid link URL' using errcode = '22023'; end if;

  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;

  perform 1 from public.link_groups
  where link_groups.link_group_id = p_group_id
    and link_groups.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;

  select coalesce(max(links.rank), 0) + 1 into v_rank
  from public.dentistry_links
  join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id;

  insert into public.links (title, link, is_active, rank)
  values (btrim(p_title), btrim(p_url), true, v_rank)
  returning * into v_link;
  insert into public.dentistry_links (link_group_id, link_id)
  values (p_group_id, v_link.link_id);
  return next v_link;
end;
$$;

create or replace function public.update_dentistry_link(
  p_dentistry_id uuid,
  p_group_id uuid,
  p_link_id uuid,
  p_title text,
  p_url text,
  p_is_active boolean
)
returns setof public.links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_link public.links%rowtype;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 255 then
    raise exception 'Invalid link title' using errcode = '22023';
  end if;
  if nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 255
    or btrim(p_url) !~* '^https?://[^[:space:]]+$' or p_is_active is null
  then raise exception 'Invalid link input' using errcode = '22023'; end if;
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.dentistry_links
    join public.link_groups using (link_group_id)
    where dentistry_links.link_group_id = p_group_id
      and dentistry_links.link_id = p_link_id
      and link_groups.dentistry_id = p_dentistry_id
  ) then raise exception 'Link not found' using errcode = 'P0002'; end if;

  update public.links set
    title = btrim(p_title), link = btrim(p_url), is_active = p_is_active
  where links.link_id = p_link_id
  returning * into v_link;
  if not found then raise exception 'Link not found' using errcode = 'P0002'; end if;
  return next v_link;
end;
$$;

create or replace function public.delete_dentistry_link(
  p_dentistry_id uuid,
  p_group_id uuid,
  p_link_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.dentistry_links
    join public.link_groups using (link_group_id)
    where dentistry_links.link_group_id = p_group_id
      and dentistry_links.link_id = p_link_id
      and link_groups.dentistry_id = p_dentistry_id
  ) then raise exception 'Link not found' using errcode = 'P0002'; end if;

  delete from public.dentistry_links
  where dentistry_links.link_group_id = p_group_id
    and dentistry_links.link_id = p_link_id;
  delete from public.links where links.link_id = p_link_id;

  with ordered as (
    select links.link_id,
      row_number() over (order by links.rank)::integer as rank
    from public.dentistry_links
    join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id
  )
  update public.links set rank = ordered.rank
  from ordered where links.link_id = ordered.link_id;
end;
$$;

create or replace function public.reorder_dentistry_links(
  p_dentistry_id uuid,
  p_group_id uuid,
  p_link_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_expected integer;
  v_updated integer;
begin
  select dentistries.user_id into v_owner_id
  from public.dentistries
  where dentistries.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid())
    and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  perform 1 from public.link_groups
  where link_groups.link_group_id = p_group_id
    and link_groups.dentistry_id = p_dentistry_id
  for update;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;

  select count(*)::integer into v_expected
  from public.dentistry_links where dentistry_links.link_group_id = p_group_id;
  if p_link_ids is null
    or cardinality(p_link_ids) <> v_expected
    or exists (select 1 from unnest(p_link_ids) as item(id) where id is null)
    or (select count(distinct id) from unnest(p_link_ids) as item(id)) <> v_expected
    or exists (
      select 1 from unnest(p_link_ids) as item(id)
      where not exists (
        select 1 from public.dentistry_links
        where dentistry_links.link_group_id = p_group_id
          and dentistry_links.link_id = item.id
      )
    )
  then raise exception 'Invalid link order' using errcode = '22023'; end if;

  with ordered as (
    select id, ordinality::integer as rank
    from unnest(p_link_ids) with ordinality as item(id, ordinality)
  )
  update public.links set rank = ordered.rank
  from ordered
  where links.link_id = ordered.id;
  get diagnostics v_updated = row_count;
  if v_updated <> v_expected then
    raise exception 'Invalid link order' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.create_link_group(uuid, text) from public, anon;
revoke all on function public.update_link_group(uuid, uuid, text) from public, anon;
revoke all on function public.delete_link_group(uuid, uuid) from public, anon;
revoke all on function public.reorder_link_groups(uuid, uuid[]) from public, anon;
revoke all on function public.create_dentistry_link(uuid, uuid, text, text) from public, anon;
revoke all on function public.update_dentistry_link(uuid, uuid, uuid, text, text, boolean) from public, anon;
revoke all on function public.delete_dentistry_link(uuid, uuid, uuid) from public, anon;
revoke all on function public.reorder_dentistry_links(uuid, uuid, uuid[]) from public, anon;

grant execute on function public.create_link_group(uuid, text) to authenticated;
grant execute on function public.update_link_group(uuid, uuid, text) to authenticated;
grant execute on function public.delete_link_group(uuid, uuid) to authenticated;
grant execute on function public.reorder_link_groups(uuid, uuid[]) to authenticated;
grant execute on function public.create_dentistry_link(uuid, uuid, text, text) to authenticated;
grant execute on function public.update_dentistry_link(uuid, uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.delete_dentistry_link(uuid, uuid, uuid) to authenticated;
grant execute on function public.reorder_dentistry_links(uuid, uuid, uuid[]) to authenticated;
