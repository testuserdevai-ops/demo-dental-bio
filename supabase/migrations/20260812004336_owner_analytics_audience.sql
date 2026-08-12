create or replace function public.get_owner_analytics_audience(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  dimension_type text,
  dimension_value text,
  total_views bigint,
  unique_visitors bigint,
  is_suppressed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;

  if (select auth.uid()) is null or not (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.role = 'admin'
    )
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.id = p_profile_id
        and u.subscription_status in ('PRO', 'PREMIUM PRO')
    )
  ) then
    raise exception 'Audience analytics plan or ownership does not allow access' using errcode = '42501';
  end if;

  return query
  with normalized as (
    select 'source'::text as dimension_type,
      coalesce(e.attribution_source, 'unattributed')::text as dimension_value,
      e.visitor_hash
    from public.public_analytics_events e
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
      and e.action_type = 'profile_view'
    union all
    select 'referrer_domain'::text,
      coalesce(e.referrer_domain, 'none')::text,
      e.visitor_hash
    from public.public_analytics_events e
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
      and e.action_type = 'profile_view'
    union all
    select 'device_class'::text,
      e.device_class::text,
      e.visitor_hash
    from public.public_analytics_events e
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
      and e.action_type = 'profile_view'
  ), buckets as (
    select n.dimension_type, n.dimension_value, count(*)::bigint as total_views,
      case when count(n.visitor_hash) > 0
        then count(distinct n.visitor_hash)::bigint else null::bigint end as unique_visitors
    from normalized n
    group by n.dimension_type, n.dimension_value
  ), visible as (
    select b.dimension_type, b.dimension_value, b.total_views,
      b.unique_visitors, false as is_suppressed
    from buckets b
    where b.total_views >= 5
  ), suppressed as (
    select b.dimension_type, 'other'::text as dimension_value,
      sum(b.total_views)::bigint as total_views,
      null::bigint as unique_visitors,
      true as is_suppressed
    from buckets b
    where b.total_views < 5
    group by b.dimension_type
    having sum(b.total_views) >= 5
  )
  select r.dimension_type, r.dimension_value, r.total_views,
    r.unique_visitors, r.is_suppressed
  from (
    select * from visible
    union all
    select * from suppressed
  ) r
  order by r.dimension_type, r.is_suppressed, r.total_views desc, r.dimension_value;
end;
$$;

revoke all on function public.get_owner_analytics_audience(uuid,date,date)
  from public, anon;
grant execute on function public.get_owner_analytics_audience(uuid,date,date)
  to authenticated;
