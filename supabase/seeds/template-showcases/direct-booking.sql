-- Stable, fully populated Direct Booking template showcase. It reuses the
-- existing rich fixture as a content source while assigning independent IDs,
-- owner records, and presentation answers for this renderer.
do $template_direct_booking_seed$
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
    'db010000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'template-direct-booking@dentalbio.local',
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
    '{"username":"template-direct-booking","registered_domain":"dental.bio"}',
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
    'db010000-0000-4000-8000-000000000101',
    'db010000-0000-4000-8000-000000000001',
    'db010000-0000-4000-8000-000000000001',
    '{"sub":"db010000-0000-4000-8000-000000000001","email":"template-direct-booking@dentalbio.local"}',
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
    last_name = 'Patel',
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
      'templateId', 'direct-booking',
      'themeId', 'modern-specialist',
      'layoutVariant', 'classic-stack',
      'answers', jsonb_build_object(
        'primaryAction', 'booking',
        'secondaryAction', 'website',
        'featuredTreatmentIds', jsonb_build_array(
          'db010000-0000-4000-8000-000000000007',
          'db010000-0000-4000-8000-000000000006',
          'db010000-0000-4000-8000-000000000008'
        )
      )
    ),
    profile_presentation_published_revision = 1,
    profile_presentation_published_at = '2026-01-01 00:00:00+00',
    profile_presentation_draft = null,
    profile_presentation_draft_revision = 0,
    profile_presentation_draft_updated_at = null
  where showcase.id = 'db010000-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id,
    dentistry_id,
    about_title,
    about_text,
    treatment_section_title,
    service_section_title,
    location_title,
    phone,
    contact_email,
    website,
    booking_link,
    booking_link_enabled
  )
  values (
    'db010000-0000-4000-8000-000000000001',
    'db010000-0000-4000-8000-000000000002',
    'Calm, modern dentistry with appointments that fit your day',
    'Choose a convenient appointment and arrive knowing what to expect. Dr Maya Patel combines preventive, restorative, and cosmetic care in one welcoming Marylebone practice.',
    'Treatments chosen for you',
    'Appointment services',
    'Your appointment in Marylebone',
    '+442079460123',
    'appointments@mayapatel.example',
    'https://example.com/maya-patel-dentistry',
    'https://example.com/maya-patel-dentistry/book',
    true
  )
  on conflict (user_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    about_title = excluded.about_title,
    about_text = excluded.about_text,
    treatment_section_title = excluded.treatment_section_title,
    service_section_title = excluded.service_section_title,
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
    longitude,
    image_url,
    image_alt,
    image_decorative
  )
  values (
    'db010000-0000-4000-8000-000000000003',
    'Maya Patel Dental Studio',
    '18 Harley Street, Marylebone, London W1G 9QH',
    'United Kingdom',
    'London',
    'Marylebone',
    51.5186,
    -0.1472,
    'http://127.0.0.1:54321/storage/v1/object/public/location-images/db010000-0000-4000-8000-000000000001/dentistries/db010000-0000-4000-8000-000000000002/locations/db010000-0000-4000-8000-000000000003/marylebone-studio.webp',
    'Reception at Maya Patel Dental Studio in Marylebone',
    false
  )
  on conflict (location_id) do update
  set
    business_name = excluded.business_name,
    full_address = excluded.full_address,
    country = excluded.country,
    city = excluded.city,
    area = excluded.area,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    image_url = excluded.image_url,
    image_alt = excluded.image_alt,
    image_decorative = excluded.image_decorative;

  insert into public.dentistry_locations (
    dentistry_location_id,
    dentistry_id,
    location_id
  )
  values (
    'db010000-0000-4000-8000-000000000004',
    'db010000-0000-4000-8000-000000000002',
    'db010000-0000-4000-8000-000000000003'
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
    'db010000-0000-4000-8000-000000000005',
    'db010000-0000-4000-8000-000000000002',
    'https://linkedin.com/in/maya-patel-dentist',
    null,
    'https://instagram.com/mayapateldentistry',
    'https://facebook.com/mayapateldentistry',
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
      'db010000-0000-4000-8000-000000000006',
      'Smile restoration',
      'Natural-looking composite bonding and restorative options planned around your goals.',
      false
    ),
    (
      'db010000-0000-4000-8000-000000000007',
      'New patient exam',
      'A relaxed first visit with digital assessment, clear options, and time for your questions.',
      false
    ),
    (
      'db010000-0000-4000-8000-000000000008',
      'Professional whitening',
      'Dentist-supervised whitening with a plan designed for a comfortable, natural result.',
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
      'db010000-0000-4000-8000-000000000010',
      'db010000-0000-4000-8000-000000000002',
      'db010000-0000-4000-8000-000000000006',
      2
    ),
    (
      'db010000-0000-4000-8000-000000000011',
      'db010000-0000-4000-8000-000000000002',
      'db010000-0000-4000-8000-000000000007',
      1
    ),
    (
      'db010000-0000-4000-8000-000000000012',
      'db010000-0000-4000-8000-000000000002',
      'db010000-0000-4000-8000-000000000008',
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
    (1611401, 'db010000-0000-4000-8000-000000000001', 'Composite appointment result', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 1, true, 'Before appointment', 'After appointment'),
    (1611402, 'db010000-0000-4000-8000-000000000001', 'Whitening appointment result', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 2, true, 'Before whitening', 'After whitening'),
    (1611403, 'db010000-0000-4000-8000-000000000001', 'Restorative care result', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-whitening-after.webp', 3, true, 'Starting smile', 'Reviewed result'),
    (1611404, 'db010000-0000-4000-8000-000000000001', 'Everyday confidence result', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-bonding-after.webp', 4, true, 'Before care', 'After care'),
    (1611491, 'db010000-0000-4000-8000-000000000001', 'Hidden booking result', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 5, false, 'Before', 'After'),
    (1611492, 'db010000-0000-4000-8000-000000000001', ' ', 'javascript:alert(1)', '/previews/cosmetic-case-bonding-after.webp', 6, true, 'Before', 'After')
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
    (1611501, 'db010000-0000-4000-8000-000000000001', 'Maya Patel Dental Studio entrance', '/previews/hero-image-3.webp', 1, true),
    (1611502, 'db010000-0000-4000-8000-000000000001', 'Calm appointment room', '/previews/hero-image-1.webp', 2, true),
    (1611503, 'db010000-0000-4000-8000-000000000001', 'Welcoming care team', '/previews/hero-image-2.webp', 3, true),
    (1611504, 'db010000-0000-4000-8000-000000000001', 'Comfort-focused treatment space', '/previews/primary.webp', 4, true),
    (1611505, 'db010000-0000-4000-8000-000000000001', 'Appointment care collection', '/previews/template-clinic-commerce.webp', 5, true),
    (1611591, 'db010000-0000-4000-8000-000000000001', 'Hidden booking image', '/previews/hero-image-1.webp', 6, false),
    (1611592, 'db010000-0000-4000-8000-000000000001', ' ', '/previews/hero-image-2.webp', 7, true),
    (1611593, 'db010000-0000-4000-8000-000000000001', 'Unsafe booking image', 'file:///private/booking.webp', 8, true)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    title = excluded.title,
    image_url = excluded.image_url,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values
    (1611801, 'db010000-0000-4000-8000-000000000001', 'Before your appointment', 1, true),
    (1611802, 'db010000-0000-4000-8000-000000000001', 'After your visit', 2, true),
    (1611891, 'db010000-0000-4000-8000-000000000001', 'Draft booking guides', 3, false),
    (1611892, 'db010000-0000-4000-8000-000000000001', '   ', 4, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
      name = excluded.name,
      rank = excluded.rank,
      enabled = excluded.enabled;

  insert into public.blogs (
    id, group_id, title, content, meta_title, meta_description, image_url,
    created_at, rank, slug, enabled, click_counter
  )
  values
    (1611901, 1611801, 'What to expect at your first appointment', 'A practical guide to the first visit, from sharing your priorities to agreeing on clear next steps.', 'What to expect at your first appointment', 'A clear first-appointment guide.', '/previews/preview-1.webp', '2026-01-02 09:00:00+00', 1, 'what-to-expect-at-your-first-appointment', true, 0),
    (1611902, 1611801, 'Questions worth bringing with you', 'Writing down questions can make it easier to compare choices and leave with a plan you understand.', 'Questions worth bringing with you', 'Useful questions for a dental appointment.', null, '2026-01-03 09:00:00+00', 2, 'questions-worth-bringing-with-you', true, 0),
    (1611903, 1611801, 'How to prepare for a comfortable visit', 'Simple preparation can help appointments feel calmer, more predictable, and easier to fit around your day.', 'How to prepare for a comfortable visit', 'Preparing for a comfortable dental visit.', '/previews/preview-2.webp', '2026-01-04 09:00:00+00', 3, 'how-to-prepare-for-a-comfortable-visit', true, 0),
    (1611904, 1611801, 'Understanding your appointment timeline', 'A straightforward overview of assessment, planning, treatment, and review appointments.', 'Understanding your appointment timeline', 'A guide to appointment stages.', null, '2026-01-05 09:00:00+00', 4, 'understanding-your-appointment-timeline', true, 0),
    (1611905, 1611802, 'Caring for your smile after treatment', 'Practical advice about daily care, review appointments, and protecting completed treatment.', 'Caring for your smile after treatment', 'Everyday care after dental treatment.', null, '2026-01-06 09:00:00+00', 1, 'caring-for-your-smile-after-treatment', true, 0),
    (1611906, 1611802, 'When to contact the practice after a visit', 'Learn which changes are expected and when the practice would like you to get in touch for advice.', 'When to contact the practice after a visit', 'When to seek advice after an appointment.', null, '2026-01-07 09:00:00+00', 2, 'when-to-contact-the-practice-after-a-visit', true, 0),
    (1611991, 1611802, 'Unpublished booking draft', 'This disabled article is a public eligibility sentinel.', 'Unpublished booking draft', 'Disabled fixture.', null, '2026-01-08 09:00:00+00', 3, 'unpublished-booking-draft', false, 0),
    (1611992, 1611801, '   ', 'This blank-title article is a public eligibility sentinel.', '', '', null, '2026-01-09 09:00:00+00', 5, 'booking-blank-title', true, 0),
    (1611993, 1611801, 'Invalid booking route', 'This invalid-route article is a public eligibility sentinel.', 'Invalid booking route', 'Invalid route fixture.', null, '2026-01-10 09:00:00+00', 6, 'booking/invalid-route', true, 0),
    (1611994, 1611891, 'Article in a disabled booking group', 'This enabled article belongs to a disabled group.', 'Article in a disabled booking group', 'Disabled group fixture.', null, '2026-01-11 09:00:00+00', 1, 'booking-disabled-group', true, 0),
    (1611995, 1611892, 'Article in a blank booking group', 'This article proves blank group names stay hidden.', 'Article in a blank booking group', 'Blank group fixture.', null, '2026-01-12 09:00:00+00', 1, 'booking-blank-group', true, 0)
  on conflict (id) do update
  set group_id = excluded.group_id,
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
      1611601,
      'db010000-0000-4000-8000-000000000001',
      'Aisha K.',
      'Booking was simple, every step was explained, and the appointment felt calm from start to finish.',
      5,
      '/previews/hero-image-2.webp',
      'Google',
      '2026-01-02 09:00:00+00',
      1,
      true
    ),
    (
      1611602,
      'db010000-0000-4000-8000-000000000001',
      'James L.',
      'A thoughtful and efficient visit with clear advice and a treatment plan I could understand.',
      5,
      '/previews/hero-image-3.webp',
      'Google',
      '2026-01-03 09:00:00+00',
      2,
      true
    ),
    (1611603, 'db010000-0000-4000-8000-000000000001', 'Priya N.', 'The booking team answered every question and made the next step easy to understand.', 5, null, 'Doctify', '2026-01-04 09:00:00+00', 3, true),
    (1611604, 'db010000-0000-4000-8000-000000000001', 'Marcus T.', 'A calm appointment with balanced advice and a clear plan for follow-up.', 4, null, 'Google', '2026-01-05 09:00:00+00', 4, true),
    (1611691, 'db010000-0000-4000-8000-000000000001', 'Hidden reviewer', 'This disabled review must stay private.', 5, null, 'Google', '2026-01-06 09:00:00+00', 5, false),
    (1611692, 'db010000-0000-4000-8000-000000000001', ' ', 'This blank-name sentinel must stay private.', 5, null, 'Google', '2026-01-07 09:00:00+00', 6, true),
    (1611693, 'db010000-0000-4000-8000-000000000001', 'Null content sentinel', null, 5, null, 'Google', null, 7, true),
    (1611694, 'db010000-0000-4000-8000-000000000001', 'Invalid score sentinel', 'This invalid-score sentinel must stay private.', 6, null, 'Google', '2026-01-08 09:00:00+00', 8, true)
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

  insert into public.external_review_pages (id, user_id, link, rank, enabled)
  values
  (1611701, 'db010000-0000-4000-8000-000000000001', 'https://example.com/maya-patel-dentistry/reviews', 1, true),
  (1611702, 'db010000-0000-4000-8000-000000000001', 'https://reviews.example.com/maya-patel-dentistry', 2, true)
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link,
    rank = excluded.rank,
    enabled = excluded.enabled;
end;
$template_direct_booking_seed$;
