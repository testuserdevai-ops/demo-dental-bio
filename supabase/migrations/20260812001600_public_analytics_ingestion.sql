create table public.public_analytics_events (
  event_id uuid primary key,
  schema_version smallint not null check (schema_version = 1),
  profile_id uuid not null references public.users(id) on delete cascade,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  event_date date not null,
  action_type text not null check (action_type = any (array[
    'profile_view', 'link_click', 'blog_click', 'video_open', 'gallery_open',
    'product_click', 'external_review_click', 'review_expand',
    'treatment_expand', 'treatment_cta_click', 'service_expand',
    'service_cta_click', 'cta_click', 'booking_click', 'directions_click',
    'map_open', 'location_select', 'email_click', 'phone_click',
    'social_click', 'share_click', 'share_open', 'navigation_click',
    'enquiry_start', 'enquiry_submit'
  ])),
  section text not null check (section = any (array[
    'header', 'profile', 'navigation', 'links', 'treatments', 'services',
    'blogs', 'videos', 'gallery', 'reviews', 'shop', 'locations', 'footer',
    'share'
  ])),
  visible_position integer check (visible_position > 0),
  entity_uuid uuid,
  entity_bigint bigint check (entity_bigint > 0),
  group_uuid uuid,
  group_bigint bigint check (group_bigint > 0),
  action_dimension text check (char_length(action_dimension) between 1 and 32),
  consent_state text not null check (consent_state in ('granted', 'not_required')),
  referrer_domain text check (char_length(referrer_domain) <= 253),
  attribution_source text check (attribution_source in ('direct', 'search', 'social', 'referral', 'campaign')),
  utm_source text check (utm_source in ('google', 'bing', 'facebook', 'instagram', 'linkedin', 'tiktok', 'email', 'partner')),
  utm_medium text check (utm_medium in ('organic', 'cpc', 'paid_social', 'social', 'email', 'referral', 'display', 'qr', 'offline')),
  utm_campaign text check (utm_campaign in ('brand', 'booking', 'profile', 'seasonal', 'partner')),
  device_class text not null check (device_class in ('mobile', 'tablet', 'desktop', 'unknown')),
  visitor_hash text check (visitor_hash ~ '^[0-9a-f]{64}$'),
  session_hash text check (session_hash ~ '^[0-9a-f]{64}$'),
  request_hash text check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint public_analytics_one_entity_kind check (num_nonnulls(entity_uuid, entity_bigint) <= 1),
  constraint public_analytics_one_group_kind check (num_nonnulls(group_uuid, group_bigint) <= 1),
  constraint public_analytics_received_window check (
    occurred_at >= received_at - interval '7 days'
    and occurred_at <= received_at + interval '5 minutes'
  )
);

comment on table public.public_analytics_events is
  'Append-only, privacy-minimized public profile interaction events. No free-form content, URLs, IP addresses, or raw browser identifiers.';

create index public_analytics_events_profile_date_idx
  on public.public_analytics_events (profile_id, event_date desc);
create index public_analytics_events_profile_action_date_idx
  on public.public_analytics_events (profile_id, action_type, event_date desc);
create index public_analytics_events_rate_idx
  on public.public_analytics_events (profile_id, request_hash, received_at desc);
create index public_analytics_events_retention_idx
  on public.public_analytics_events (received_at);

create table public.public_analytics_daily_aggregates (
  profile_id uuid not null references public.users(id) on delete cascade,
  event_date date not null,
  dimension_key text not null check (dimension_key ~ '^[0-9a-f]{64}$'),
  action_type text not null,
  section text not null,
  entity_uuid uuid,
  entity_bigint bigint,
  action_dimension text,
  total_events bigint not null default 0 check (total_events >= 0),
  primary key (profile_id, event_date, dimension_key)
);

comment on table public.public_analytics_daily_aggregates is
  'Daily controlled-dimension rollups derived transactionally from immutable raw analytics events.';

create index public_analytics_daily_profile_date_idx
  on public.public_analytics_daily_aggregates (profile_id, event_date desc);

alter table public.public_analytics_events enable row level security;
alter table public.public_analytics_daily_aggregates enable row level security;

revoke all on table public.public_analytics_events from public, anon, authenticated;
revoke all on table public.public_analytics_daily_aggregates from public, anon, authenticated;

create or replace function public.protect_public_analytics_events()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
     and (current_setting('app.analytics_retention', true) = 'enabled'
          or pg_trigger_depth() > 1) then
    return old;
  end if;

  raise exception 'Analytics events are append-only' using errcode = '55000';
end;
$$;

