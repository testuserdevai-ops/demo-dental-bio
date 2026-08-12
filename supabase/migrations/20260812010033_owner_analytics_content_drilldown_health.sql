create schema if not exists analytics_private;
revoke all on schema analytics_private from public, anon, authenticated;

alter table public.users
  add column analytics_timezone text not null default 'UTC'
  constraint users_analytics_timezone_length check (
    char_length(analytics_timezone) between 1 and 64
  );

alter table public.public_analytics_events
  add column content_label_snapshot text
  constraint public_analytics_content_label_snapshot_length check (
    content_label_snapshot is null
    or char_length(content_label_snapshot) between 1 and 120
  );

comment on column public.users.analytics_timezone is
  'Owner-selected IANA timezone used to display analytics timestamps. Daily event buckets remain UTC.';
comment on column public.public_analytics_events.content_label_snapshot is
  'Server-resolved owner content label captured at ingestion. This value is never accepted from the public event envelope.';

create or replace function analytics_private.resolve_content(
  p_profile_id uuid,
  p_action_type text,
  p_entity_uuid uuid,
  p_entity_bigint bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dentistry_id uuid;
  v_label text;
  v_exists boolean := true;
begin
  select d.dentistry_id into v_dentistry_id
  from public.dentistries d
  where d.user_id = p_profile_id;

  if p_entity_uuid is not null then
    if p_action_type = 'link_click' then
      select l.title into v_label
      from public.links l
      join public.dentistry_links dl on dl.link_id = l.link_id
      join public.link_groups lg on lg.link_group_id = dl.link_group_id
      where l.link_id = p_entity_uuid and lg.dentistry_id = v_dentistry_id;
      v_exists := found;
    elsif p_action_type in (
      'treatment_expand', 'treatment_cta_click', 'service_expand',
      'service_cta_click'
    ) then
      select t.title into v_label
      from public.treatments t
      join public.dentistry_treatments dt on dt.treatment_id = t.treatment_id
      where t.treatment_id = p_entity_uuid
        and dt.dentistry_id = v_dentistry_id;
      v_exists := found;
    elsif p_action_type in ('directions_click', 'map_open', 'location_select') then
      select coalesce(l.business_name, l.full_address, l.city) into v_label
      from public.locations l
      join public.dentistry_locations dl on dl.location_id = l.location_id
      where l.location_id = p_entity_uuid
        and dl.dentistry_id = v_dentistry_id;
      v_exists := found;
    else
      v_exists := false;
    end if;
  elsif p_entity_bigint is not null then
    if p_action_type = 'blog_click' then
      select b.title into v_label
      from public.blogs b
      join public.blog_groups bg on bg.id = b.group_id
      where b.id = p_entity_bigint and bg.user_id = p_profile_id;
      v_exists := found;
    elsif p_action_type = 'video_open' then
      select v.title into v_label
      from public.videos v
      join public.groups g on g.id = v.group_id
      where v.id = p_entity_bigint and g.user_id = p_profile_id;
      v_exists := found;
    elsif p_action_type = 'gallery_open' then
      select source.title into v_label
      from (
        select g.title from public.galleries g
        where g.id = p_entity_bigint and g.user_id = p_profile_id
        union all
        select gg.title from public.general_galleries gg
        where gg.id = p_entity_bigint and gg.user_id = p_profile_id
      ) source
      limit 1;
      v_exists := found;
    elsif p_action_type = 'product_click' then
      select p.name into v_label
      from public.products p
      where p.id = p_entity_bigint and p.user_id = p_profile_id;
      v_exists := found;
    elsif p_action_type = 'review_expand' then
      select coalesce(r.reviewer_name, r.platform) into v_label
      from public.reviews r
      where r.id = p_entity_bigint and r.user_id = p_profile_id;
      v_exists := found;
    elsif p_action_type = 'external_review_click' then
      select 'External reviews'::text into v_label
      from public.external_review_pages er
      where er.id = p_entity_bigint and er.user_id = p_profile_id;
      v_exists := found;
    else
      v_exists := false;
    end if;
  end if;

  v_label := left(nullif(btrim(v_label), ''), 120);
  return jsonb_build_object('exists', v_exists, 'label', v_label);
end;
$$;

revoke all on function analytics_private.resolve_content(uuid,text,uuid,bigint)
  from public, anon, authenticated;

create or replace function public.snapshot_public_analytics_content_label()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content jsonb;
begin
  if new.entity_uuid is null and new.entity_bigint is null then
    return new;
  end if;

  v_content := analytics_private.resolve_content(
    new.profile_id, new.action_type, new.entity_uuid, new.entity_bigint
  );
  new.content_label_snapshot := v_content ->> 'label';
  return new;
end;
$$;

revoke all on function public.snapshot_public_analytics_content_label()
  from public, anon, authenticated;

create trigger snapshot_public_analytics_content_label
before insert on public.public_analytics_events
for each row execute function public.snapshot_public_analytics_content_label();

drop function public.get_owner_analytics_content(uuid,date,date);

create function public.get_owner_analytics_content(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  action_type text,
  section text,
  entity_uuid uuid,
  entity_bigint bigint,
  group_uuid uuid,
  group_bigint bigint,
  action_dimension text,
  visible_position integer,
  total_events bigint,
  unique_visitors bigint,
  last_active_at timestamptz,
  content_label text,
  content_deleted boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_access boolean;
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;

  if (select auth.uid()) is null or not (
    (select auth.uid()) = p_profile_id
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.role = 'admin'
    )
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.subscription_status in ('PRO', 'PREMIUM PRO'))
  ) into v_full_access;

  if not v_full_access and p_start_date < p_end_date - 6 then
    raise exception 'Analytics date range is not available for this plan'
      using errcode = '42501';
  end if;

  return query
  with grouped as (
    select e.action_type, e.section, e.entity_uuid, e.entity_bigint,
      e.group_uuid, e.group_bigint, e.action_dimension,
      max(e.visible_position) as visible_position,
      count(*)::bigint as total_events,
      case when count(e.visitor_hash) > 0
        then count(distinct e.visitor_hash)::bigint else null::bigint end
        as unique_visitors,
      max(e.occurred_at) as last_active_at,
      (array_agg(e.content_label_snapshot order by e.occurred_at desc)
        filter (where e.content_label_snapshot is not null))[1]
        as snapshot_label
    from public.public_analytics_events e
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
      and (v_full_access or e.action_type <> all (array[
        'treatment_cta_click', 'service_cta_click', 'booking_click',
        'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
      ]))
    group by e.action_type, e.section, e.entity_uuid, e.entity_bigint,
      e.group_uuid, e.group_bigint, e.action_dimension
  ), resolved as (
    select grouped.*, content.value as current_content
    from grouped
    cross join lateral analytics_private.resolve_content(
      p_profile_id, grouped.action_type, grouped.entity_uuid,
      grouped.entity_bigint
    ) content(value)
  )
  select r.action_type, r.section, r.entity_uuid, r.entity_bigint,
    r.group_uuid, r.group_bigint, r.action_dimension, r.visible_position,
    r.total_events, r.unique_visitors, r.last_active_at,
    coalesce(r.current_content ->> 'label', r.snapshot_label),
    case
      when r.entity_uuid is null and r.entity_bigint is null then false
      else not coalesce((r.current_content ->> 'exists')::boolean, false)
    end
  from resolved r
  order by r.total_events desc, r.action_type, r.section;
