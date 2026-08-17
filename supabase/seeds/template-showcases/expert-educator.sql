-- Stable, image-rich Expert and Educator showcase. The fixture writes
-- only private source tables and lets the existing projection triggers publish
-- the public profile.
do $template_expert_educator_seed$
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
    'ed0ca700-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-expert-educator@dentalbio.local',
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
    '{"username":"template-expert-educator","registered_domain":"dental.bio"}',
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
    'ed0ca700-0000-4000-8000-000000000101',
    'ed0ca700-0000-4000-8000-000000000001',
    'ed0ca700-0000-4000-8000-000000000001',
    '{"sub":"ed0ca700-0000-4000-8000-000000000001","email":"template-expert-educator@dentalbio.local"}',
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
    first_name = 'Amina',
    middle_name = null,
    last_name = 'Shah',
    title = 'Dr',
    gdc_no = '251904',
    qualification = 'BDS, MSc, FHEA',
    birthday = '1988-06-14',
    position = 'Restorative Dentist & Clinical Educator',
    country = 'United Kingdom',
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = jsonb_build_object(
      'schemaVersion', 1,
      'templateId', 'expert-educator',
      'themeId', 'editorial-expert',
      'layoutVariant', 'editorial-split',
      'answers', jsonb_build_object(
        'defaultAudience', 'patients',
        'featuredContentId', 'ed0ca700-0000-4000-8000-000000000021'
      )
    ),
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  where showcase.id = 'ed0ca700-0000-4000-8000-000000000001';

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
    'ed0ca700-0000-4000-8000-000000000001',
    'ed0ca700-0000-4000-8000-000000000002',
    'Evidence made practical for healthier smiles',
    'I translate restorative dentistry and prevention research into clear choices for patients and practical teaching for dental teams. Explore a guide, join a learning session, or request a consultation.',
    'Visit Northbank Dental Education Centre',
    '+442079460315',
    'hello@aminashah.example',
    'https://example.com/dr-amina-shah',
    'https://example.com/dr-amina-shah/consultation',
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
    'ed0ca700-0000-4000-8000-000000000003',
    'Northbank Dental Education Centre',
    '24 Wimpole Street, Marylebone, London W1G 8GL',
    'United Kingdom',
    'London',
    'Marylebone',
    51.5191,
    -0.1481
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
    'ed0ca700-0000-4000-8000-000000000004',
    'ed0ca700-0000-4000-8000-000000000002',
    'ed0ca700-0000-4000-8000-000000000003'
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
    'ed0ca700-0000-4000-8000-000000000005',
    'ed0ca700-0000-4000-8000-000000000002',
    'https://linkedin.com/in/dr-amina-shah-educator',
    'https://x.com/draminashah',
    'https://instagram.com/draminashah.education',
    null,
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
      'ed0ca700-0000-4000-8000-000000000006',
      'Children''s check-ups',
      'Friendly prevention-led visits that build confidence without rushing.',
      false
    ),
    (
      'ed0ca700-0000-4000-8000-000000000007',
      'Family dental care',
      'Clear, practical care plans for adults, children, and older family members.',
      false
    ),
    (
      'ed0ca700-0000-4000-8000-000000000008',
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
      'ed0ca700-0000-4000-8000-000000000010',
      'ed0ca700-0000-4000-8000-000000000002',
      'ed0ca700-0000-4000-8000-000000000006',
      1
    ),
    (
      'ed0ca700-0000-4000-8000-000000000011',
      'ed0ca700-0000-4000-8000-000000000002',
      'ed0ca700-0000-4000-8000-000000000007',
      2
    ),
    (
      'ed0ca700-0000-4000-8000-000000000012',
      'ed0ca700-0000-4000-8000-000000000002',
      'ed0ca700-0000-4000-8000-000000000008',
      3
    )
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

  insert into public.galleries (
    id, user_id, title, before_image_url, after_image_url, rank, enabled,
    before_image_label, after_image_label
  )
  values
    (1651401, 'ed0ca700-0000-4000-8000-000000000001', 'Composite teaching case', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 1, true, 'Before treatment', 'After treatment'),
    (1651402, 'ed0ca700-0000-4000-8000-000000000001', 'Whitening teaching case', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 2, true, 'Before whitening', 'After whitening'),
    (1651403, 'ed0ca700-0000-4000-8000-000000000001', 'Restorative review case', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-whitening-after.webp', 3, true, 'Starting smile', 'Reviewed result'),
    (1651404, 'ed0ca700-0000-4000-8000-000000000001', 'Evidence-led care result', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-bonding-after.webp', 4, true, 'Before care', 'After care'),
    (1651491, 'ed0ca700-0000-4000-8000-000000000001', 'Hidden teaching case', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 5, false, 'Before', 'After'),
    (1651492, 'ed0ca700-0000-4000-8000-000000000001', ' ', 'javascript:alert(1)', '/previews/cosmetic-case-bonding-after.webp', 6, true, 'Before', 'After')
  on conflict (id) do update
  set user_id = excluded.user_id,
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
  values
    (
      1651501,
      'ed0ca700-0000-4000-8000-000000000001',
      'A calm conversation before treatment',
      '/previews/hero-image-2.webp',
      1,
      true
    ),
    (
      1651502,
      'ed0ca700-0000-4000-8000-000000000001',
      'Friendly preventive guidance',
      '/previews/hero-image-1.webp',
      2,
      true
    ),
    (
      1651503,
      'ed0ca700-0000-4000-8000-000000000001',
      'Restorative teaching workshop',
      '/previews/hero-image-3.webp',
      3,
      true
    ),
    (
      1651504,
      'ed0ca700-0000-4000-8000-000000000001',
      'Clinical learning space',
      '/previews/primary.webp',
      4,
      true
    ),
    (
      1651505,
      'ed0ca700-0000-4000-8000-000000000001',
      'Evidence and education collection',
      '/previews/template-clinic-commerce.webp',
      5,
      true
    ),
    (
      1651591,
      'ed0ca700-0000-4000-8000-000000000001',
      'Hidden educator image',
      '/previews/hero-image-1.webp',
      6,
      false
    ),
    (
      1651592,
      'ed0ca700-0000-4000-8000-000000000001',
      ' ',
      '/previews/hero-image-2.webp',
      7,
      true
    ),
    (
      1651593,
      'ed0ca700-0000-4000-8000-000000000001',
      'Unsafe educator image',
      'file:///private/educator.webp',
      8,
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
      1651601,
      'ed0ca700-0000-4000-8000-000000000001',
      'Priya, mum of two',
      'Both children left smiling. The team explained everything in simple words and never made us feel rushed.',
      5,
      '/previews/hero-image-1.webp',
      'Google',
      1,
      true
    ),
    (
      1651602,
      'ed0ca700-0000-4000-8000-000000000001',
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
    1651701,
    'ed0ca700-0000-4000-8000-000000000001',
    'https://example.com/willow-family-dental/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values
  (
    'ed0ca700-0000-4000-8000-000000000020',
    'ed0ca700-0000-4000-8000-000000000002',
    'Patient guides',
    1
  ),
  (
    'ed0ca700-0000-4000-8000-000000000030',
    'ed0ca700-0000-4000-8000-000000000002',
    'Professional learning and events',
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
      'ed0ca700-0000-4000-8000-000000000021',
      'Why teeth crack — and what happens next',
      'https://example.com/dr-amina-shah/patient-guides/cracked-teeth',
      true,
      1,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/ed0ca700-0000-4000-8000-000000000001/links/cracked-teeth.webp',
      'large-image',
      'A dentist explaining a treatment plan during a calm consultation',
      false,
      true
    ),
    (
      'ed0ca700-0000-4000-8000-000000000022',
      'A plain-language guide to gum health',
      'https://example.com/dr-amina-shah/patient-guides/gum-health',
      true,
      2,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/ed0ca700-0000-4000-8000-000000000001/links/gum-health.webp',
      'small-icon',
      'A dental professional sharing preventive guidance',
      false,
      false
    ),
    (
      'ed0ca700-0000-4000-8000-000000000031',
      'Restorative decision-making masterclass',
      'https://example.com/dr-amina-shah/professionals/masterclass',
      true,
      1,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/ed0ca700-0000-4000-8000-000000000001/links/masterclass.webp',
      'large-image',
      'Dental professionals learning together at a clinical workshop',
      false,
      false
    ),
    (
      'ed0ca700-0000-4000-8000-000000000032',
      'Live webinar: communicating treatment risk',
      'https://example.com/dr-amina-shah/professionals/webinar',
      true,
      2,
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
      'ed0ca700-0000-4000-8000-000000000023',
      'ed0ca700-0000-4000-8000-000000000020',
      'ed0ca700-0000-4000-8000-000000000021'
    ),
    (
      'ed0ca700-0000-4000-8000-000000000024',
      'ed0ca700-0000-4000-8000-000000000020',
      'ed0ca700-0000-4000-8000-000000000022'
    ),
    (
      'ed0ca700-0000-4000-8000-000000000033',
      'ed0ca700-0000-4000-8000-000000000030',
      'ed0ca700-0000-4000-8000-000000000031'
    ),
    (
      'ed0ca700-0000-4000-8000-000000000034',
      'ed0ca700-0000-4000-8000-000000000030',
      'ed0ca700-0000-4000-8000-000000000032'
    )
  on conflict (dentistry_links_id) do update
  set
    link_group_id = excluded.link_group_id,
    link_id = excluded.link_id;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values
    (
      1651801,
      'ed0ca700-0000-4000-8000-000000000001',
      'Patient evidence library',
      1,
      true
    ),
    (
      1651802,
      'ed0ca700-0000-4000-8000-000000000001',
      'Professional teaching notes',
      2,
      true
    ),
    (
      1651803,
      'ed0ca700-0000-4000-8000-000000000001',
      'Draft editorial collection',
      3,
      false
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
      1651901,
      1651801,
      'Why teeth crack and what to do next',
      'Cracked teeth can feel unpredictable. This guide explains common warning signs, why early assessment matters, and how your dentist can help you compare the available options.',
      'Why teeth crack and what to do next',
      'A clear patient guide to cracked teeth, warning signs, and assessment.',
      '/previews/preview-1.webp',
      '2026-01-03 09:00:00+00',
      1,
      'why-teeth-crack-and-what-to-do-next',
      true,
      0
    ),
    (
      1651902,
      1651801,
      'A plain-language guide to gum health',
      'Healthy gums support every part of your smile. Learn what bleeding can mean, which daily habits help, and when a professional review is useful.',
      'A plain-language guide to gum health',
      'Everyday gum-health guidance written for patients.',
      '/previews/preview-2.webp',
      '2026-01-10 09:00:00+00',
      2,
      'a-plain-language-guide-to-gum-health',
      true,
      0
    ),
    (
      1651903,
      1651801,
      'Making sense of restorative choices',
      'Restorative care often offers more than one reasonable path. This article shows how longevity, comfort, maintenance, and personal priorities can shape a shared decision.',
      'Making sense of restorative choices',
      'How patients can compare restorative options with confidence.',
      null,
      '2026-01-17 09:00:00+00',
      3,
      'making-sense-of-restorative-choices',
      true,
      0
    ),
    (
      1651904,
      1651802,
      'Teaching risk without creating alarm',
      'Risk communication works best when numbers, uncertainty, and patient priorities are discussed together. These teaching notes outline a repeatable consultation structure.',
      'Teaching risk without creating alarm',
      'Practical notes for clinicians teaching and discussing treatment risk.',
      null,
      '2026-01-24 09:00:00+00',
      1,
      'teaching-risk-without-creating-alarm',
      true,
      0
    ),
    (
      1651905,
      1651802,
      'Reflective case discussion for restorative teams',
      'A useful case discussion separates observation, interpretation, options, and reflection. Use this framework to keep multidisciplinary learning focused and constructive.',
      'Reflective case discussion for restorative teams',
      'A structured approach to reflective restorative case discussion.',
      null,
      '2026-01-31 09:00:00+00',
      2,
      'reflective-case-discussion-for-restorative-teams',
      true,
      0
    ),
    (
      1651906,
      1651802,
      'From research paper to chairside explanation',
      'Translating evidence is not the same as simplifying it away. This note explores how to retain uncertainty and clinical relevance while using language patients understand.',
      'From research paper to chairside explanation',
      'How dental educators can translate research into practical explanations.',
      null,
      '2026-02-07 09:00:00+00',
      3,
      'from-research-paper-to-chairside-explanation',
      true,
      0
    ),
    (
      1651998,
      1651802,
      'Unpublished professional draft',
      'This draft remains intentionally hidden from public profiles.',
      'Unpublished professional draft',
      'A deliberately disabled verifier record.',
      null,
      '2026-02-14 09:00:00+00',
      4,
      'unpublished-professional-draft',
      false,
      0
    ),
    (
      1651999,
      1651803,
      'Post inside a disabled group',
      'This enabled post belongs to a disabled group and remains private.',
      'Post inside a disabled group',
      'A deliberately disabled-group verifier record.',
      null,
      '2026-02-21 09:00:00+00',
      1,
      'post-inside-a-disabled-group',
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
end;
$template_expert_educator_seed$;
