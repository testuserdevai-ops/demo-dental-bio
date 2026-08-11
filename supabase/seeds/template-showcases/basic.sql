-- Stable, fully populated Basic template showcase. This intentionally clones
-- the existing rich Pro fixture through existing content tables instead of
-- maintaining a second free-form content corpus. Future template showcases
-- can follow this deterministic copy-and-relink pattern.
do $template_basic_seed$
begin
  if not exists (
    select 1 from public.users
    where id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Basic template showcase requires the rich Pro seed';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    'ba510000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-basic@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-basic","registered_domain":"dental.bio"}',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    false,
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at,
    is_sso_user = excluded.is_sso_user,
    is_anonymous = excluded.is_anonymous;

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    'ba510000-0000-4000-8000-000000000101',
    'ba510000-0000-4000-8000-000000000001',
    'ba510000-0000-4000-8000-000000000001',
    '{"sub":"ba510000-0000-4000-8000-000000000001","email":"template-basic@dentalbio.local"}',
    'email',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (provider_id, provider) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;

  update public.users showcase
  set
    first_name = source.first_name,
    middle_name = source.middle_name,
    last_name = source.last_name,
    title = source.title,
    gdc_no = source.gdc_no,
    qualification = source.qualification,
    birthday = source.birthday,
    position = source.position,
    country = source.country,
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = '{"schemaVersion":1,"templateId":"basic","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{}}'::jsonb,
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  from public.users source
  where showcase.id = 'ba510000-0000-4000-8000-000000000001'
    and source.id = '11111111-1111-4111-8111-111111111111';

  insert into public.dentistries (
    user_id,
    dentistry_id,
    about_title,
    about_text,
    location_title,
    phone,
    contact_email,
    website,
    booking_link,
    booking_link_enabled
  )
  select
    'ba510000-0000-4000-8000-000000000001',
    'ba510000-0000-4000-8000-000000000002',
    'Complete care for confident smiles',
    about_text,
    location_title,
    phone,
    'template-basic@example.com',
    website,
    booking_link,
    booking_link_enabled
  from public.dentistries
  where user_id = '11111111-1111-4111-8111-111111111111'
  on conflict (user_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    about_title = excluded.about_title,
    about_text = excluded.about_text,
    location_title = excluded.location_title,
    phone = excluded.phone,
    contact_email = excluded.contact_email,
    website = excluded.website,
    booking_link = excluded.booking_link,
    booking_link_enabled = excluded.booking_link_enabled;

  insert into public.locations (
    location_id,
    business_name,
    full_address,
    country,
    city,
    area,
    latitude,
    longitude
  )
  select
    'ba510000-0000-4000-8000-000000000003',
    'Basic Template Dental Studio',
    full_address,
    country,
    city,
    area,
    latitude,
    longitude
  from public.locations
  where location_id = '11111111-1111-4111-8111-111111111190'
  on conflict (location_id) do update
  set
    business_name = excluded.business_name,
    full_address = excluded.full_address,
    country = excluded.country,
    city = excluded.city,
    area = excluded.area,
    latitude = excluded.latitude,
    longitude = excluded.longitude;

  insert into public.dentistry_locations (
    dentistry_location_id,
    dentistry_id,
    location_id
  )
  values (
    'ba510000-0000-4000-8000-000000000004',
    'ba510000-0000-4000-8000-000000000002',
    'ba510000-0000-4000-8000-000000000003'
  )
  on conflict (dentistry_location_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    location_id = excluded.location_id;

  insert into public.socials (
    dentistry_socials_id,
    dentistry_id,
    linkedin_link,
    twitter_link,
    instagram_link,
    facebook_link,
    tiktok_link,
    other_link
  )
  select
    'ba510000-0000-4000-8000-000000000005',
    'ba510000-0000-4000-8000-000000000002',
    linkedin_link,
    twitter_link,
    instagram_link,
    facebook_link,
    tiktok_link,
    other_link
  from public.socials
  where dentistry_id = '11111111-1111-4111-8111-111111111120'
  on conflict (dentistry_id) do update
  set
    linkedin_link = excluded.linkedin_link,
    twitter_link = excluded.twitter_link,
    instagram_link = excluded.instagram_link,
    facebook_link = excluded.facebook_link,
    tiktok_link = excluded.tiktok_link,
    other_link = excluded.other_link;

  insert into public.treatments (
    treatment_id,
    title,
    description,
    "isService"
  )
  select
    case treatment_id
      when '11111111-1111-4111-8111-111111111130' then 'ba510000-0000-4000-8000-000000000006'::uuid
      when '11111111-1111-4111-8111-111111111131' then 'ba510000-0000-4000-8000-000000000007'::uuid
      else 'ba510000-0000-4000-8000-000000000008'::uuid
    end,
    title,
    description,
    "isService"
  from public.treatments
  where treatment_id in (
    '11111111-1111-4111-8111-111111111130',
    '11111111-1111-4111-8111-111111111131',
    '11111111-1111-4111-8111-111111111132'
  )
  on conflict (treatment_id) do update
  set
    title = excluded.title,
    description = excluded.description,
    "isService" = excluded."isService";

  insert into public.dentistry_treatments (
    dentistry_treatment_id,
    dentistry_id,
    treatment_id,
    rank
  )
  select
    case treatment_id
      when '11111111-1111-4111-8111-111111111130' then 'ba510000-0000-4000-8000-000000000010'::uuid
      when '11111111-1111-4111-8111-111111111131' then 'ba510000-0000-4000-8000-000000000011'::uuid
      else 'ba510000-0000-4000-8000-000000000012'::uuid
    end,
    'ba510000-0000-4000-8000-000000000002',
    case treatment_id
      when '11111111-1111-4111-8111-111111111130' then 'ba510000-0000-4000-8000-000000000006'::uuid
      when '11111111-1111-4111-8111-111111111131' then 'ba510000-0000-4000-8000-000000000007'::uuid
      else 'ba510000-0000-4000-8000-000000000008'::uuid
    end,
    rank
  from public.dentistry_treatments
  where dentistry_id = '11111111-1111-4111-8111-111111111120'
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

  insert into public.groups (id, user_id, name, rank, enabled, type)
  select
    case id when 1111101 then 1511101 else 1511102 end,
    'ba510000-0000-4000-8000-000000000001',
    name,
    rank,
    enabled,
    type
  from public.groups
  where id in (1111101, 1111102)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    rank = excluded.rank,
    enabled = excluded.enabled,
    type = excluded.type;

  insert into public.videos (id, group_id, title, link, rank, enabled)
  select
    case id when 1111201 then 1511201 else 1511202 end,
    1511101,
    title,
    link,
    rank,
    enabled
  from public.videos
  where id in (1111201, 1111202)
  on conflict (id) do update
  set
    group_id = excluded.group_id,
    title = excluded.title,
    link = excluded.link,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  select
    1511801,
    'ba510000-0000-4000-8000-000000000001',
    name,
    rank,
    enabled
  from public.blog_groups
  where id = 1111801
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blogs (
    id,
    group_id,
    title,
    content,
    meta_title,
    meta_description,
    image_url,
    created_at,
    rank,
    slug,
    enabled,
    click_counter
  )
  select
    case id when 1111901 then 1511901 else 1511902 end,
    1511801,
    title,
    content,
    meta_title,
    meta_description,
    image_url,
    created_at,
    rank,
    'template-basic-' || slug,
    enabled,
    0
  from public.blogs
  where id in (1111901, 1111902)
  on conflict (id) do update
  set
    group_id = excluded.group_id,
    title = excluded.title,
    content = excluded.content,
    meta_title = excluded.meta_title,
    meta_description = excluded.meta_description,
    image_url = excluded.image_url,
    created_at = excluded.created_at,
    rank = excluded.rank,
    slug = excluded.slug,
    enabled = excluded.enabled,
    click_counter = excluded.click_counter;

  insert into public.products (
    id,
    group_id,
    name,
    link,
    platform,
    image_url,
    price,
    currency,
    rank,
    enabled,
    user_id
  )
  select
    case id when 1111301 then 1511301 else 1511302 end,
    1511102,
    name,
    link,
    platform,
    image_url,
    price,
    currency,
    rank,
    enabled,
    'ba510000-0000-4000-8000-000000000001'
  from public.products
  where id in (1111301, 1111302)
  on conflict (id) do update
  set
    group_id = excluded.group_id,
    name = excluded.name,
    link = excluded.link,
    platform = excluded.platform,
    image_url = excluded.image_url,
    price = excluded.price,
    currency = excluded.currency,
    rank = excluded.rank,
    enabled = excluded.enabled,
    user_id = excluded.user_id;

  insert into public.galleries (
    id,
    user_id,
    title,
    before_image_url,
    after_image_url,
    rank,
    enabled,
    before_image_label,
    after_image_label
  )
  select
    1511401,
    'ba510000-0000-4000-8000-000000000001',
    title,
    before_image_url,
    after_image_url,
    rank,
    enabled,
    before_image_label,
    after_image_label
  from public.galleries
  where id = 1111401
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    title = excluded.title,
    before_image_url = excluded.before_image_url,
    after_image_url = excluded.after_image_url,
    rank = excluded.rank,
    enabled = excluded.enabled,
    before_image_label = excluded.before_image_label,
    after_image_label = excluded.after_image_label;

  insert into public.general_galleries (
    id,
    user_id,
    title,
    image_url,
    rank,
    enabled
  )
  select
    case id when 1111501 then 1511501 else 1511502 end,
    'ba510000-0000-4000-8000-000000000001',
    title,
    image_url,
    rank,
    enabled
  from public.general_galleries
  where id in (1111501, 1111502)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    title = excluded.title,
    image_url = excluded.image_url,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.reviews (
    id,
    user_id,
    reviewer_name,
    content,
    stars,
    image_url,
    platform,
    rank,
    enabled
  )
  select
    case id when 1111601 then 1511601 else 1511602 end,
    'ba510000-0000-4000-8000-000000000001',
    reviewer_name,
    content,
    stars,
    image_url,
    platform,
    rank,
    enabled
  from public.reviews
  where id in (1111601, 1111602)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    reviewer_name = excluded.reviewer_name,
    content = excluded.content,
    stars = excluded.stars,
    image_url = excluded.image_url,
    platform = excluded.platform,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.external_review_pages (id, user_id, link)
  select
    1511701,
    'ba510000-0000-4000-8000-000000000001',
    link
  from public.external_review_pages
  where id = 1111701
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  select
    'ba510000-0000-4000-8000-000000000020',
    'ba510000-0000-4000-8000-000000000002',
    heading,
    rank
  from public.link_groups
  where link_group_id = '11111111-1111-4111-8111-111111111180'
  on conflict (link_group_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    heading = excluded.heading,
    rank = excluded.rank;

  insert into public.links (link_id, title, link, is_active, rank, click_counter)
  select
    case link_id
      when '11111111-1111-4111-8111-111111111181' then 'ba510000-0000-4000-8000-000000000021'::uuid
      else 'ba510000-0000-4000-8000-000000000022'::uuid
    end,
    title,
    link,
    is_active,
    rank,
    0
  from public.links
  where link_id in (
    '11111111-1111-4111-8111-111111111181',
    '11111111-1111-4111-8111-111111111182'
  )
  on conflict (link_id) do update
  set
    title = excluded.title,
    link = excluded.link,
    is_active = excluded.is_active,
    rank = excluded.rank,
    click_counter = excluded.click_counter;

  insert into public.dentistry_links (
    dentistry_links_id,
    link_group_id,
    link_id
  )
  values
    (
      'ba510000-0000-4000-8000-000000000023',
      'ba510000-0000-4000-8000-000000000020',
      'ba510000-0000-4000-8000-000000000021'
    ),
    (
      'ba510000-0000-4000-8000-000000000024',
      'ba510000-0000-4000-8000-000000000020',
      'ba510000-0000-4000-8000-000000000022'
    )
  on conflict (dentistry_links_id) do update
  set
    link_group_id = excluded.link_group_id,
    link_id = excluded.link_id;
end;
$template_basic_seed$;