end;
$$;

revoke all on function public.get_owner_analytics_content(uuid,date,date)
  from public, anon;
grant execute on function public.get_owner_analytics_content(uuid,date,date)
  to authenticated;

create or replace function public.set_owner_analytics_timezone(
  p_profile_id uuid,
  p_timezone text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (
    (select auth.uid()) = p_profile_id
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.role = 'admin'
    )
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_timezone is null or char_length(p_timezone) > 64 or not exists (
    select 1 from pg_catalog.pg_timezone_names t where t.name = p_timezone
  ) then
    raise exception 'Invalid reporting timezone' using errcode = '22023';
  end if;

  update public.users set analytics_timezone = p_timezone
  where id = p_profile_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  return p_timezone;
end;
$$;

revoke all on function public.set_owner_analytics_timezone(uuid,text)
  from public, anon;
grant execute on function public.set_owner_analytics_timezone(uuid,text)
  to authenticated;

create or replace function public.get_admin_analytics_health()
returns table (
  raw_events bigint,
  aggregate_events bigint,
  aggregate_drift bigint,
  profiles_with_drift bigint,
  latest_received_at timestamptz,
  oldest_received_at timestamptz,
  retention_overage bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  ) then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;

  return query
  with raw_by_profile as (
    select e.profile_id, count(*)::bigint as event_count
    from public.public_analytics_events e
    where e.event_date >= (now() at time zone 'UTC')::date - 6
    group by e.profile_id
  ), aggregate_by_profile as (
    select a.profile_id, coalesce(sum(a.total_events), 0)::bigint as event_count
    from public.public_analytics_daily_aggregates a
    where a.event_date >= (now() at time zone 'UTC')::date - 6
    group by a.profile_id
  ), compared as (
    select coalesce(r.profile_id, a.profile_id) as profile_id,
      coalesce(r.event_count, 0)::bigint as raw_count,
      coalesce(a.event_count, 0)::bigint as aggregate_count
    from raw_by_profile r
    full join aggregate_by_profile a on a.profile_id = r.profile_id
  )
  select coalesce(sum(c.raw_count), 0)::bigint,
    coalesce(sum(c.aggregate_count), 0)::bigint,
    coalesce(sum(abs(c.raw_count - c.aggregate_count)), 0)::bigint,
    count(*) filter (where c.raw_count <> c.aggregate_count)::bigint,
    (select max(e.received_at) from public.public_analytics_events e),
    (select min(e.received_at) from public.public_analytics_events e),
    (select count(*)::bigint from public.public_analytics_events e
      where e.received_at < now() - interval '400 days')
  from compared c;
end;
$$;

revoke all on function public.get_admin_analytics_health()
  from public, anon;
grant execute on function public.get_admin_analytics_health()
  to authenticated;
