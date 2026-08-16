-- Stable, populated Location / Provider Router showcase. Content is written to
-- private users and existing builder-owned tables; public_profiles is updated
-- only by the production synchronization triggers.
do $template_location_router_seed$
begin
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
    '10ca7100-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-location-router@dentalbio.local',
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
    '{"username":"template-location-router","registered_domain":"dental.bio"}',
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
    '10ca7100-0000-4000-8000-000000000010',
    '10ca7100-0000-4000-8000-000000000001',
    '10ca7100-0000-4000-8000-000000000001',
    '{"sub":"10ca7100-0000-4000-8000-000000000001","email":"template-location-router@dentalbio.local"}',
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
    first_name = 'Maya',
    middle_name = null,
    last_name = 'Rahman',
    title = 'Dr',
    gdc_no = '274810',
    qualification = 'BDS, MFDS',
    birthday = '1988-06-14',
    position = 'General and Restorative Dentist',
    country = 'United Kingdom',
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = '{"schemaVersion":1,"templateId":"location-provider-router","themeId":"warm-care","layoutVariant":"classic-stack","answers":{"routerKind":"location","defaultLocationId":"10ca7100-0000-4000-8000-000000000101"}}'::jsonb,
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  where showcase.id = '10ca7100-0000-4000-8000-000000000001';

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
  values (
    '10ca7100-0000-4000-8000-000000000001',
    '10ca7100-0000-4000-8000-000000000002',
    'One care team, three convenient practices',
    'Choose the practice that works best for your day. Your selected location stays with every map, booking, call, and email action so you always reach the right team.',
    'Appointments across Brighton and Hove',
    '+441273000123',
    'care@example.com',
    'https://example.com/maya-rahman',
    'https://example.com/maya-rahman/book',
    true
  )
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
  values
    (
      '10ca7100-0000-4000-8000-000000000101',
      'Harbour Dental Studio',
      '8 Marine Parade, Brighton BN2 1TL',
      'United Kingdom',
      'Brighton',
      'Kemptown',
      50.8184,
      -0.1278
    ),
    (
      '10ca7100-0000-4000-8000-000000000102',
      'Hove Family Dental',
      '42 Church Road, Hove BN3 2FN',
      'United Kingdom',
      'Hove',
      'Central Hove',
      50.8275,
      -0.1712
    ),
    (
      '10ca7100-0000-4000-8000-000000000103',
      'North Laine Care Hub',
      '17 Gardner Street, Brighton BN1 1UP',
      'United Kingdom',
      'Brighton',
      'North Laine',
      50.8251,
      -0.1394
    )
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
  values
    (
      '10ca7100-0000-4000-8000-000000000111',
      '10ca7100-0000-4000-8000-000000000002',
      '10ca7100-0000-4000-8000-000000000101'
    ),
    (
      '10ca7100-0000-4000-8000-000000000112',
      '10ca7100-0000-4000-8000-000000000002',
      '10ca7100-0000-4000-8000-000000000102'
    ),
    (
      '10ca7100-0000-4000-8000-000000000113',
      '10ca7100-0000-4000-8000-000000000002',
      '10ca7100-0000-4000-8000-000000000103'
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
  values (
    '10ca7100-0000-4000-8000-000000000120',
    '10ca7100-0000-4000-8000-000000000002',
    'https://www.linkedin.com/in/dentalbio-demo',
    'https://x.com/dentalbio_demo',
    'https://www.instagram.com/dentalbio.demo/',
    'https://www.facebook.com/dentalbio-demo/',
    'https://www.tiktok.com/@dentalbio.demo',
    'https://example.com/maya-rahman'
  )
  on conflict (dentistry_id) do update
  set
    linkedin_link = excluded.linkedin_link,
    twitter_link = excluded.twitter_link,
    instagram_link = excluded.instagram_link,
    facebook_link = excluded.facebook_link,
    tiktok_link = excluded.tiktok_link,
    other_link = excluded.other_link;

  insert into public.general_galleries (
    id,
    user_id,
    title,
    image_url,
    rank,
    enabled
  )
  values
    (
      1627501,
      '10ca7100-0000-4000-8000-000000000001',
      'Welcoming reception',
      '/previews/hero-image-1.webp',
      1,
      true
    ),
    (
      1627502,
      '10ca7100-0000-4000-8000-000000000001',
      'Modern treatment room',
      '/previews/hero-image-2.webp',
      2,
      true
    ),
    (
      1627503,
      '10ca7100-0000-4000-8000-000000000001',
      'Friendly care team',
      '/previews/hero-image-3.webp',
      3,
      true
    )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    title = excluded.title,
    image_url = excluded.image_url,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values
    (
      1627801,
      '10ca7100-0000-4000-8000-000000000001',
      'Practice notes',
      1,
      true
    ),
    (
      1627802,
      '10ca7100-0000-4000-8000-000000000001',
      'Care guides',
      2,
      true
    ),
    (
      1627891,
      '10ca7100-0000-4000-8000-000000000001',
      'Hidden notes',
      3,
      false
    ),
    (
      1627892,
      '10ca7100-0000-4000-8000-000000000001',
      '   ',
      4,
      true
    )
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
  values
    (
      1627901,
      1627801,
      'Choosing the right practice for your visit',
      'Compare each practice location, travel route, and appointment option before choosing the place that best fits your day.',
      'Choosing the right practice for your visit',
      'A practical guide to choosing among our practice locations.',
      '/previews/hero-image-1.webp',
      '2026-01-03 09:00:00+00',
      1,
      'template-location-router-choosing-the-right-practice',
      true,
      0
    ),
    (
      1627902,
      1627801,
      'What to bring to a first appointment',
      'Bring a list of questions and any information about previous care so the team can understand what matters to you from the start.',
      'What to bring to a first appointment',
      'A short checklist for a calm and useful first dental appointment.',
      '/previews/hero-image-2.webp',
      '2026-01-04 09:00:00+00',
      2,
      'template-location-router-first-appointment',
      true,
      0
    ),
    (
      1627903,
      1627801,
      'Planning a visit around your day',
      'Checking travel time and the services available at each practice can make an appointment easier to fit around work and family.',
      'Planning a visit around your day',
      'How to plan a convenient visit to one of our practices.',
      null,
      '2026-01-05 09:00:00+00',
      3,
      'template-location-router-planning-your-visit',
      true,
      0
    ),
    (
      1627904,
      1627801,
      'How our locations work together',
      'Our teams share a consistent approach to care, while each location keeps its own practical details and appointment routes.',
      'How our locations work together',
      'Learn how care stays connected across our practice locations.',
      'javascript:alert(1)',
      '2026-01-06 09:00:00+00',
      4,
      'template-location-router-connected-locations',
      true,
      0
    ),
    (
      1627905,
      1627802,
      'A simple guide to routine check-ups',
      'Routine visits help the team notice changes early, answer questions, and keep everyday care manageable.',
      'A simple guide to routine check-ups',
      'What to expect from a routine dental check-up.',
      '/previews/preview-1.webp',
      '2026-01-07 09:00:00+00',
      1,
      'template-location-router-routine-checkups',
      true,
      0
    ),
    (
      1627906,
      1627802,
      'Questions to ask before treatment',
      'Write down the outcome you want, the options you would like explained, and anything that could affect the timing of care.',
      'Questions to ask before treatment',
      'Useful questions for an informed treatment conversation.',
      '/previews/preview-2.webp',
      '2026-01-08 09:00:00+00',
      2,
      'template-location-router-treatment-questions',
      true,
      0
    ),
    (
      1627991,
      1627801,
      'Disabled location article',
      'This disabled article is a public eligibility sentinel.',
      'Disabled location article',
      'Disabled fixture.',
      null,
      '2026-01-09 09:00:00+00',
      5,
      'template-location-router-disabled-article',
      false,
      0
    ),
    (
      1627992,
      1627801,
      '   ',
      'This blank-title article is a public eligibility sentinel.',
      '',
      '',
      null,
      '2026-01-10 09:00:00+00',
      6,
      'template-location-router-blank-title',
      true,
      0
    ),
    (
      1627993,
      1627801,
      'Invalid route article',
      'This invalid-route article is a public eligibility sentinel.',
      'Invalid route article',
      'Invalid route fixture.',
      null,
      '2026-01-11 09:00:00+00',
      7,
      'template/location-router-invalid-route',
      true,
      0
    ),
    (
      1627995,
      1627891,
      'Article in a disabled group',
      'This article proves disabled groups do not leak into the public template.',
      'Article in a disabled group',
      'Disabled group fixture.',
      null,
      '2026-01-12 09:00:00+00',
      1,
      'template-location-router-disabled-group',
      true,
      0
    ),
    (
      1627996,
      1627892,
      'Article in a blank group',
      'This article proves blank group headings do not create an inaccessible public section.',
      'Article in a blank group',
      'Blank group fixture.',
      null,
      '2026-01-13 09:00:00+00',
      1,
      'template-location-router-blank-group',
      true,
      0
    )
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
  values
    (
      1627601,
      '10ca7100-0000-4000-8000-000000000001',
      'Amina',
      'The location choice made booking simple and the team explained every step clearly.',
      5,
      '/previews/hero-image-3.webp',
      'Google',
      1,
      true
    ),
    (
      1627602,
      '10ca7100-0000-4000-8000-000000000001',
      'James',
      'A calm appointment, friendly staff, and clear directions to the practice.',
      5,
      '/previews/hero-image-1.webp',
      'Google',
      2,
      true
    )
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
  values (
    1627701,
    '10ca7100-0000-4000-8000-000000000001',
    'https://example.com/maya-rahman/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;
end;
$template_location_router_seed$;