create trigger protect_public_analytics_events
before update or delete on public.public_analytics_events
for each row execute function public.protect_public_analytics_events();

create or replace function public.aggregate_public_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dimension_key text;
begin
  v_dimension_key := encode(
    extensions.digest(
      concat_ws('|', new.action_type, new.section, new.entity_uuid::text,
        new.entity_bigint::text, new.action_dimension),
      'sha256'
    ),
    'hex'
  );

  insert into public.public_analytics_daily_aggregates (
    profile_id, event_date, dimension_key, action_type, section,
    entity_uuid, entity_bigint, action_dimension, total_events
  ) values (
    new.profile_id, new.event_date, v_dimension_key, new.action_type, new.section,
    new.entity_uuid, new.entity_bigint, new.action_dimension, 1
  )
  on conflict (profile_id, event_date, dimension_key)
  do update set total_events = public.public_analytics_daily_aggregates.total_events + 1;

  return new;
end;
$$;

create trigger aggregate_public_analytics_event
after insert on public.public_analytics_events
for each row execute function public.aggregate_public_analytics_event();

create or replace function public.ingest_public_analytics_event(
  p_event_id uuid,
  p_schema_version smallint,
  p_profile_id uuid,
  p_occurred_at timestamptz,
  p_action_type text,
  p_section text,
  p_visible_position integer,
  p_entity_uuid uuid,
  p_entity_bigint bigint,
  p_group_uuid uuid,
  p_group_bigint bigint,
  p_action_dimension text,
  p_consent_state text,
  p_referrer_domain text,
  p_attribution_source text,
  p_utm_source text,
  p_utm_medium text,
  p_utm_campaign text,
  p_device_class text,
  p_visitor_hash text,
  p_session_hash text,
  p_request_hash text
)
returns table (status text, accepted_event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dentistry_id uuid;
  v_owned boolean := false;
  v_existing uuid;
begin
  select e.event_id into v_existing
  from public.public_analytics_events e
  where e.event_id = p_event_id;

  if v_existing is not null then
    return query select 'duplicate'::text, v_existing;
    return;
  end if;

  if p_schema_version <> 1
     or p_consent_state not in ('granted', 'not_required')
     or (p_request_hash is not null and p_request_hash !~ '^[0-9a-f]{64}$')
     or (p_visitor_hash is not null and p_visitor_hash !~ '^[0-9a-f]{64}$')
     or (p_session_hash is not null and p_session_hash !~ '^[0-9a-f]{64}$')
     or (p_consent_state = 'not_required' and num_nonnulls(
       p_visitor_hash, p_session_hash, p_request_hash
     ) > 0) then
    raise exception 'Invalid analytics envelope' using errcode = '22023';
  end if;

  select d.dentistry_id into v_dentistry_id
  from public.dentistries d
  join public.public_profiles p on p.profile_id = d.user_id
  where d.user_id = p_profile_id;

  if v_dentistry_id is null then
    raise exception 'Profile is not publicly reportable' using errcode = '22023';
  end if;

  if p_action_type = 'link_click' and p_entity_uuid is not null and p_entity_bigint is null then
    select exists (
      select 1 from public.links l
      join public.dentistry_links dl on dl.link_id = l.link_id
      join public.link_groups lg on lg.link_group_id = dl.link_group_id
      where l.link_id = p_entity_uuid and l.is_active
        and lg.dentistry_id = v_dentistry_id
        and (p_group_uuid is null or p_group_uuid = lg.link_group_id)
    ) into v_owned;
  elsif p_action_type = 'blog_click' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (
      select 1 from public.blogs b
      join public.blog_groups bg on bg.id = b.group_id
      where b.id = p_entity_bigint and b.enabled is true and bg.enabled is true
        and bg.user_id = p_profile_id
        and (p_group_bigint is null or p_group_bigint = bg.id)
    ) into v_owned;
  elsif p_action_type = 'video_open' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (
      select 1 from public.videos v
      join public.groups g on g.id = v.group_id
      where v.id = p_entity_bigint and v.enabled is true and g.enabled is true
        and g.user_id = p_profile_id
        and (p_group_bigint is null or p_group_bigint = g.id)
    ) into v_owned;
  elsif p_action_type = 'gallery_open' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (
      select 1 from public.galleries g
      where g.id = p_entity_bigint and g.enabled is true and g.user_id = p_profile_id
      union all
      select 1 from public.general_galleries gg
      where gg.id = p_entity_bigint and gg.enabled is true and gg.user_id = p_profile_id
    ) into v_owned;
  elsif p_action_type = 'product_click' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (
      select 1 from public.products p
      where p.id = p_entity_bigint and p.enabled is true and p.user_id = p_profile_id
    ) into v_owned;
  elsif p_action_type = 'external_review_click' then
    v_owned := p_entity_uuid is null and (
      p_entity_bigint is null or exists (
        select 1 from public.external_review_pages er
        where er.id = p_entity_bigint and er.user_id = p_profile_id
      )
    );
  elsif p_action_type = 'review_expand' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (
      select 1 from public.reviews r
      where r.id = p_entity_bigint and r.enabled is true and r.user_id = p_profile_id
    ) into v_owned;
  elsif p_action_type in ('treatment_expand', 'treatment_cta_click', 'service_expand', 'service_cta_click')
        and p_entity_uuid is not null and p_entity_bigint is null then
    select exists (
      select 1 from public.dentistry_treatments dt
      join public.treatments t on t.treatment_id = dt.treatment_id
      where dt.treatment_id = p_entity_uuid and dt.dentistry_id = v_dentistry_id
        and (p_action_type not like 'service_%' or t."isService" is true)
        and (p_action_type like 'service_%' or t."isService" is not true)
    ) into v_owned;
  elsif p_action_type in ('directions_click', 'map_open', 'location_select')
        and p_entity_uuid is not null and p_entity_bigint is null then
    select exists (
      select 1 from public.dentistry_locations dl
      where dl.location_id = p_entity_uuid and dl.dentistry_id = v_dentistry_id
    ) into v_owned;
  elsif p_action_type in ('booking_click', 'email_click', 'phone_click', 'cta_click')
        and p_entity_bigint is null then
    v_owned := p_entity_uuid is null or exists (
      select 1 from public.dentistry_locations dl
      where dl.location_id = p_entity_uuid and dl.dentistry_id = v_dentistry_id
    );
  elsif p_action_type in ('profile_view', 'social_click', 'share_click', 'share_open', 'navigation_click', 'enquiry_start', 'enquiry_submit')
        and p_entity_uuid is null and p_entity_bigint is null then
    v_owned := true;
  end if;

  if not v_owned then
    raise exception 'Analytics entity does not belong to profile' using errcode = '22023';
  end if;

  if ((select count(*) from public.public_analytics_events e
      where e.profile_id = p_profile_id
        and e.received_at >= now() - interval '1 minute'
        and (p_request_hash is null or e.request_hash = p_request_hash))
      >= (case when p_request_hash is null then 600 else 60 end)) then
    return query select 'rate_limited'::text, null::uuid;
    return;
  end if;

  insert into public.public_analytics_events (
    event_id, schema_version, profile_id, occurred_at, event_date,
    action_type, section, visible_position, entity_uuid, entity_bigint,
    group_uuid, group_bigint, action_dimension, consent_state,
    referrer_domain, attribution_source, utm_source, utm_medium, utm_campaign,
    device_class, visitor_hash, session_hash, request_hash
  ) values (
    p_event_id, p_schema_version, p_profile_id, p_occurred_at,
    (p_occurred_at at time zone 'UTC')::date,
    p_action_type, p_section, p_visible_position, p_entity_uuid, p_entity_bigint,
    p_group_uuid, p_group_bigint, p_action_dimension, p_consent_state,
    lower(p_referrer_domain), p_attribution_source, p_utm_source, p_utm_medium,
    p_utm_campaign, p_device_class, p_visitor_hash, p_session_hash, p_request_hash
  ) on conflict (event_id) do nothing;

  if found then
    return query select 'accepted'::text, p_event_id;
  else
    return query select 'duplicate'::text, p_event_id;
  end if;
end;
$$;

create or replace function public.get_owner_analytics_summary(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  event_date date,
  profile_views bigint,
  unique_profile_visitors bigint,
  outbound_actions bigint,
  unique_action_visitors bigint,
  conversions bigint,
  unique_converting_visitors bigint
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
    or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.subscription_status in ('PRO', 'PREMIUM PRO'))
  ) into v_full_access;

  if not v_full_access and p_start_date < p_end_date - 6 then
    raise exception 'Analytics date range is not available for this plan' using errcode = '42501';
  end if;

  return query
  select e.event_date,
    count(*) filter (where e.action_type = 'profile_view')::bigint,
    case when count(e.visitor_hash) filter (where e.action_type = 'profile_view') > 0
      then count(distinct e.visitor_hash) filter (where e.action_type = 'profile_view')::bigint
      else null::bigint end,
    count(*) filter (where e.action_type = any (array[
      'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
      'external_review_click', 'treatment_cta_click', 'service_cta_click',
      'booking_click', 'directions_click', 'email_click', 'phone_click',
      'social_click', 'share_click', 'enquiry_submit'
    ]))::bigint,
    case when count(e.visitor_hash) filter (
      where e.action_type = any (array[
        'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
        'external_review_click', 'treatment_cta_click', 'service_cta_click',
        'booking_click', 'directions_click', 'email_click', 'phone_click',
        'social_click', 'share_click', 'enquiry_submit'
      ])) > 0 then count(distinct e.visitor_hash) filter (
      where e.action_type = any (array[
        'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
        'external_review_click', 'treatment_cta_click', 'service_cta_click',
        'booking_click', 'directions_click', 'email_click', 'phone_click',
        'social_click', 'share_click', 'enquiry_submit'
      ])
    )::bigint else null::bigint end,
    case when v_full_access then count(*) filter (where e.action_type = any (array[
      'treatment_cta_click', 'service_cta_click', 'booking_click',
      'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
    ]))::bigint else null::bigint end,
    case when v_full_access and count(e.visitor_hash) filter (
      where e.action_type = any (array[
        'treatment_cta_click', 'service_cta_click', 'booking_click',
        'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
      ])) > 0 then count(distinct e.visitor_hash) filter (
      where e.action_type = any (array[
        'treatment_cta_click', 'service_cta_click', 'booking_click',
        'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
      ])
    )::bigint else null::bigint end
  from public.public_analytics_events e
  where e.profile_id = p_profile_id
    and e.event_date between p_start_date and p_end_date
  group by e.event_date
  order by e.event_date;
