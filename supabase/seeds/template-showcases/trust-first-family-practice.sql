-- Stable, image-rich Trust-First Family Practice showcase. The fixture writes
-- only private source tables and lets the existing projection triggers publish
-- the public profile.
do $template_trust_first_seed$
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
    '7f570000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-trust-first@dentalbio.local',
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
    '{"username":"template-trust-first","registered_domain":"dental.bio"}',
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
    '7f570000-0000-4000-8000-000000000101',
    '7f570000-0000-4000-8000-000000000001',
    '7f570000-0000-4000-8000-000000000001',
    '{"sub":"7f570000-0000-4000-8000-000000000001","email":"template-trust-first@dentalbio.local"}',
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
    first_name = 'Sara',
    middle_name = null,
    last_name = 'Morgan',
    title = 'Dr',
    gdc_no = '264718',
    qualification = 'BDS, MFDS RCS',
    birthday = '1988-06-14',
    position = 'Family Dentist',
    country = 'United Kingdom',
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = jsonb_build_object(
      'schemaVersion', 1,
      'templateId', 'trust-first-family-practice',
      'themeId', 'warm-care',
      'layoutVariant', 'classic-stack',
      'answers', jsonb_build_object(
        'featuredReviewIds', jsonb_build_array('1637602', '1637601'),
        'priorityInformation', jsonb_build_array(
          'anxiety-care',
          'payment',
          'accessibility'
        )
      )
    ),
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  where showcase.id = '7f570000-0000-4000-8000-000000000001';

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
    '7f570000-0000-4000-8000-000000000001',
    '7f570000-0000-4000-8000-000000000002',
    'Gentle dental visits for every generation',
    'From a child''s first check-up to ongoing adult care, we listen before we look. Tell us what would help you feel comfortable and our family team will explain each step, make time for questions, and agree a pace that works for you.',
    'Visit Willow Family Dental',
    '+442079460245',
    'hello@willowfamily.example',
    'https://example.com/willow-family-dental',
    'https://example.com/willow-family-dental/book',
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
  values (
    '7f570000-0000-4000-8000-000000000003',
    'Willow Family Dental',
    '42 Willow Road, Richmond, London TW9 2LS',
    'United Kingdom',
    'London',
    'Richmond',
    51.4613,
    -0.3037
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
  values (
    '7f570000-0000-4000-8000-000000000004',
    '7f570000-0000-4000-8000-000000000002',
    '7f570000-0000-4000-8000-000000000003'
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
    '7f570000-0000-4000-8000-000000000005',
    '7f570000-0000-4000-8000-000000000002',
    null,
    null,
    'https://instagram.com/willowfamilydental',
    'https://facebook.com/willowfamilydental',
    null,
    null
  )
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
  values
    (
      '7f570000-0000-4000-8000-000000000006',
      'Children''s check-ups',
      'Friendly prevention-led visits that build confidence without rushing.',
      false
    ),
    (
      '7f570000-0000-4000-8000-000000000007',
      'Family dental care',
      'Clear, practical care plans for adults, children, and older family members.',
      false
    ),
    (
      '7f570000-0000-4000-8000-000000000008',
      'Gentle hygiene visits',
      'Comfort-focused preventive support tailored to sensitivity and dental anxiety.',
      false
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
  values
    (
      '7f570000-0000-4000-8000-000000000010',
      '7f570000-0000-4000-8000-000000000002',
      '7f570000-0000-4000-8000-000000000006',
      1
    ),
    (
      '7f570000-0000-4000-8000-000000000011',
      '7f570000-0000-4000-8000-000000000002',
      '7f570000-0000-4000-8000-000000000007',
      2
    ),
    (
      '7f570000-0000-4000-8000-000000000012',
      '7f570000-0000-4000-8000-000000000002',
      '7f570000-0000-4000-8000-000000000008',
      3
    )
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

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
      1637501,
      '7f570000-0000-4000-8000-000000000001',
      'A calm conversation before treatment',
      '/previews/hero-image-2.webp',
      1,
      true
    ),
    (
      1637502,
      '7f570000-0000-4000-8000-000000000001',
      'Friendly preventive guidance',
      '/previews/hero-image-1.webp',
      2,
      true
    )
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
  values
    (
      1637601,
      '7f570000-0000-4000-8000-000000000001',
      'Priya, mum of two',
      'Both children left smiling. The team explained everything in simple words and never made us feel rushed.',
      5,
      '/previews/hero-image-1.webp',
      'Google',
      1,
      true
    ),
    (
      1637602,
      '7f570000-0000-4000-8000-000000000001',
      'Michael T.',
      'I had avoided dentists for years, but every choice was explained and I stayed in control throughout the visit.',
      5,
      '/previews/hero-image-2.webp',
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
    1637701,
    '7f570000-0000-4000-8000-000000000001',
    'https://example.com/willow-family-dental/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values (
    '7f570000-0000-4000-8000-000000000020',
    '7f570000-0000-4000-8000-000000000002',
    'New patient resources',
    1
  )
  on conflict (link_group_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    heading = excluded.heading,
    rank = excluded.rank;

  insert into public.links (
    link_id,
    title,
    link,
    is_active,
    rank,
    click_counter,
    image_url,
    image_variant,
    image_alt,
    image_decorative,
    is_featured
  )
  values
    (
      '7f570000-0000-4000-8000-000000000021',
      'What to expect at your first visit',
      'https://example.com/willow-family-dental/first-visit',
      true,
      1,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/7f570000-0000-4000-8000-000000000001/links/first-visit.webp',
      'large-image',
      'A dentist giving friendly preventive guidance',
      false,
      true
    ),
    (
      '7f570000-0000-4000-8000-000000000022',
      'Payment and insurance guide',
      'https://example.com/willow-family-dental/payment-guide',
      true,
      2,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/7f570000-0000-4000-8000-000000000001/links/payment-guide.webp',
      'small-icon',
      'A calm conversation with a dentist',
      false,
      false
    )
  on conflict (link_id) do update
  set
    title = excluded.title,
    link = excluded.link,
    is_active = excluded.is_active,
    rank = excluded.rank,
    image_url = excluded.image_url,
    image_variant = excluded.image_variant,
    image_alt = excluded.image_alt,
    image_decorative = excluded.image_decorative,
    is_featured = excluded.is_featured;

  insert into public.dentistry_links (
    dentistry_links_id,
    link_group_id,
    link_id
  )
  values
    (
      '7f570000-0000-4000-8000-000000000023',
      '7f570000-0000-4000-8000-000000000020',
      '7f570000-0000-4000-8000-000000000021'
    ),
    (
      '7f570000-0000-4000-8000-000000000024',
      '7f570000-0000-4000-8000-000000000020',
      '7f570000-0000-4000-8000-000000000022'
    )
  on conflict (dentistry_links_id) do update
  set
    link_group_id = excluded.link_group_id,
    link_id = excluded.link_id;
end;
$template_trust_first_seed$;
