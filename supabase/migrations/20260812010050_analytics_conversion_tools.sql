-- First-party conversion goals, managed outbound campaigns, attributed owner
-- reporting, and synchronous privacy-safe export auditing.

create table public.analytics_conversion_goals (
  goal_id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.users(id) on delete cascade,
  system_key text check (system_key is null or system_key in (
    'booking', 'phone', 'email', 'directions', 'enquiry'
  )),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  event_type text not null check (event_type in (
    'booking_click', 'phone_click', 'email_click', 'directions_click',
    'enquiry_submit', 'link_click', 'product_click',
    'treatment_cta_click', 'service_cta_click'
  )),
  entity_uuid uuid,
  entity_bigint bigint check (entity_bigint > 0),
  is_primary boolean not null default false,
  attribution_window_days smallint not null default 30
    check (attribution_window_days in (7, 30, 60, 90)),
  enabled boolean not null default true,
  value_minor bigint check (value_minor >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analytics_conversion_goal_one_entity check (
    num_nonnulls(entity_uuid, entity_bigint) <= 1
  ),
  constraint analytics_conversion_goal_value_pair check (
    (value_minor is null and currency is null)
    or (value_minor is not null and currency is not null)
  ),
  constraint analytics_conversion_goal_system_shape check (
    (system_key is not null and entity_uuid is null and entity_bigint is null)
    or system_key is null
  ),
  constraint analytics_conversion_goal_custom_shape check (
    system_key is not null
    or (event_type in ('link_click', 'treatment_cta_click', 'service_cta_click')
        and entity_uuid is not null and entity_bigint is null)
    or (event_type = 'product_click'
        and entity_bigint is not null and entity_uuid is null)
  )
);

create unique index analytics_conversion_goals_system_unique
  on public.analytics_conversion_goals (profile_id, system_key)
  where system_key is not null;
create unique index analytics_conversion_goals_definition_unique
  on public.analytics_conversion_goals (
    profile_id, event_type,
    coalesce(entity_uuid, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(entity_bigint, 0)
  );
create unique index analytics_conversion_goals_primary_unique
  on public.analytics_conversion_goals (profile_id)
  where is_primary and enabled;

comment on table public.analytics_conversion_goals is
  'Owner-controlled goals over a fixed event vocabulary. A goal only classifies events at or after its creation time.';

create table public.analytics_campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.users(id) on delete cascade,
  destination_url text not null check (
    char_length(destination_url) between 8 and 2048
    and destination_url ~* '^https?://[^[:space:]]+$'
  ),
  source text not null check (
    char_length(source) between 1 and 64
    and source ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
  ),
  medium text not null check (
    char_length(medium) between 1 and 64
    and medium ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
  ),
  campaign text not null check (
    char_length(campaign) between 1 and 64
    and campaign ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
  ),
  content text check (
    content is null or (
      char_length(content) between 1 and 64
      and content ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
    )
  ),
  term text check (
    term is null or (
      char_length(term) between 1 and 64
      and term ~ '^[a-z0-9][a-z0-9._-]{0,63}$'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.analytics_campaigns is
  'Private managed UTM configuration. Custom text is never accepted in the public event envelope; events resolve this owned UUID server-side.';

alter table public.links alter column link type text;
alter table public.links
  add constraint links_url_bounded check (char_length(link) between 8 and 2048),
  add column analytics_campaign_id uuid
    references public.analytics_campaigns(campaign_id) on delete set null;
create index links_analytics_campaign_idx
  on public.links (analytics_campaign_id)
  where analytics_campaign_id is not null;

alter table public.public_analytics_events
  add column managed_campaign_id uuid
    references public.analytics_campaigns(campaign_id) on delete set null;
create index public_analytics_events_campaign_date_idx
  on public.public_analytics_events (profile_id, managed_campaign_id, event_date desc)
  where managed_campaign_id is not null;

create table public.analytics_export_audit (
  export_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete restrict,
  profile_id uuid not null references public.users(id) on delete cascade,
  dataset text not null check (dataset in (
    'overview', 'content', 'conversions', 'campaigns', 'audience'
  )),
  start_date date not null,
  end_date date not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  row_count integer not null check (row_count >= 0),
  schema_version smallint not null check (schema_version = 1),
  created_at timestamptz not null default now(),
  downloaded_at timestamptz not null default now(),
  check (start_date <= end_date)
);

comment on table public.analytics_export_audit is
  'Audit record for synchronous authorized aggregate CSV creation and download. Export contents and visitor identifiers are never stored.';

alter table public.analytics_conversion_goals enable row level security;
alter table public.analytics_campaigns enable row level security;
alter table public.analytics_export_audit enable row level security;

revoke all on table public.analytics_conversion_goals from public, anon, authenticated;
revoke all on table public.analytics_campaigns from public, anon, authenticated;
revoke all on table public.analytics_export_audit from public, anon, authenticated;

create policy "Owners can read managed campaigns"
on public.analytics_campaigns for select to authenticated
using (
  profile_id = (select auth.uid())
  or coalesce((select public.is_dashboard_admin()), false)
);
grant select on table public.analytics_campaigns to authenticated;

create or replace function private.insert_default_analytics_goals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.analytics_conversion_goals (
    profile_id, system_key, name, event_type, is_primary
  ) values
    (new.id, 'booking', 'Booking click', 'booking_click', true),
    (new.id, 'phone', 'Phone click', 'phone_click', false),
    (new.id, 'email', 'Email click', 'email_click', false),
    (new.id, 'directions', 'Directions click', 'directions_click', false),
    (new.id, 'enquiry', 'Enquiry submitted', 'enquiry_submit', false)
  on conflict do nothing;
  return new;
end;
$$;

create trigger insert_default_analytics_goals
after insert on public.users
for each row execute function private.insert_default_analytics_goals();

insert into public.analytics_conversion_goals (
  profile_id, system_key, name, event_type, is_primary
)
select u.id, defaults.system_key, defaults.name, defaults.event_type,
  defaults.system_key = 'booking'
from public.users u
cross join (values
  ('booking'::text, 'Booking click'::text, 'booking_click'::text),
  ('phone', 'Phone click', 'phone_click'),
  ('email', 'Email click', 'email_click'),
  ('directions', 'Directions click', 'directions_click'),
  ('enquiry', 'Enquiry submitted', 'enquiry_submit')
) defaults(system_key, name, event_type)
on conflict do nothing;

create or replace function private.assert_paid_analytics_access(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (
    exists (
      select 1 from public.users actor
      where actor.id = (select auth.uid()) and actor.role = 'admin'
    )
    or exists (
      select 1 from public.users owner
      where owner.id = p_profile_id
        and owner.id = (select auth.uid())
        and owner.subscription_status in ('PRO', 'PREMIUM PRO')
    )
  ) then
    raise exception 'Analytics plan or ownership does not allow access'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_owner_conversion_goals(
  p_profile_id uuid
)
returns setof public.analytics_conversion_goals
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  return query
  select g.* from public.analytics_conversion_goals g
  where g.profile_id = p_profile_id
  order by g.system_key is null, g.created_at, g.goal_id;
end;
$$;

create or replace function public.upsert_owner_conversion_goal(
  p_profile_id uuid,
  p_goal_id uuid,
  p_name text,
  p_event_type text,
  p_entity_uuid uuid,
  p_entity_bigint bigint,
  p_is_primary boolean,
  p_attribution_window_days smallint,
  p_enabled boolean,
  p_value_minor bigint,
  p_currency text
)
returns setof public.analytics_conversion_goals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal public.analytics_conversion_goals%rowtype;
  v_dentistry_id uuid;
  v_owned boolean := false;
begin
  perform private.assert_paid_analytics_access(p_profile_id);

  if nullif(btrim(p_name), '') is null or char_length(btrim(p_name)) > 80
     or p_event_type not in (
       'booking_click', 'phone_click', 'email_click', 'directions_click',
       'enquiry_submit', 'link_click', 'product_click',
       'treatment_cta_click', 'service_cta_click'
     )
     or p_is_primary is null or p_enabled is null
     or p_attribution_window_days not in (7, 30, 60, 90)
     or ((p_value_minor is null) <> (p_currency is null))
     or (p_value_minor is not null and p_value_minor < 0)
     or (p_currency is not null and upper(p_currency) !~ '^[A-Z]{3}$') then
    raise exception 'Invalid conversion goal' using errcode = '22023';
  end if;

  if p_goal_id is not null then
    select * into v_goal from public.analytics_conversion_goals g
    where g.goal_id = p_goal_id and g.profile_id = p_profile_id
    for update;
    if not found then
      raise exception 'Conversion goal not found' using errcode = 'P0002';
    end if;
    if v_goal.event_type <> p_event_type
       or v_goal.entity_uuid is distinct from p_entity_uuid
       or v_goal.entity_bigint is distinct from p_entity_bigint then
      raise exception 'A goal event definition is immutable'
        using errcode = '22023';
    end if;
  else
    if p_event_type in ('link_click', 'treatment_cta_click', 'service_cta_click')
       and (p_entity_uuid is null or p_entity_bigint is not null) then
      raise exception 'This goal requires a UUID entity' using errcode = '22023';
    elsif p_event_type = 'product_click'
       and (p_entity_bigint is null or p_entity_uuid is not null) then
      raise exception 'This goal requires a product entity' using errcode = '22023';
    elsif p_event_type not in (
      'link_click', 'product_click', 'treatment_cta_click', 'service_cta_click'
    ) then
      raise exception 'Only supported entity goals can be added'
        using errcode = '22023';
    end if;

    select d.dentistry_id into v_dentistry_id
    from public.dentistries d where d.user_id = p_profile_id;

    if p_event_type = 'link_click' then
      select exists (
        select 1 from public.links l
        join public.dentistry_links dl on dl.link_id = l.link_id
        join public.link_groups lg on lg.link_group_id = dl.link_group_id
        where l.link_id = p_entity_uuid and lg.dentistry_id = v_dentistry_id
      ) into v_owned;
    elsif p_event_type = 'product_click' then
      select exists (
        select 1 from public.products p
        where p.id = p_entity_bigint and p.user_id = p_profile_id
      ) into v_owned;
    else
      select exists (
        select 1 from public.dentistry_treatments dt
        join public.treatments t on t.treatment_id = dt.treatment_id
        where dt.dentistry_id = v_dentistry_id
          and dt.treatment_id = p_entity_uuid
          and (p_event_type <> 'service_cta_click' or t."isService" is true)
          and (p_event_type <> 'treatment_cta_click' or t."isService" is not true)
      ) into v_owned;
    end if;

    if not v_owned then
      raise exception 'Goal entity does not belong to profile'
        using errcode = '42501';
    end if;
  end if;

  if p_is_primary and p_enabled then
    update public.analytics_conversion_goals
    set is_primary = false, updated_at = now()
    where profile_id = p_profile_id and is_primary
      and (p_goal_id is null or goal_id <> p_goal_id);
  end if;

  if p_goal_id is null then
    insert into public.analytics_conversion_goals (
      profile_id, name, event_type, entity_uuid, entity_bigint, is_primary,
      attribution_window_days, enabled, value_minor, currency
    ) values (
      p_profile_id, btrim(p_name), p_event_type, p_entity_uuid, p_entity_bigint,
      p_is_primary and p_enabled, p_attribution_window_days, p_enabled,
      p_value_minor, upper(p_currency)
    ) returning * into v_goal;
  else
    update public.analytics_conversion_goals set
      name = btrim(p_name),
      is_primary = p_is_primary and p_enabled,
      attribution_window_days = p_attribution_window_days,
      enabled = p_enabled,
      value_minor = p_value_minor,
      currency = upper(p_currency),
      updated_at = now()
    where goal_id = p_goal_id
    returning * into v_goal;
  end if;

  return next v_goal;
end;
$$;

create or replace function private.save_link_campaign(
  p_profile_id uuid,
  p_existing_campaign_id uuid,
  p_enabled boolean,
  p_destination_url text,
  p_source text,
  p_medium text,
  p_campaign text,
  p_content text,
  p_term text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_campaign_id uuid;
begin
  if not p_enabled then return null; end if;
  if p_destination_url !~* '^https?://[^[:space:]]+$'
     or char_length(p_destination_url) > 2048
     or p_source !~ '^[a-z0-9][a-z0-9._-]{0,63}$'
     or p_medium !~ '^[a-z0-9][a-z0-9._-]{0,63}$'
     or p_campaign !~ '^[a-z0-9][a-z0-9._-]{0,63}$'
     or (p_content is not null and p_content !~ '^[a-z0-9][a-z0-9._-]{0,63}$')
     or (p_term is not null and p_term !~ '^[a-z0-9][a-z0-9._-]{0,63}$') then
    raise exception 'Invalid managed campaign' using errcode = '22023';
  end if;
  if p_existing_campaign_id is null then
    insert into public.analytics_campaigns (
      profile_id, destination_url, source, medium, campaign, content, term
    ) values (
      p_profile_id, p_destination_url, p_source, p_medium, p_campaign,
      nullif(p_content, ''), nullif(p_term, '')
    ) returning campaign_id into v_campaign_id;
  else
    update public.analytics_campaigns set
      destination_url = p_destination_url, source = p_source,
      medium = p_medium, campaign = p_campaign,
      content = nullif(p_content, ''), term = nullif(p_term, ''),
      updated_at = now()
    where campaign_id = p_existing_campaign_id and profile_id = p_profile_id
    returning campaign_id into v_campaign_id;
    if v_campaign_id is null then
      raise exception 'Managed campaign not found' using errcode = 'P0002';
    end if;
  end if;
  return v_campaign_id;
end;
$$;

drop function public.create_dentistry_link_with_media(
  uuid,uuid,text,text,text,text,text,boolean,boolean
);
create function public.create_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_title text, p_url text,
  p_image_url text, p_image_variant text, p_image_alt text,
  p_image_decorative boolean, p_is_featured boolean,
  p_campaign_enabled boolean, p_destination_url text,
  p_campaign_source text, p_campaign_medium text, p_campaign_name text,
  p_campaign_content text, p_campaign_term text
)
returns setof public.links language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid; v_rank integer; v_link public.links%rowtype;
  v_campaign_id uuid;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 2048
    or btrim(p_url) !~* '^https?://[^[:space:]]+$' or p_is_featured is null
    or p_campaign_enabled is null
  then raise exception 'Invalid link input' using errcode = '22023'; end if;
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  perform 1 from public.link_groups
  where link_group_id = p_group_id and dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Link group not found' using errcode = 'P0002'; end if;
  perform private.assert_link_media_input(v_owner_id, p_image_url, p_image_variant, p_image_alt, p_image_decorative);
  if p_is_featured and (
    select count(*) from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id and links.is_featured
  ) >= 3 then raise exception 'A link group can feature at most three links' using errcode = '22023'; end if;
  v_campaign_id := private.save_link_campaign(
    v_owner_id, null, p_campaign_enabled, p_destination_url,
    p_campaign_source, p_campaign_medium, p_campaign_name,
    p_campaign_content, p_campaign_term
  );
  select coalesce(max(links.rank), 0) + 1 into v_rank
  from public.dentistry_links join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id;
  insert into public.links (
    title, link, is_active, rank, image_url, image_variant, image_alt,
    image_decorative, is_featured, analytics_campaign_id
  ) values (
    btrim(p_title), btrim(p_url), true, v_rank,
    case when p_image_variant = 'none' then null else btrim(p_image_url) end,
    p_image_variant, case when p_image_decorative then null else btrim(p_image_alt) end,
    p_image_decorative, p_is_featured, v_campaign_id
  ) returning * into v_link;
  insert into public.dentistry_links (link_group_id, link_id) values (p_group_id, v_link.link_id);
  return next v_link;
end;
$$;

drop function public.update_dentistry_link_with_media(
  uuid,uuid,uuid,text,text,boolean,text,text,text,boolean,boolean
);
create function public.update_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_link_id uuid,
  p_title text, p_url text, p_is_active boolean, p_image_url text,
  p_image_variant text, p_image_alt text, p_image_decorative boolean,
  p_is_featured boolean, p_campaign_enabled boolean, p_destination_url text,
  p_campaign_source text, p_campaign_medium text, p_campaign_name text,
  p_campaign_content text, p_campaign_term text
)
returns setof public.links language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid; v_link public.links%rowtype; v_existing public.links%rowtype;
  v_old_path text; v_old_campaign_id uuid; v_campaign_id uuid;
begin
  if nullif(btrim(p_title), '') is null or length(btrim(p_title)) > 100
    or nullif(btrim(p_url), '') is null or length(btrim(p_url)) > 2048
    or btrim(p_url) !~* '^https?://[^[:space:]]+$'
    or p_is_active is null or p_is_featured is null or p_campaign_enabled is null
  then raise exception 'Invalid link input' using errcode = '22023'; end if;
  select user_id into v_owner_id from public.dentistries
  where dentistry_id = p_dentistry_id for update;
  if not found then raise exception 'Dentistry not found' using errcode = 'P0002'; end if;
  if (select auth.uid()) is null or (
    v_owner_id <> (select auth.uid()) and not coalesce((select public.is_dashboard_admin()), false)
  ) then raise exception 'Link target is not authorized' using errcode = '42501'; end if;
  select links.* into v_existing
  from public.dentistry_links join public.link_groups using (link_group_id)
  join public.links using (link_id)
  where dentistry_links.link_group_id = p_group_id
    and dentistry_links.link_id = p_link_id
    and link_groups.dentistry_id = p_dentistry_id for update of links;
  if not found then raise exception 'Link not found' using errcode = 'P0002'; end if;
  perform private.assert_link_media_input(v_owner_id, p_image_url, p_image_variant, p_image_alt, p_image_decorative);
  if p_is_featured and not v_existing.is_featured and (
    select count(*) from public.dentistry_links join public.links using (link_id)
    where dentistry_links.link_group_id = p_group_id and links.is_featured
  ) >= 3 then raise exception 'A link group can feature at most three links' using errcode = '22023'; end if;
  if v_existing.image_url is not null and v_existing.image_url is distinct from
    (case when p_image_variant = 'none' then null else btrim(p_image_url) end)
  then
    v_old_path := private.dashboard_media_path(v_existing.image_url, 'link-images', v_owner_id, 'links');
    if v_old_path is not null then
      perform private.enqueue_dashboard_media_cleanup(v_owner_id, 'link-images', v_old_path);
    end if;
  end if;
  v_old_campaign_id := v_existing.analytics_campaign_id;
  v_campaign_id := private.save_link_campaign(
    v_owner_id, v_old_campaign_id, p_campaign_enabled, p_destination_url,
    p_campaign_source, p_campaign_medium, p_campaign_name,
    p_campaign_content, p_campaign_term
  );
  update public.links set
    title = btrim(p_title), link = btrim(p_url), is_active = p_is_active,
    image_url = case when p_image_variant = 'none' then null else btrim(p_image_url) end,
    image_variant = p_image_variant,
    image_alt = case when p_image_decorative then null else btrim(p_image_alt) end,
    image_decorative = p_image_decorative, is_featured = p_is_featured,
    analytics_campaign_id = v_campaign_id
  where links.link_id = p_link_id returning * into v_link;
  if v_old_campaign_id is not null and v_campaign_id is null then
    delete from public.analytics_campaigns c
    where c.campaign_id = v_old_campaign_id
      and not exists (
        select 1 from public.links l
        where l.analytics_campaign_id = c.campaign_id
      );
  end if;
  return next v_link;
end;
$$;

-- Preserve the previously shipped RPC contracts for older dashboard clients.
-- New clients use the expanded overloads above when managed campaign fields are present.
create function public.create_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_title text, p_url text,
  p_image_url text, p_image_variant text, p_image_alt text,
  p_image_decorative boolean, p_is_featured boolean
)
returns setof public.links language sql security invoker set search_path = '' as $$
  select * from public.create_dentistry_link_with_media(
    p_dentistry_id, p_group_id, p_title, p_url, p_image_url,
    p_image_variant, p_image_alt, p_image_decorative, p_is_featured,
    false, null, null, null, null, null, null
  );
$$;

create function public.update_dentistry_link_with_media(
  p_dentistry_id uuid, p_group_id uuid, p_link_id uuid,
  p_title text, p_url text, p_is_active boolean, p_image_url text,
  p_image_variant text, p_image_alt text, p_image_decorative boolean,
  p_is_featured boolean
)
returns setof public.links language sql security invoker set search_path = '' as $$
  select * from public.update_dentistry_link_with_media(
    p_dentistry_id, p_group_id, p_link_id, p_title, p_url, p_is_active,
    p_image_url, p_image_variant, p_image_alt, p_image_decorative,
    p_is_featured, false, null, null, null, null, null, null
  );
$$;

create or replace function public.ingest_public_analytics_event(
  p_event_id uuid, p_schema_version smallint, p_profile_id uuid,
  p_occurred_at timestamptz, p_action_type text, p_section text,
  p_visible_position integer, p_entity_uuid uuid, p_entity_bigint bigint,
  p_group_uuid uuid, p_group_bigint bigint, p_action_dimension text,
  p_consent_state text, p_referrer_domain text, p_attribution_source text,
  p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_device_class text, p_visitor_hash text, p_session_hash text,
  p_request_hash text
)
returns table (status text, accepted_event_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_dentistry_id uuid; v_owned boolean := false; v_existing uuid;
  v_managed_campaign_id uuid;
begin
  select e.event_id into v_existing from public.public_analytics_events e
  where e.event_id = p_event_id;
  if v_existing is not null then
    return query select 'duplicate'::text, v_existing; return;
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
  from public.dentistries d join public.public_profiles p on p.profile_id = d.user_id
  where d.user_id = p_profile_id;
  if v_dentistry_id is null then
    raise exception 'Profile is not publicly reportable' using errcode = '22023';
  end if;
  if p_action_type = 'link_click' and p_entity_uuid is not null and p_entity_bigint is null then
    select true, l.analytics_campaign_id into v_owned, v_managed_campaign_id
    from public.links l join public.dentistry_links dl on dl.link_id = l.link_id
    join public.link_groups lg on lg.link_group_id = dl.link_group_id
    where l.link_id = p_entity_uuid and l.is_active
      and lg.dentistry_id = v_dentistry_id
      and (p_group_uuid is null or p_group_uuid = lg.link_group_id);
  elsif p_action_type = 'blog_click' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (select 1 from public.blogs b join public.blog_groups bg on bg.id = b.group_id
      where b.id = p_entity_bigint and b.enabled is true and bg.enabled is true
        and bg.user_id = p_profile_id and (p_group_bigint is null or p_group_bigint = bg.id)) into v_owned;
  elsif p_action_type = 'video_open' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (select 1 from public.videos v join public.groups g on g.id = v.group_id
      where v.id = p_entity_bigint and v.enabled is true and g.enabled is true
        and g.user_id = p_profile_id and (p_group_bigint is null or p_group_bigint = g.id)) into v_owned;
  elsif p_action_type = 'gallery_open' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (select 1 from public.galleries g where g.id = p_entity_bigint and g.enabled is true and g.user_id = p_profile_id
      union all select 1 from public.general_galleries gg where gg.id = p_entity_bigint and gg.enabled is true and gg.user_id = p_profile_id) into v_owned;
  elsif p_action_type = 'product_click' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (select 1 from public.products p where p.id = p_entity_bigint and p.enabled is true and p.user_id = p_profile_id) into v_owned;
  elsif p_action_type = 'external_review_click' then
    v_owned := p_entity_uuid is null and (p_entity_bigint is null or exists (
      select 1 from public.external_review_pages er where er.id = p_entity_bigint and er.user_id = p_profile_id));
  elsif p_action_type = 'review_expand' and p_entity_bigint is not null and p_entity_uuid is null then
    select exists (select 1 from public.reviews r where r.id = p_entity_bigint and r.enabled is true and r.user_id = p_profile_id) into v_owned;
  elsif p_action_type in ('treatment_expand','treatment_cta_click','service_expand','service_cta_click')
        and p_entity_uuid is not null and p_entity_bigint is null then
    select exists (select 1 from public.dentistry_treatments dt join public.treatments t on t.treatment_id = dt.treatment_id
      where dt.treatment_id = p_entity_uuid and dt.dentistry_id = v_dentistry_id
        and (p_action_type not like 'service_%' or t."isService" is true)
        and (p_action_type like 'service_%' or t."isService" is not true)) into v_owned;
  elsif p_action_type in ('directions_click','map_open','location_select')
        and p_entity_uuid is not null and p_entity_bigint is null then
    select exists (select 1 from public.dentistry_locations dl where dl.location_id = p_entity_uuid and dl.dentistry_id = v_dentistry_id) into v_owned;
  elsif p_action_type in ('booking_click','email_click','phone_click','cta_click') and p_entity_bigint is null then
    v_owned := p_entity_uuid is null or exists (select 1 from public.dentistry_locations dl where dl.location_id = p_entity_uuid and dl.dentistry_id = v_dentistry_id);
  elsif p_action_type in ('profile_view','social_click','share_click','share_open','navigation_click','enquiry_start','enquiry_submit')
        and p_entity_uuid is null and p_entity_bigint is null then v_owned := true;
  end if;
  if not coalesce(v_owned, false) then
    raise exception 'Analytics entity does not belong to profile' using errcode = '22023';
  end if;
  if ((select count(*) from public.public_analytics_events e
      where e.profile_id = p_profile_id and e.received_at >= now() - interval '1 minute'
        and (p_request_hash is null or e.request_hash = p_request_hash))
      >= (case when p_request_hash is null then 600 else 60 end)) then
    return query select 'rate_limited'::text, null::uuid; return;
  end if;
  insert into public.public_analytics_events (
    event_id, schema_version, profile_id, occurred_at, event_date,
    action_type, section, visible_position, entity_uuid, entity_bigint,
    group_uuid, group_bigint, action_dimension, consent_state, referrer_domain,
    attribution_source, utm_source, utm_medium, utm_campaign, device_class,
    visitor_hash, session_hash, request_hash, managed_campaign_id
  ) values (
    p_event_id, p_schema_version, p_profile_id, p_occurred_at,
    (p_occurred_at at time zone 'UTC')::date, p_action_type, p_section,
    p_visible_position, p_entity_uuid, p_entity_bigint, p_group_uuid,
    p_group_bigint, p_action_dimension, p_consent_state, lower(p_referrer_domain),
    p_attribution_source, p_utm_source, p_utm_medium, p_utm_campaign,
    p_device_class, p_visitor_hash, p_session_hash, p_request_hash,
    v_managed_campaign_id
  ) on conflict (event_id) do nothing;
  if found then return query select 'accepted'::text, p_event_id;
  else return query select 'duplicate'::text, p_event_id; end if;
end;
$$;

create or replace function public.get_owner_conversion_summary(
  p_profile_id uuid, p_start_date date, p_end_date date
)
returns table (
  event_date date, conversions bigint, unique_converters bigint,
  primary_conversions bigint, unique_primary_converters bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;
  return query
  with matched as (
    select e.event_date, e.visitor_hash, g.is_primary
    from public.public_analytics_events e
    join public.analytics_conversion_goals g
      on g.profile_id = e.profile_id and g.enabled
      and e.occurred_at >= g.created_at and e.action_type = g.event_type
      and (g.system_key is not null or (
        g.entity_uuid is not distinct from e.entity_uuid
        and g.entity_bigint is not distinct from e.entity_bigint
      ))
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
  )
  select m.event_date, count(*)::bigint,
    case when count(m.visitor_hash) > 0 then count(distinct m.visitor_hash)::bigint else null::bigint end,
    count(*) filter (where m.is_primary)::bigint,
    case when count(m.visitor_hash) filter (where m.is_primary) > 0
      then count(distinct m.visitor_hash) filter (where m.is_primary)::bigint
      else null::bigint end
  from matched m group by m.event_date order by m.event_date;
end;
$$;

create or replace function public.get_owner_conversion_goal_performance(
  p_profile_id uuid, p_start_date date, p_end_date date
)
returns table (
  goal_id uuid, goal_name text, event_type text, entity_uuid uuid,
  entity_bigint bigint, is_primary boolean, enabled boolean,
  conversions bigint, unique_converters bigint, last_conversion_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;
  return query
  select g.goal_id, g.name, g.event_type, g.entity_uuid, g.entity_bigint,
    g.is_primary, g.enabled, count(e.event_id)::bigint,
    case when count(e.visitor_hash) > 0
      then count(distinct e.visitor_hash)::bigint else null::bigint end,
    max(e.occurred_at)
  from public.analytics_conversion_goals g
  left join public.public_analytics_events e
    on e.profile_id = g.profile_id and g.enabled
    and e.occurred_at >= g.created_at and e.action_type = g.event_type
    and (g.system_key is not null or (
      g.entity_uuid is not distinct from e.entity_uuid
      and g.entity_bigint is not distinct from e.entity_bigint
    ))
    and e.event_date between p_start_date and p_end_date
  where g.profile_id = p_profile_id
  group by g.goal_id order by g.is_primary desc, count(e.event_id) desc, g.created_at;
end;
$$;

create or replace function public.get_owner_conversion_totals(
  p_profile_id uuid, p_start_date date, p_end_date date
)
returns table (
  conversions bigint, unique_converters bigint,
  primary_conversions bigint, unique_primary_converters bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;
  return query
  with matched as (
    select e.event_id, e.visitor_hash, g.is_primary
    from public.public_analytics_events e
    join public.analytics_conversion_goals g
      on g.profile_id = e.profile_id and g.enabled
      and e.occurred_at >= g.created_at and e.action_type = g.event_type
      and (g.system_key is not null or (
        g.entity_uuid is not distinct from e.entity_uuid
        and g.entity_bigint is not distinct from e.entity_bigint
      ))
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
  )
  select count(*)::bigint,
    case when count(m.visitor_hash) > 0
      then count(distinct m.visitor_hash)::bigint else null::bigint end,
    count(*) filter (where m.is_primary)::bigint,
    case when count(m.visitor_hash) filter (where m.is_primary) > 0
      then count(distinct m.visitor_hash) filter (where m.is_primary)::bigint
      else null::bigint end
  from matched m;
end;
$$;

create or replace function public.get_owner_campaign_performance(
  p_profile_id uuid, p_start_date date, p_end_date date
)
returns table (
  managed_campaign_id uuid, source text, medium text, campaign text,
  profile_views bigint, unique_visitors bigint, clicks bigint,
  unique_clickers bigint, ctr numeric, conversions bigint,
  unique_converters bigint, conversion_rate numeric,
  last_conversion_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  if p_start_date is null or p_end_date is null or p_start_date > p_end_date
     or p_end_date > (now() at time zone 'UTC')::date
     or p_start_date < p_end_date - 730 then
    raise exception 'Invalid analytics date range' using errcode = '22023';
  end if;
  return query
  with events_with_goal as (
    select e.*, goal.goal_id, goal.attribution_window_days
    from public.public_analytics_events e
    left join lateral (
      select g.goal_id, g.attribution_window_days
      from public.analytics_conversion_goals g
      where g.profile_id = e.profile_id and g.enabled
        and e.occurred_at >= g.created_at and e.action_type = g.event_type
        and (g.system_key is not null or (
          g.entity_uuid is not distinct from e.entity_uuid
          and g.entity_bigint is not distinct from e.entity_bigint
        ))
      limit 1
    ) goal on true
    where e.profile_id = p_profile_id
      and e.event_date between p_start_date and p_end_date
  ), attributed as (
    select e.*, touch.managed_campaign_id as touch_campaign_id,
      touch.source as touch_source, touch.medium as touch_medium,
      touch.campaign as touch_campaign
    from events_with_goal e
    left join lateral (
      select t.managed_campaign_id,
        coalesce(c.source, t.utm_source) as source,
        coalesce(c.medium, t.utm_medium) as medium,
        coalesce(c.campaign, t.utm_campaign) as campaign
      from public.public_analytics_events t
      left join public.analytics_campaigns c
        on c.campaign_id = t.managed_campaign_id and c.profile_id = t.profile_id
      where t.profile_id = e.profile_id and t.occurred_at <= e.occurred_at
        and t.occurred_at >= e.occurred_at
          - make_interval(days => coalesce(e.attribution_window_days, 30))
        and (
          t.event_id = e.event_id
          or (e.visitor_hash is not null and t.visitor_hash = e.visitor_hash)
        )
        and (t.managed_campaign_id is not null or t.utm_source is not null
          or t.utm_medium is not null or t.utm_campaign is not null)
      order by (t.event_id = e.event_id) desc,
        t.occurred_at desc, t.received_at desc limit 1
    ) touch on true
  )
  select a.touch_campaign_id, coalesce(a.touch_source, 'unattributed'),
    coalesce(a.touch_medium, 'unattributed'),
    coalesce(a.touch_campaign, 'unattributed'),
    count(*) filter (where a.action_type = 'profile_view')::bigint,
    case when count(a.visitor_hash) filter (where a.action_type = 'profile_view') > 0
      then count(distinct a.visitor_hash) filter (where a.action_type = 'profile_view')::bigint
      else null::bigint end,
    count(*) filter (where a.action_type = any (array[
      'link_click','blog_click','video_open','gallery_open','product_click',
      'external_review_click','treatment_cta_click','service_cta_click',
      'booking_click','directions_click','email_click','phone_click',
      'social_click','share_click','enquiry_submit'
    ]))::bigint,
    case when count(a.visitor_hash) filter (where a.action_type = any (array[
      'link_click','blog_click','video_open','gallery_open','product_click',
      'external_review_click','treatment_cta_click','service_cta_click',
      'booking_click','directions_click','email_click','phone_click',
      'social_click','share_click','enquiry_submit'
    ])) > 0 then count(distinct a.visitor_hash) filter (where a.action_type = any (array[
      'link_click','blog_click','video_open','gallery_open','product_click',
      'external_review_click','treatment_cta_click','service_cta_click',
      'booking_click','directions_click','email_click','phone_click',
      'social_click','share_click','enquiry_submit'
    ]))::bigint else null::bigint end,
    case when count(distinct a.visitor_hash) filter (where a.action_type = 'profile_view') > 0
      then round(100.0 * count(distinct a.visitor_hash) filter (where a.action_type = any (array[
        'link_click','blog_click','video_open','gallery_open','product_click',
        'external_review_click','treatment_cta_click','service_cta_click',
        'booking_click','directions_click','email_click','phone_click',
        'social_click','share_click','enquiry_submit'
      ])) / count(distinct a.visitor_hash) filter (where a.action_type = 'profile_view'), 1)
      else null::numeric end,
    count(*) filter (where a.goal_id is not null)::bigint,
    case when count(a.visitor_hash) filter (where a.goal_id is not null) > 0
      then count(distinct a.visitor_hash) filter (where a.goal_id is not null)::bigint
      else null::bigint end,
    case when count(distinct a.visitor_hash) filter (where a.action_type = 'profile_view') > 0
      then round(100.0 * count(distinct a.visitor_hash) filter (where a.goal_id is not null)
        / count(distinct a.visitor_hash) filter (where a.action_type = 'profile_view'), 1)
      else null::numeric end,
    max(a.occurred_at) filter (where a.goal_id is not null)
  from attributed a
  where a.touch_campaign_id is not null or a.touch_source is not null
    or a.touch_medium is not null or a.touch_campaign is not null
  group by a.touch_campaign_id, coalesce(a.touch_source, 'unattributed'),
    coalesce(a.touch_medium, 'unattributed'),
    coalesce(a.touch_campaign, 'unattributed')
  order by count(*) filter (where a.goal_id is not null) desc,
    count(*) filter (where a.action_type = 'profile_view') desc,
    coalesce(a.touch_campaign, 'unattributed');
end;
$$;

create or replace function public.record_analytics_export(
  p_profile_id uuid, p_dataset text, p_start_date date, p_end_date date,
  p_timezone text, p_row_count integer, p_schema_version smallint
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_export_id uuid;
begin
  perform private.assert_paid_analytics_access(p_profile_id);
  if not exists (
    select 1 from public.users u where u.id = p_profile_id
      and (u.subscription_status = 'PREMIUM PRO'
        or exists (select 1 from public.users actor
          where actor.id = (select auth.uid()) and actor.role = 'admin'))
  ) or p_dataset not in ('overview','content','conversions','campaigns','audience')
    or p_start_date is null or p_end_date is null or p_start_date > p_end_date
    or p_end_date > (now() at time zone 'UTC')::date
    or p_start_date < p_end_date - 730
    or nullif(btrim(p_timezone), '') is null or char_length(p_timezone) > 64
    or p_row_count < 0 or p_schema_version <> 1 then
    raise exception 'Analytics export is not available' using errcode = '42501';
  end if;
  insert into public.analytics_export_audit (
    actor_id, profile_id, dataset, start_date, end_date, timezone,
    row_count, schema_version
  ) values (
    (select auth.uid()), p_profile_id, p_dataset, p_start_date, p_end_date,
    p_timezone, p_row_count, p_schema_version
  ) returning export_id into v_export_id;
  return v_export_id;
end;
$$;

revoke all on function private.insert_default_analytics_goals() from public, anon, authenticated;
revoke all on function private.assert_paid_analytics_access(uuid) from public, anon, authenticated;
revoke all on function private.save_link_campaign(uuid,uuid,boolean,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.get_owner_conversion_goals(uuid) from public, anon;
revoke all on function public.upsert_owner_conversion_goal(uuid,uuid,text,text,uuid,bigint,boolean,smallint,boolean,bigint,text) from public, anon;
revoke all on function public.get_owner_conversion_summary(uuid,date,date) from public, anon;
revoke all on function public.get_owner_conversion_goal_performance(uuid,date,date) from public, anon;
revoke all on function public.get_owner_conversion_totals(uuid,date,date) from public, anon;
revoke all on function public.get_owner_campaign_performance(uuid,date,date) from public, anon;
revoke all on function public.record_analytics_export(uuid,text,date,date,text,integer,smallint) from public, anon;
revoke all on function public.create_dentistry_link_with_media(uuid,uuid,text,text,text,text,text,boolean,boolean,boolean,text,text,text,text,text,text) from public, anon;
revoke all on function public.update_dentistry_link_with_media(uuid,uuid,uuid,text,text,boolean,text,text,text,boolean,boolean,boolean,text,text,text,text,text,text) from public, anon;
revoke all on function public.create_dentistry_link_with_media(uuid,uuid,text,text,text,text,text,boolean,boolean) from public, anon;
revoke all on function public.update_dentistry_link_with_media(uuid,uuid,uuid,text,text,boolean,text,text,text,boolean,boolean) from public, anon;

grant execute on function public.get_owner_conversion_goals(uuid) to authenticated;
grant execute on function public.upsert_owner_conversion_goal(uuid,uuid,text,text,uuid,bigint,boolean,smallint,boolean,bigint,text) to authenticated;
grant execute on function public.get_owner_conversion_summary(uuid,date,date) to authenticated;
grant execute on function public.get_owner_conversion_goal_performance(uuid,date,date) to authenticated;
grant execute on function public.get_owner_conversion_totals(uuid,date,date) to authenticated;
grant execute on function public.get_owner_campaign_performance(uuid,date,date) to authenticated;
grant execute on function public.record_analytics_export(uuid,text,date,date,text,integer,smallint) to authenticated;
grant execute on function public.create_dentistry_link_with_media(uuid,uuid,text,text,text,text,text,boolean,boolean,boolean,text,text,text,text,text,text) to authenticated;
grant execute on function public.update_dentistry_link_with_media(uuid,uuid,uuid,text,text,boolean,text,text,text,boolean,boolean,boolean,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_dentistry_link_with_media(uuid,uuid,text,text,text,text,text,boolean,boolean) to authenticated;
grant execute on function public.update_dentistry_link_with_media(uuid,uuid,uuid,text,text,boolean,text,text,text,boolean,boolean) to authenticated;