end;
$$;

create or replace function public.get_owner_analytics_totals(
  p_profile_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  profile_views bigint,
  unique_profile_visitors bigint,
  outbound_actions bigint,
  unique_action_visitors bigint,
  conversions bigint,
  unique_converting_visitors bigint
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
    or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.subscription_status in ('PRO', 'PREMIUM PRO'))
  ) into v_full_access;

  if not v_full_access and p_start_date < p_end_date - 6 then
    raise exception 'Analytics date range is not available for this plan' using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where e.action_type = 'profile_view')::bigint,
    case when count(e.visitor_hash) filter (where e.action_type = 'profile_view') > 0
      then count(distinct e.visitor_hash) filter (where e.action_type = 'profile_view')::bigint
      else null::bigint end,
    count(*) filter (where e.action_type = any (array[
      'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
      'external_review_click', 'treatment_cta_click', 'service_cta_click',
      'booking_click', 'directions_click', 'email_click', 'phone_click',
      'social_click', 'share_click', 'enquiry_submit'
    ]))::bigint,
    case when count(e.visitor_hash) filter (
      where e.action_type = any (array[
        'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
        'external_review_click', 'treatment_cta_click', 'service_cta_click',
        'booking_click', 'directions_click', 'email_click', 'phone_click',
        'social_click', 'share_click', 'enquiry_submit'
      ])) > 0 then count(distinct e.visitor_hash) filter (
      where e.action_type = any (array[
        'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
        'external_review_click', 'treatment_cta_click', 'service_cta_click',
        'booking_click', 'directions_click', 'email_click', 'phone_click',
        'social_click', 'share_click', 'enquiry_submit'
      ])
    )::bigint else null::bigint end,
    case when v_full_access then count(*) filter (where e.action_type = any (array[
      'treatment_cta_click', 'service_cta_click', 'booking_click',
      'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
    ]))::bigint else null::bigint end,
    case when v_full_access and count(e.visitor_hash) filter (
      where e.action_type = any (array[
        'treatment_cta_click', 'service_cta_click', 'booking_click',
        'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
      ])) > 0 then count(distinct e.visitor_hash) filter (
      where e.action_type = any (array[
        'treatment_cta_click', 'service_cta_click', 'booking_click',
        'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
      ])
    )::bigint else null::bigint end
  from public.public_analytics_events e
  where e.profile_id = p_profile_id
    and e.event_date between p_start_date and p_end_date;
