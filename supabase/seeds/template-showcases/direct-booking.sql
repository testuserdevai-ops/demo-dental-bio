-- Stable, fully populated Direct Booking template showcase. It reuses the
-- existing rich fixture as a content source while assigning independent IDs,
-- owner records, and presentation answers for this renderer.
do $template_direct_booking_seed$
begin
  if not exists (
    select 1 from public.users
    where id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'Direct Booking showcase requires the rich Pro seed';
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
    birthday = source.birthday,
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
  from public.users source
  where showcase.id = 'db010000-0000-4000-8000-000000000001'
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
    'db010000-0000-4000-8000-000000000001',
    'db010000-0000-4000-8000-000000000002',
    'Calm, modern dentistry with appointments that fit your day',
    'Choose a convenient appointment and arrive knowing what to expect. Dr Maya Patel combines preventive, restorative, and cosmetic care in one welcoming Marylebone practice.',
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
    'db010000-0000-4000-8000-000000000003',
    'Maya Patel Dental Studio',
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

  insert into public.general_galleries (
    id,
    user_id,
    title,
    image_url,
    rank,
    enabled
  )
  values (
    1611501,
    'db010000-0000-4000-8000-000000000001',
    'Maya Patel Dental Studio entrance',
    '/previews/hero-image-3.webp',
    1,
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
      1611601,
      'db010000-0000-4000-8000-000000000001',
      'Aisha K.',
      'Booking was simple, every step was explained, and the appointment felt calm from start to finish.',
      5,
      '/previews/hero-image-2.webp',
      'Google',
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
    1611701,
    'db010000-0000-4000-8000-000000000001',
    'https://example.com/maya-patel-dentistry/reviews'
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link;
end;
$template_direct_booking_seed$;
