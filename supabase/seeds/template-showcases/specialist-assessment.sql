-- Stable, fictional Specialist Assessment showcase. Content is written to the
-- private owner source and builder-owned tables; public_profiles is populated
-- only by the production synchronization triggers.
do $template_specialist_assessment_seed$
begin
  if not exists (
    select 1 from public.users
    where id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Specialist Assessment showcase requires the rich Pro seed';
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
    '5a5e5500-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-specialist-assessment@dentalbio.local',
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
    '{"username":"template-specialist-assessment","registered_domain":"dental.bio"}',
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
    '5a5e5500-0000-4000-8000-000000000010',
    '5a5e5500-0000-4000-8000-000000000001',
    '5a5e5500-0000-4000-8000-000000000001',
    '{"sub":"5a5e5500-0000-4000-8000-000000000001","email":"template-specialist-assessment@dentalbio.local"}',
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
    first_name = 'Amara',
    middle_name = null,
    last_name = 'Shah',
    title = 'Dr',
    gdc_no = '274512',
    qualification = 'BDS, MFDS RCS, MEndo',
    birthday = source.birthday,
    position = 'Consultant Endodontist',
    country = 'United Kingdom',
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = '{"schemaVersion":1,"templateId":"specialist-assessment","themeId":"modern-specialist","layoutVariant":"section-navigator","answers":{"primaryPath":"assessment","referralRequired":true}}'::jsonb,
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  from public.users source
  where showcase.id = '5a5e5500-0000-4000-8000-000000000001'
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
  values (
    '5a5e5500-0000-4000-8000-000000000001',
    '5a5e5500-0000-4000-8000-000000000002',
    'Understand your tooth pain and the right next step',
    'Start with a focused online assessment or arrange a consultation. The team reviews your concern, referral notes, and imaging before confirming the most useful appointment.',
    'Specialist consultations in Fitzrovia',
    '+442071235680',
    'referrals@amarashah.example',
    'https://example.com/amara-shah-endodontics',
    'https://example.com/amara-shah-endodontics/book',
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
    '5a5e5500-0000-4000-8000-000000000101',
    'Fitzrovia Endodontic Centre',
    '24 Queen Anne Street, Fitzrovia, London W1G 9LG',
    'United Kingdom',
    'London',
    'Fitzrovia',
    51.5193,
    -0.1453
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
    '5a5e5500-0000-4000-8000-000000000102',
    '5a5e5500-0000-4000-8000-000000000002',
    '5a5e5500-0000-4000-8000-000000000101'
  )
  on conflict (dentistry_location_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    location_id = excluded.location_id;

  insert into public.treatments (
    treatment_id,
    title,
    description,
    "isService"
  )
  values
    (
      '5a5e5500-0000-4000-8000-000000000201',
      'Root canal assessment',
      'A focused review of symptoms, scans, and treatment options for a painful or compromised tooth.',
      false
    ),
    (
      '5a5e5500-0000-4000-8000-000000000202',
      'Complex dental pain',
      'Diagnostic support when the source of persistent tooth or facial pain is not yet clear.',
      false
    ),
    (
      '5a5e5500-0000-4000-8000-000000000203',
      'Dental trauma review',
      'Timely specialist assessment after an injury, including guidance for the referring care team.',
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
      '5a5e5500-0000-4000-8000-000000000211',
      '5a5e5500-0000-4000-8000-000000000002',
      '5a5e5500-0000-4000-8000-000000000201',
      1
    ),
    (
      '5a5e5500-0000-4000-8000-000000000212',
      '5a5e5500-0000-4000-8000-000000000002',
      '5a5e5500-0000-4000-8000-000000000202',
      2
    ),
    (
      '5a5e5500-0000-4000-8000-000000000213',
      '5a5e5500-0000-4000-8000-000000000002',
      '5a5e5500-0000-4000-8000-000000000203',
      3
    )
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values
    (
      '5a5e5500-0000-4000-8000-000000000301',
      '5a5e5500-0000-4000-8000-000000000002',
      'Assessment and referral',
      1
    ),
    (
      '5a5e5500-0000-4000-8000-000000000302',
      '5a5e5500-0000-4000-8000-000000000002',
      'Patient guides',
      2
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
      '5a5e5500-0000-4000-8000-000000000311',
      'Online specialist assessment',
      'https://example.com/amara-shah-endodontics/assessment',
      true,
      1,
      0,
      '/previews/hero-image-2.webp',
      'large-image',
      'Specialist consultation room',
      false,
      true
    ),
    (
      '5a5e5500-0000-4000-8000-000000000312',
      'Dentist referral guide',
      'https://example.com/amara-shah-endodontics/referral',
      true,
      2,
      0,
      null,
      'none',
      null,
      true,
      false
    ),
    (
      '5a5e5500-0000-4000-8000-000000000313',
      'Urgent and aftercare advice',
      'https://example.com/amara-shah-endodontics/urgent-care',
      true,
      1,
      0,
      null,
      'none',
      null,
      true,
      false
    ),
    (
      '5a5e5500-0000-4000-8000-000000000314',
      'Insurance and fee information',
      'https://example.com/amara-shah-endodontics/fees',
      true,
      2,
      0,
      null,
      'none',
      null,
      true,
      false
    ),
    (
      '5a5e5500-0000-4000-8000-000000000315',
      'Frequently asked questions',
      'https://example.com/amara-shah-endodontics/questions',
      true,
      3,
      0,
      null,
      'none',
      null,
      true,
      false
    )
  on conflict (link_id) do update
  set
    title = excluded.title,
    link = excluded.link,
    is_active = excluded.is_active,
    rank = excluded.rank,
    click_counter = excluded.click_counter,
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
      '5a5e5500-0000-4000-8000-000000000321',
      '5a5e5500-0000-4000-8000-000000000301',
      '5a5e5500-0000-4000-8000-000000000311'
    ),
    (
      '5a5e5500-0000-4000-8000-000000000322',
      '5a5e5500-0000-4000-8000-000000000301',
      '5a5e5500-0000-4000-8000-000000000312'
    ),
    (
      '5a5e5500-0000-4000-8000-000000000323',
      '5a5e5500-0000-4000-8000-000000000302',
      '5a5e5500-0000-4000-8000-000000000313'
    ),
    (
      '5a5e5500-0000-4000-8000-000000000324',
      '5a5e5500-0000-4000-8000-000000000302',
      '5a5e5500-0000-4000-8000-000000000314'
    ),
    (
      '5a5e5500-0000-4000-8000-000000000325',
      '5a5e5500-0000-4000-8000-000000000302',
      '5a5e5500-0000-4000-8000-000000000315'
    )
  on conflict (dentistry_links_id) do update
  set
    link_group_id = excluded.link_group_id,
    link_id = excluded.link_id;

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
      1655501,
      '5a5e5500-0000-4000-8000-000000000001',
      'A calm room for specialist consultation',
      '/previews/hero-image-2.webp',
      1,
      true
    ),
    (
      1655502,
      '5a5e5500-0000-4000-8000-000000000001',
      'Digital assessment planning',
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
      1655601,
      '5a5e5500-0000-4000-8000-000000000001',
      'Leila M.',
      'The assessment made the referral process straightforward. I knew what records to send and what the consultation would cover.',
      5,
      null,
      'Google',
      1,
      true
    ),
    (
      1655602,
      '5a5e5500-0000-4000-8000-000000000001',
      'Tom R.',
      'A very clear explanation of a complicated tooth problem, with practical next steps and no pressure.',
      5,
      null,
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
    1655701,
    '5a5e5500-0000-4000-8000-000000000001',
    'https://example.com/amara-shah-endodontics/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;
end;
$template_specialist_assessment_seed$;