end;
$$;

create or replace function public.get_owner_analytics_content(
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
  last_active_at timestamptz
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
    or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.subscription_status in ('PRO', 'PREMIUM PRO'))
  ) into v_full_access;

  if not v_full_access and p_start_date < p_end_date - 6 then
    raise exception 'Analytics date range is not available for this plan' using errcode = '42501';
  end if;

  return query
  select e.action_type, e.section, e.entity_uuid, e.entity_bigint,
    e.group_uuid, e.group_bigint, e.action_dimension, max(e.visible_position),
    count(*)::bigint,
    case when count(e.visitor_hash) > 0
      then count(distinct e.visitor_hash)::bigint else null::bigint end,
    max(e.occurred_at)
  from public.public_analytics_events e
  where e.profile_id = p_profile_id
    and e.event_date between p_start_date and p_end_date
    and (v_full_access or e.action_type <> all (array[
      'treatment_cta_click', 'service_cta_click', 'booking_click',
      'directions_click', 'email_click', 'phone_click', 'enquiry_submit'
    ]))
  group by e.action_type, e.section, e.entity_uuid, e.entity_bigint,
    e.group_uuid, e.group_bigint, e.action_dimension
  order by count(*) desc, e.action_type, e.section;
end;
$$;

create or replace function public.get_admin_analytics_overview(
  p_start_date date,
  p_end_date date,
  p_plan text,
  p_registered_domain text
)
returns table (
  event_date date,
  profile_views bigint,
  outbound_actions bigint,
  unique_visitors bigint,
  active_profiles bigint
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

  if (p_plan is not null and p_plan not in ('FREE', 'PRO', 'PREMIUM PRO'))
     or (p_registered_domain is not null and (
       char_length(p_registered_domain) > 253
       or p_registered_domain !~ '^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?[.])*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$'
     )) then
    raise exception 'Invalid admin analytics filter' using errcode = '22023';
  end if;

  if (select auth.uid()) is null or not exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  ) then
    raise exception 'Admin authorization required' using errcode = '42501';
  end if;

  return query
  select e.event_date,
    count(*) filter (where e.action_type = 'profile_view')::bigint,
    count(*) filter (where e.action_type = any (array[
      'link_click', 'blog_click', 'video_open', 'gallery_open', 'product_click',
      'external_review_click', 'treatment_cta_click', 'service_cta_click',
      'booking_click', 'directions_click', 'email_click', 'phone_click',
      'social_click', 'share_click', 'enquiry_submit'
    ]))::bigint,
    case when count(e.visitor_hash) > 0
      then count(distinct e.visitor_hash)::bigint else null::bigint end,
    count(distinct e.profile_id)::bigint
  from public.public_analytics_events e
  join public.users owner on owner.id = e.profile_id
  where e.event_date between p_start_date and p_end_date
    and (p_plan is null or owner.subscription_status = p_plan)
    and (p_registered_domain is null or owner.registered_domain = lower(p_registered_domain))
  group by e.event_date
  order by e.event_date;
