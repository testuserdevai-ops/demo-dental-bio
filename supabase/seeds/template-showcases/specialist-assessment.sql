-- Stable, fictional Specialist Assessment showcase. Content is written to the
-- private owner source and builder-owned tables; public_profiles is populated
-- only by the production synchronization triggers.
do $template_specialist_assessment_seed$
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
    birthday = '1988-06-14',
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
  where showcase.id = '5a5e5500-0000-4000-8000-000000000001';

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

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values
    (1655801, '5a5e5500-0000-4000-8000-000000000001', 'Preparing for assessment', 1, true),
    (1655802, '5a5e5500-0000-4000-8000-000000000001', 'After your assessment', 2, true),
    (1655891, '5a5e5500-0000-4000-8000-000000000001', 'Disabled specialist articles', 3, false),
    (1655892, '5a5e5500-0000-4000-8000-000000000001', '   ', 4, true)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blogs (
    id, group_id, title, content, meta_title, meta_description, image_url,
    created_at, rank, slug, enabled, click_counter
  )
  values
    (1655901, 1655801, 'Preparing for a specialist assessment', 'An owner-written guide to symptoms, previous care, and the information that helps a specialist review your needs.', 'Preparing for a specialist assessment', 'How to prepare for a specialist dental assessment.', '/previews/preview-1.webp', '2026-01-02 09:00:00+00', 1, 'preparing-for-a-specialist-assessment', true, 0),
    (1655902, 1655801, 'Questions to bring to your visit', 'A practical owner-written checklist of the questions that can help you understand your options and next steps.', 'Questions to bring to your visit', 'Questions for a specialist appointment.', '/previews/preview-2.webp', '2026-01-03 09:00:00+00', 2, 'questions-to-bring-to-your-visit', true, 0),
    (1655903, 1655801, 'Sending helpful records securely', 'Owner-managed advice on sharing recent notes, radiographs, and referral information before the appointment.', 'Sending helpful records securely', 'Records that support a specialist review.', null, '2026-01-04 09:00:00+00', 3, 'sending-helpful-records-securely', true, 0),
    (1655904, 1655801, 'What happens at a first specialist visit', 'A clear guide to assessment, diagnosis, discussion, and planning a manageable next step.', 'What happens at a first specialist visit', 'A first specialist visit explained.', null, '2026-01-05 09:00:00+00', 4, 'what-happens-at-a-first-specialist-visit', true, 0),
    (1655905, 1655802, 'Understanding your referral', 'Owner-written information about referral routes, the records that help, and how the team supports your next step.', 'Understanding your referral', 'Understanding a specialist referral.', null, '2026-01-06 09:00:00+00', 1, 'understanding-your-referral', true, 0),
    (1655906, 1655802, 'Planning follow-up care together', 'A practical guide to discussing treatment choices, timing, and follow-up after specialist advice.', 'Planning follow-up care together', 'Planning specialist follow-up care.', null, '2026-01-07 09:00:00+00', 2, 'planning-follow-up-care-together', true, 0),
    (1655991, 1655801, 'Disabled specialist article', 'This disabled article is a public eligibility sentinel.', 'Disabled specialist article', 'Disabled fixture.', null, '2026-01-08 09:00:00+00', 5, 'disabled-specialist-article', false, 0),
    (1655992, 1655801, '   ', 'This blank-title article is a public eligibility sentinel.', '', '', null, '2026-01-09 09:00:00+00', 6, 'blank-specialist-title', true, 0),
    (1655993, 1655801, 'Invalid specialist route', 'This invalid-route article is a public eligibility sentinel.', 'Invalid specialist route', 'Invalid route fixture.', null, '2026-01-10 09:00:00+00', 7, 'specialist/invalid-route', true, 0),
    (1655994, 1655891, 'Article in a disabled specialist group', 'This article proves disabled groups stay private.', 'Article in a disabled specialist group', 'Disabled group fixture.', null, '2026-01-11 09:00:00+00', 1, 'specialist-disabled-group', true, 0),
    (1655995, 1655892, 'Article in a blank specialist group', 'This article proves blank group names do not create inaccessible sections.', 'Article in a blank specialist group', 'Blank group fixture.', null, '2026-01-12 09:00:00+00', 1, 'specialist-blank-group', true, 0)
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
