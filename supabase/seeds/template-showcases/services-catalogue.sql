-- Stable, image-rich Services Catalogue showcase. Content stays in the same
-- builders and private source tables used by real profiles; the public
-- projection is synchronized by the existing database triggers.
do $template_services_catalogue_seed$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current,
    reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at,
    updated_at, is_sso_user, is_anonymous
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    '5e010000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'template-services-catalogue@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00', '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-services-catalogue","registered_domain":"dental.bio"}',
    '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', false, false
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = excluded.email_confirmed_at,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at,
      is_sso_user = excluded.is_sso_user,
      is_anonymous = excluded.is_anonymous;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at,
    created_at, updated_at
  )
  values (
    '5e010000-0000-4000-8000-000000000101',
    '5e010000-0000-4000-8000-000000000001',
    '5e010000-0000-4000-8000-000000000001',
    '{"sub":"5e010000-0000-4000-8000-000000000001","email":"template-services-catalogue@dentalbio.local"}',
    'email', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (provider_id, provider) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = excluded.updated_at;

  update public.users showcase
  set first_name = 'Elena',
      middle_name = null,
      last_name = 'Morgan',
      title = 'Dr',
      gdc_no = '301782',
      qualification = 'BDS, MFDS RCS',
      birthday = '1988-06-14',
      position = 'Restorative and Family Dentist',
      country = 'United Kingdom',
      subscription_status = 'PRO',
      "isVerified" = true,
      use_dental_brand = true,
      registered_domain = 'dental.bio',
      domain = null,
      domain_verified = false,
      profile_presentation_published = jsonb_build_object(
        'schemaVersion', 1,
        'templateId', 'services-catalogue',
        'themeId', 'warm-care',
        'layoutVariant', 'section-navigator',
        'answers', jsonb_build_object(
          'featuredTreatmentIds', jsonb_build_array(
            '5e010000-0000-4000-8000-000000000006',
            '5e010000-0000-4000-8000-000000000009',
            '5e010000-0000-4000-8000-00000000000a'
          ),
          'showFinancingBeforeTeam', true
        )
      ),
      profile_presentation_published_revision = 1,
      profile_presentation_published_at = '2026-01-01 00:00:00+00',
      profile_presentation_draft = null,
      profile_presentation_draft_revision = 0,
      profile_presentation_draft_updated_at = null
  where showcase.id = '5e010000-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id, dentistry_id, about_title, about_text, location_title, phone,
    contact_email, website, booking_link, booking_link_enabled
  )
  values (
    '5e010000-0000-4000-8000-000000000001',
    '5e010000-0000-4000-8000-000000000002',
    'Find the right dental care without the guesswork',
    'Explore preventive, restorative, and cosmetic options in plain language. Dr Elena Morgan and her team will help you compare the next steps, timings, and payment choices that fit your priorities.',
    'Visit Morgan Dental Care',
    '+441172555018',
    'care@morgandental.example',
    'https://example.com/morgan-dental-care',
    'https://example.com/morgan-dental-care/book',
    true
  )
  on conflict (user_id) do update
  set dentistry_id = excluded.dentistry_id,
      about_title = excluded.about_title,
      about_text = excluded.about_text,
      location_title = excluded.location_title,
      phone = excluded.phone,
      contact_email = excluded.contact_email,
      website = excluded.website,
      booking_link = excluded.booking_link,
      booking_link_enabled = excluded.booking_link_enabled;

  insert into public.locations (
    location_id, business_name, full_address, country, city, area, latitude,
    longitude
  )
  values (
    '5e010000-0000-4000-8000-000000000003',
    'Morgan Dental Care',
    '42 Whiteladies Road, Clifton, Bristol BS8 2NH',
    'United Kingdom', 'Bristol', 'Clifton', 51.4608, -2.6124
  )
  on conflict (location_id) do update
  set business_name = excluded.business_name,
      full_address = excluded.full_address,
      country = excluded.country,
      city = excluded.city,
      area = excluded.area,
      latitude = excluded.latitude,
      longitude = excluded.longitude;

  insert into public.dentistry_locations (
    dentistry_location_id, dentistry_id, location_id
  )
  values (
    '5e010000-0000-4000-8000-000000000004',
    '5e010000-0000-4000-8000-000000000002',
    '5e010000-0000-4000-8000-000000000003'
  )
  on conflict (dentistry_location_id) do update
  set dentistry_id = excluded.dentistry_id,
      location_id = excluded.location_id;

  insert into public.socials (
    dentistry_socials_id, dentistry_id, linkedin_link, twitter_link,
    instagram_link, facebook_link, tiktok_link, other_link
  )
  values (
    '5e010000-0000-4000-8000-000000000005',
    '5e010000-0000-4000-8000-000000000002',
    'https://linkedin.com/in/elena-morgan-dentist', null,
    'https://instagram.com/morgandentalcare',
    'https://facebook.com/morgandentalcare', null, null
  )
  on conflict (dentistry_id) do update
  set linkedin_link = excluded.linkedin_link,
      twitter_link = excluded.twitter_link,
      instagram_link = excluded.instagram_link,
      facebook_link = excluded.facebook_link,
      tiktok_link = excluded.tiktok_link,
      other_link = excluded.other_link;

  insert into public.treatments (treatment_id, title, description, "isService")
  values
    (
      '5e010000-0000-4000-8000-000000000006', 'Dental implants',
      'Replace a missing tooth with a carefully planned, natural-looking restoration and a clear staged treatment plan.', false
    ),
    (
      '5e010000-0000-4000-8000-000000000007', 'Composite bonding',
      'Refine shape, symmetry, and small gaps with a minimally invasive tooth-coloured material.', false
    ),
    (
      '5e010000-0000-4000-8000-000000000008', 'Invisalign aligners',
      'A discreet orthodontic option with digital planning and regular progress reviews.', false
    ),
    (
      '5e010000-0000-4000-8000-000000000009', 'New patient assessment',
      'A thorough first visit with digital imaging, gum screening, and an understandable care roadmap.', true
    ),
    (
      '5e010000-0000-4000-8000-00000000000a', 'Dental hygiene care',
      'Personalised gum care, prevention coaching, and airflow polishing when appropriate.', true
    ),
    (
      '5e010000-0000-4000-8000-00000000000b', 'Emergency appointment',
      'Prompt assessment for dental pain, swelling, broken teeth, or a lost restoration.', true
    )
  on conflict (treatment_id) do update
  set title = excluded.title,
      description = excluded.description,
      "isService" = excluded."isService";

  insert into public.dentistry_treatments (
    dentistry_treatment_id, dentistry_id, treatment_id, rank
  )
  values
    ('5e010000-0000-4000-8000-000000000010', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-000000000006', 1),
    ('5e010000-0000-4000-8000-000000000011', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-000000000007', 4),
    ('5e010000-0000-4000-8000-000000000012', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-000000000008', 5),
    ('5e010000-0000-4000-8000-000000000013', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-000000000009', 2),
    ('5e010000-0000-4000-8000-000000000014', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-00000000000a', 3),
    ('5e010000-0000-4000-8000-000000000015', '5e010000-0000-4000-8000-000000000002', '5e010000-0000-4000-8000-00000000000b', 6)
  on conflict (dentistry_treatment_id) do update
  set dentistry_id = excluded.dentistry_id,
      treatment_id = excluded.treatment_id,
      rank = excluded.rank;

  insert into public.general_galleries (id, user_id, title, image_url, rank, enabled)
  values
    (1711501, '5e010000-0000-4000-8000-000000000001', 'A calm Morgan Dental Care treatment room', '/previews/hero-image-2.webp', 1, true),
    (1711502, '5e010000-0000-4000-8000-000000000001', 'Morgan Dental Care reception', '/previews/hero-image-3.webp', 2, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
      title = excluded.title,
      image_url = excluded.image_url,
      rank = excluded.rank,
      enabled = excluded.enabled;

  insert into public.reviews (
    id, user_id, reviewer_name, content, stars, image_url, platform, rank,
    enabled
  )
  values
    (1711601, '5e010000-0000-4000-8000-000000000001', 'Nadia R.', 'I could compare the options without feeling rushed. The whole plan, including costs, was explained clearly.', 5, '/previews/hero-image-1.webp', 'Google', 1, true),
    (1711602, '5e010000-0000-4000-8000-000000000001', 'Tom B.', 'The team made a complicated treatment feel manageable and kept me informed at every visit.', 5, '/previews/hero-image-2.webp', 'Google', 2, true),
    (1711603, '5e010000-0000-4000-8000-000000000001', 'Priya S.', 'Friendly prevention advice and a simple booking process. I knew exactly what the next step was.', 5, '/previews/hero-image-3.webp', 'Google', 3, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
      reviewer_name = excluded.reviewer_name,
      content = excluded.content,
      stars = excluded.stars,
      image_url = excluded.image_url,
      platform = excluded.platform,
      rank = excluded.rank,
      enabled = excluded.enabled;

  insert into public.external_review_pages (id, user_id, link)
  values (1711701, '5e010000-0000-4000-8000-000000000001', 'https://example.com/morgan-dental-care/reviews')
  on conflict (id) do update
  set user_id = excluded.user_id,
      link = excluded.link;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values (
    '5e010000-0000-4000-8000-000000000020',
    '5e010000-0000-4000-8000-000000000002',
    'Patient guides, finance, and our team', 1
  )
  on conflict (link_group_id) do update
  set dentistry_id = excluded.dentistry_id,
      heading = excluded.heading,
      rank = excluded.rank;

  insert into public.links (
    link_id, title, link, is_active, rank, click_counter, image_url,
    image_variant, image_alt, image_decorative, is_featured
  )
  values
    (
      '5e010000-0000-4000-8000-000000000021',
      'Finance and payment guide',
      'https://example.com/morgan-dental-care/finance', true, 1, 0,
      'http://127.0.0.1:54321/storage/v1/object/public/link-images/5e010000-0000-4000-8000-000000000001/services-catalogue-finance.webp',
      'large-image', null, true, true
    ),
    (
      '5e010000-0000-4000-8000-000000000022',
      'Meet the clinical team',
      'https://example.com/morgan-dental-care/team', true, 2, 0,
      'http://127.0.0.1:54321/storage/v1/object/public/profile-pics/5e010000-0000-4000-8000-000000000002/services-catalogue-profile-v2.webp',
      'small-icon', 'Portrait of Dr Elena Morgan', false, false
    ),
    (
      '5e010000-0000-4000-8000-000000000023',
      'Frequently asked questions',
      'https://example.com/morgan-dental-care/questions', true, 3, 0,
      null, 'none', null, true, false
    )
  on conflict (link_id) do update
  set title = excluded.title,
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
    dentistry_links_id, link_group_id, link_id
  )
  values
    ('5e010000-0000-4000-8000-000000000024', '5e010000-0000-4000-8000-000000000020', '5e010000-0000-4000-8000-000000000021'),
    ('5e010000-0000-4000-8000-000000000025', '5e010000-0000-4000-8000-000000000020', '5e010000-0000-4000-8000-000000000022'),
    ('5e010000-0000-4000-8000-000000000026', '5e010000-0000-4000-8000-000000000020', '5e010000-0000-4000-8000-000000000023')
  on conflict (dentistry_links_id) do update
  set link_group_id = excluded.link_group_id,
      link_id = excluded.link_id;
end;
$template_services_catalogue_seed$;
