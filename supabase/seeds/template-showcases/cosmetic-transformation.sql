-- Stable, fully populated Cosmetic Transformation template showcase. It reuses the
-- existing rich fixture as a content source while assigning independent IDs,
-- owner records, and presentation answers for this renderer.
do $template_cosmetic_transformation_seed$
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
    'c051e71c-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-cosmetic-results@dentalbio.local',
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
    '{"username":"template-cosmetic-results","registered_domain":"dental.bio"}',
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
    'c051e71c-0000-4000-8000-000000000101',
    'c051e71c-0000-4000-8000-000000000001',
    'c051e71c-0000-4000-8000-000000000001',
    '{"sub":"c051e71c-0000-4000-8000-000000000001","email":"template-cosmetic-results@dentalbio.local"}',
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
    first_name = 'Mila',
    middle_name = null,
    last_name = 'Rahman',
    title = 'Dr',
    gdc_no = '284901',
    qualification = 'BDS, MJDF RCS',
    birthday = '1988-06-14',
    position = 'General & Cosmetic Dentist',
    country = 'United Kingdom',
    subscription_status = 'PRO',
    "isVerified" = true,
    use_dental_brand = true,
    registered_domain = 'dental.bio',
    domain = null,
    domain_verified = false,
    profile_presentation_published = jsonb_build_object(
      'schemaVersion', 1,
      'templateId', 'cosmetic-transformation',
      'themeId', 'premium-contrast',
      'layoutVariant', 'hero-overlap',
      'answers', jsonb_build_object(
        'signatureTreatmentId', 'c051e71c-0000-4000-8000-000000000006',
        'consultationKind', 'free',
        'featuredGalleryIds', jsonb_build_array('1641401', '1641402'),
        'featuredReviewIds', jsonb_build_array('1641601', '1641602')
      )
    ),
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  where showcase.id = 'c051e71c-0000-4000-8000-000000000001';

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
    'c051e71c-0000-4000-8000-000000000001',
    'c051e71c-0000-4000-8000-000000000002',
    'Natural-looking smile transformations, planned with care',
    'Dr Mila Rahman takes time to understand what you would like to change, explains realistic options, and builds a treatment plan around your health, comfort, and preferred pace.',
    'Smile Studio Marylebone',
    '+442079460123',
    'appointments@smilesbymila.example',
    'https://example.com/smiles-by-mila-dentistry',
    'https://example.com/smiles-by-mila-dentistry/book',
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
    'c051e71c-0000-4000-8000-000000000003',
    'Mila Rahman Smile Studio',
    '18 Harley Street, Marylebone, London W1G 9QH',
    'United Kingdom',
    'London',
    'Marylebone',
    51.5186,
    -0.1472
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
    'c051e71c-0000-4000-8000-000000000004',
    'c051e71c-0000-4000-8000-000000000002',
    'c051e71c-0000-4000-8000-000000000003'
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
    'c051e71c-0000-4000-8000-000000000005',
    'c051e71c-0000-4000-8000-000000000002',
    'https://linkedin.com/in/smiles-by-mila-dentist',
    null,
    'https://instagram.com/smilesbymiladentistry',
    'https://facebook.com/smilesbymiladentistry',
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
      'c051e71c-0000-4000-8000-000000000006',
      'Composite bonding',
      'Carefully planned edge and shape refinements designed to retain a natural-looking smile.',
      false
    ),
    (
      'c051e71c-0000-4000-8000-000000000007',
      'Clear aligners',
      'Discreet orthodontic planning with regular clinical reviews and clear progress milestones.',
      false
    ),
    (
      'c051e71c-0000-4000-8000-000000000008',
      'Dentist-supervised whitening',
      'A tailored whitening plan designed for a comfortable, natural-looking result.',
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
      'c051e71c-0000-4000-8000-000000000010',
      'c051e71c-0000-4000-8000-000000000002',
      'c051e71c-0000-4000-8000-000000000006',
      2
    ),
    (
      'c051e71c-0000-4000-8000-000000000011',
      'c051e71c-0000-4000-8000-000000000002',
      'c051e71c-0000-4000-8000-000000000007',
      1
    ),
    (
      'c051e71c-0000-4000-8000-000000000012',
      'c051e71c-0000-4000-8000-000000000002',
      'c051e71c-0000-4000-8000-000000000008',
      3
    )
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

  -- These are fictional demonstration images generated for the local showcase.
  -- They contain no real patient data and make no guarantee of an outcome.
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
  values
    (
      1641401,
      'c051e71c-0000-4000-8000-000000000001',
      'Fictional demo case — subtle edge refinement',
      '/previews/cosmetic-case-bonding-before.webp',
      '/previews/cosmetic-case-bonding-after.webp',
      1,
      true,
      'Before — fictional demo',
      'After — fictional demo'
    ),
    (
      1641402,
      'c051e71c-0000-4000-8000-000000000001',
      'Fictional demo case — natural shade change',
      '/previews/cosmetic-case-whitening-before.webp',
      '/previews/cosmetic-case-whitening-after.webp',
      2,
      true,
      'Before — fictional demo',
      'After — fictional demo'
    ),
    (1641403, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — balanced proportions', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 3, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641404, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — considered alignment', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 4, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641405, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — gentle contouring', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 5, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641406, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — natural texture', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 6, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641407, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — refined symmetry', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 7, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641408, 'c051e71c-0000-4000-8000-000000000001', 'Fictional demo case — subtle brightness', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 8, true, 'Before — fictional demo', 'After — fictional demo'),
    (1641491, 'c051e71c-0000-4000-8000-000000000001', 'Disabled gallery sentinel', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 91, false, 'Before', 'After'),
    (1641492, 'c051e71c-0000-4000-8000-000000000001', '   ', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 92, true, 'Before', 'After'),
    (1641493, 'c051e71c-0000-4000-8000-000000000001', 'Incomplete gallery sentinel', '/previews/cosmetic-case-bonding-before.webp', null, 93, true, 'Before', 'After'),
    (1641494, 'c051e71c-0000-4000-8000-000000000001', 'Unsafe gallery sentinel', 'javascript:alert(1)', '/previews/cosmetic-case-bonding-after.webp', 94, true, 'Before', 'After'
    )
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
  values
    (1641501, 'c051e71c-0000-4000-8000-000000000001', 'A calm consultation at Mila Rahman Smile Studio', '/previews/hero-image-2.webp', 1, true),
    (1641502, 'c051e71c-0000-4000-8000-000000000001', 'A private smile planning room', '/previews/hero-image-3.webp', 2, true),
    (1641503, 'c051e71c-0000-4000-8000-000000000001', 'A considered treatment planning space', '/previews/primary.webp', 3, true),
    (1641504, 'c051e71c-0000-4000-8000-000000000001', 'A welcoming studio detail', '/previews/preview-1.webp', 4, true),
    (1641591, 'c051e71c-0000-4000-8000-000000000001', 'Disabled general gallery sentinel', '/previews/preview-2.webp', 91, false),
    (1641592, 'c051e71c-0000-4000-8000-000000000001', '   ', '/previews/preview-2.webp', 92, true),
    (1641593, 'c051e71c-0000-4000-8000-000000000001', 'Unsafe general gallery sentinel', 'javascript:alert(1)', 93, true),
    (1641594, 'c051e71c-0000-4000-8000-000000000001', 'Missing general gallery sentinel', null, 94, true)
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
      1641801,
      'c051e71c-0000-4000-8000-000000000001',
      'Smile planning',
      1,
      true
    ),
    (
      1641802,
      'c051e71c-0000-4000-8000-000000000001',
      'Treatment guides',
      2,
      true
    ),
    (
      1641891,
      'c051e71c-0000-4000-8000-000000000001',
      'Disabled cosmetic articles',
      3,
      false
    ),
    (
      1641892,
      'c051e71c-0000-4000-8000-000000000001',
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
    (1641901, 1641801, 'What happens at a smile consultation', 'An owner-written guide to discussing goals, oral health, options, timing, and realistic expectations.', 'What happens at a smile consultation', 'How a smile consultation is planned.', '/previews/preview-1.webp', '2026-01-02 09:00:00+00', 1, 'cosmetic-smile-consultation', true, 0),
    (1641902, 1641801, 'Planning a natural-looking result', 'An owner-written explanation of proportion, shade, texture, and the value of a considered treatment plan.', 'Planning a natural-looking result', 'Principles behind natural-looking cosmetic dentistry.', '/previews/preview-2.webp', '2026-01-03 09:00:00+00', 2, 'cosmetic-natural-result', true, 0),
    (1641903, 1641801, 'Questions to ask before treatment', 'Useful questions owners recommend asking before deciding whether a cosmetic treatment is right for you.', 'Questions to ask before treatment', 'Questions for a cosmetic treatment conversation.', null, '2026-01-04 09:00:00+00', 3, 'cosmetic-treatment-questions', true, 0),
    (1641904, 1641801, 'Understanding your treatment timeline', 'A practical overview of appointments, review points, and aftercare when planning changes to your smile.', 'Understanding your treatment timeline', 'Planning appointments and review points.', null, '2026-01-05 09:00:00+00', 4, 'cosmetic-treatment-timeline', true, 0),
    (1641905, 1641802, 'A guide to composite bonding', 'An owner-written introduction to assessment, planning, maintenance, and realistic expectations for composite bonding.', 'A guide to composite bonding', 'Composite bonding planning and maintenance.', null, '2026-01-06 09:00:00+00', 1, 'cosmetic-composite-bonding-guide', true, 0),
    (1641906, 1641802, 'Caring for your smile after treatment', 'Practical owner-written advice about daily care, review appointments, and protecting a completed treatment.', 'Caring for your smile after treatment', 'Everyday care after cosmetic treatment.', null, '2026-01-07 09:00:00+00', 2, 'cosmetic-treatment-aftercare', true, 0),
    (1641991, 1641801, 'Disabled cosmetic article', 'This disabled article is a public eligibility sentinel.', 'Disabled cosmetic article', 'Disabled fixture.', null, '2026-01-08 09:00:00+00', 5, 'cosmetic-disabled-article', false, 0),
    (1641992, 1641801, '   ', 'This blank-title article is a public eligibility sentinel.', '', '', null, '2026-01-09 09:00:00+00', 6, 'cosmetic-blank-title', true, 0),
    (1641993, 1641801, 'Invalid cosmetic route', 'This invalid-route article is a public eligibility sentinel.', 'Invalid cosmetic route', 'Invalid route fixture.', null, '2026-01-10 09:00:00+00', 7, 'cosmetic/invalid-route', true, 0),
    (1641994, 1641891, 'Article in a disabled cosmetic group', 'This article proves disabled groups stay private.', 'Article in a disabled cosmetic group', 'Disabled group fixture.', null, '2026-01-11 09:00:00+00', 1, 'cosmetic-disabled-group', true, 0),
    (1641995, 1641892, 'Article in a blank cosmetic group', 'This article proves blank group names do not create inaccessible sections.', 'Article in a blank cosmetic group', 'Blank group fixture.', null, '2026-01-12 09:00:00+00', 1, 'cosmetic-blank-group', true, 0)
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
    created_at,
    rank,
    enabled
  )
  values
    (
      1641601,
      'c051e71c-0000-4000-8000-000000000001',
      'Aisha K.',
      'Mila listened carefully, set realistic expectations, and made every step of my smile plan easy to understand.',
      5,
      '/previews/hero-image-2.webp',
      'Google',
      '2026-01-02 09:00:00+00',
      1,
      true
    ),
    (
      1641602,
      'c051e71c-0000-4000-8000-000000000001',
      'James L.',
      'The result still feels like me. I appreciated the gentle pace and the time to consider every option.',
      5,
      '/previews/hero-image-3.webp',
      'Google',
      '2026-01-03 09:00:00+00',
      2,
      true
    ),
    (
      1641603,
      'c051e71c-0000-4000-8000-000000000001',
      'Leila S.',
      'Every option was explained clearly, and the final plan reflected the subtle result I wanted.',
      5,
      null,
      'Doctify',
      '2026-01-04 09:00:00+00',
      3,
      true
    ),
    (
      1641604,
      'c051e71c-0000-4000-8000-000000000001',
      'Thomas W.',
      'The consultation was calm, detailed, and never felt rushed or sales-led.',
      4,
      null,
      'Google',
      '2026-01-05 09:00:00+00',
      4,
      true
    ),
    (
      1641691,
      'c051e71c-0000-4000-8000-000000000001',
      'Hidden cosmetic reviewer',
      'This disabled review must not appear on the public profile.',
      5,
      null,
      'Google',
      '2026-01-06 09:00:00+00',
      5,
      false
    ),
    (
      1641692,
      'c051e71c-0000-4000-8000-000000000001',
      ' ',
      'This blank-name review must not appear on the public profile.',
      5,
      null,
      'Google',
      '2026-01-07 09:00:00+00',
      6,
      true
    ),
    (
      1641693,
      'c051e71c-0000-4000-8000-000000000001',
      'Null cosmetic content sentinel',
      null,
      5,
      null,
      'Google',
      null,
      7,
      true
    ),
    (
      1641694,
      'c051e71c-0000-4000-8000-000000000001',
      'Invalid cosmetic score sentinel',
      'This invalid-score review must not appear on the public profile.',
      6,
      null,
      'Google',
      '2026-01-08 09:00:00+00',
      8,
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
    created_at = excluded.created_at,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.external_review_pages (id, user_id, link)
  values (
    1641701,
    'c051e71c-0000-4000-8000-000000000001',
    'https://example.com/smiles-by-mila-dentistry/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values (
    'c051e71c-0000-4000-8000-000000000020',
    'c051e71c-0000-4000-8000-000000000002',
    'Planning and payment',
    1
  )
  on conflict (link_group_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    heading = excluded.heading,
    rank = excluded.rank;

  insert into public.links (link_id, title, link, is_active, rank, click_counter)
  values
    (
      'c051e71c-0000-4000-8000-000000000021',
      'Flexible payment options',
      'https://example.com/smiles-by-mila-dentistry/payment-options',
      true,
      1,
      0
    ),
    (
      'c051e71c-0000-4000-8000-000000000022',
      'Prepare for your consultation',
      'https://example.com/smiles-by-mila-dentistry/consultation-guide',
      true,
      2,
      0
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
      'c051e71c-0000-4000-8000-000000000023',
      'c051e71c-0000-4000-8000-000000000020',
      'c051e71c-0000-4000-8000-000000000021'
    ),
    (
      'c051e71c-0000-4000-8000-000000000024',
      'c051e71c-0000-4000-8000-000000000020',
      'c051e71c-0000-4000-8000-000000000022'
    )
  on conflict (dentistry_links_id) do update
  set
    link_group_id = excluded.link_group_id,
    link_id = excluded.link_id;
end;
$template_cosmetic_transformation_seed$;