end;
$$;

create or replace function public.purge_expired_public_analytics()
returns table (deleted_raw_events bigint, deleted_daily_aggregates bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw bigint;
  v_daily bigint;
begin
  perform set_config('app.analytics_retention', 'enabled', true);

  delete from public.public_analytics_events
  where received_at < now() - interval '400 days';
  get diagnostics v_raw = row_count;

  delete from public.public_analytics_daily_aggregates
  where event_date < (now() at time zone 'UTC')::date - 760;
  get diagnostics v_daily = row_count;

  return query select v_raw, v_daily;
end;
$$;

revoke all on function public.protect_public_analytics_events() from public, anon, authenticated;
revoke all on function public.aggregate_public_analytics_event() from public, anon, authenticated;
revoke all on function public.ingest_public_analytics_event(uuid,smallint,uuid,timestamptz,text,text,integer,uuid,bigint,uuid,bigint,text,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.get_owner_analytics_summary(uuid,date,date) from public, anon;
revoke all on function public.get_owner_analytics_totals(uuid,date,date) from public, anon;
revoke all on function public.get_owner_analytics_content(uuid,date,date) from public, anon;
revoke all on function public.get_admin_analytics_overview(date,date,text,text) from public, anon;
revoke all on function public.purge_expired_public_analytics() from public, anon, authenticated;

grant execute on function public.ingest_public_analytics_event(uuid,smallint,uuid,timestamptz,text,text,integer,uuid,bigint,uuid,bigint,text,text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.get_owner_analytics_summary(uuid,date,date) to authenticated;
grant execute on function public.get_owner_analytics_totals(uuid,date,date) to authenticated;
grant execute on function public.get_owner_analytics_content(uuid,date,date) to authenticated;
grant execute on function public.get_admin_analytics_overview(date,date,text,text) to authenticated;
grant execute on function public.purge_expired_public_analytics() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'dentalbio-public-analytics-retention';

    perform cron.schedule(
      'dentalbio-public-analytics-retention',
      '17 3 * * *',
      'select public.purge_expired_public_analytics();'
    );
  end if;
end;
$$;
