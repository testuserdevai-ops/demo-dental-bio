-- Stable, fully populated Basic template showcase. The fixed data below is
-- deliberately self-contained so this fixture can be applied without the
-- local-only Pro account while preserving its existing IDs and content.
do $template_basic_seed$
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
    first_name = 'Amelia',
    middle_name = 'Rose',
    last_name = 'Hart',
    title = 'Dr',
    gdc_no = '123456',
    qualification = 'BDS, MSc',
    birthday = '1988-06-14',
    position = 'Cosmetic Dentist',
    country = 'United Kingdom',
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
  where showcase.id = 'ba510000-0000-4000-8000-000000000001';

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
    'ba510000-0000-4000-8000-000000000001',
    'ba510000-0000-4000-8000-000000000002',
    'Complete care for confident smiles',
    'I provide calm, evidence-led dental care with a focus on prevention, natural-looking restorative treatment, and confident smiles. Every appointment starts with clear options and a plan tailored to the person behind the smile.',
    'Visit us in Marylebone',
    '+442000000000',
    'template-basic@example.com',
    'https://example.com/dentalbio-demo',
    'https://example.com/dentalbio-demo/book',
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
    'ba510000-0000-4000-8000-000000000003',
    'Basic Template Dental Studio',
    '12 Demo Street, Marylebone, London W1U 1AA',
    'United Kingdom',
    'London',
    'Marylebone',
    51.5202,
    -0.1549
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
  values (
    'ba510000-0000-4000-8000-000000000005',
    'ba510000-0000-4000-8000-000000000002',
    'https://www.linkedin.com/in/dentalbio-demo',
    'https://x.com/dentalbio_demo',
    'https://www.instagram.com/dentalbio.demo/',
    'https://www.facebook.com/dentalbio-demo/',
    'https://www.tiktok.com/@dentalbio.demo',
    'https://example.com/dentalbio-demo'
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
      'ba510000-0000-4000-8000-000000000006',
      'Teeth whitening',
      'A dentist-supervised whitening plan designed to brighten your smile safely and predictably.',
      false
    ),
    (
      'ba510000-0000-4000-8000-000000000007',
      'Invisalign consultation',
      'A detailed smile and bite assessment to explore discreet clear-aligner treatment options.',
      false
    ),
    (
      'ba510000-0000-4000-8000-000000000008',
      'Virtual smile consultation',
      'A convenient online conversation about your goals, suitable options, likely timing, and next steps.',
      true
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
      'ba510000-0000-4000-8000-000000000010',
      'ba510000-0000-4000-8000-000000000002',
      'ba510000-0000-4000-8000-000000000006',
      1
    ),
    (
      'ba510000-0000-4000-8000-000000000011',
      'ba510000-0000-4000-8000-000000000002',
      'ba510000-0000-4000-8000-000000000007',
      2
    ),
    (
      'ba510000-0000-4000-8000-000000000012',
      'ba510000-0000-4000-8000-000000000002',
      'ba510000-0000-4000-8000-000000000008',
      3
    )
  on conflict (dentistry_treatment_id) do update
  set
    dentistry_id = excluded.dentistry_id,
    treatment_id = excluded.treatment_id,
    rank = excluded.rank;

  insert into public.groups (id, user_id, name, rank, enabled, type)
  values
    (1511101, 'ba510000-0000-4000-8000-000000000001', 'Patient guides', 1, true, 'videos'),
    (1511102, 'ba510000-0000-4000-8000-000000000001', 'Smile care essentials', 2, true, 'products')
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    name = excluded.name,
    rank = excluded.rank,
    enabled = excluded.enabled,
    type = excluded.type;

  insert into public.videos (id, group_id, title, link, rank, enabled)
  values
    (1511201, 1511101, 'What to expect at your first visit', 'https://www.youtube.com/watch?v=M1HinlfYA04', 1, true),
    (1511202, 1511101, 'Building a healthy daily routine', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 2, true)
  on conflict (id) do update
  set
    group_id = excluded.group_id,
    title = excluded.title,
    link = excluded.link,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values (
    1511801,
    'ba510000-0000-4000-8000-000000000001',
    'Smile care journal',
    1,
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
      1511901,
      1511801,
      'How to prepare for your first dental visit',
      'Your first visit should feel straightforward. Bring any questions, tell us about previous treatment, and share what you would most like to improve. We will listen first, explain each option clearly, and help you choose a comfortable next step.',
      'How to prepare for your first dental visit',
      'A calm, practical guide to making your first appointment feel easy and informed.',
      '/previews/preview-1.webp',
      '2026-01-02 09:00:00',
      1,
      'template-basic-prepare-for-your-first-dental-visit',
      true,
      0
    ),
    (
      1511902,
      1511801,
      'A simple routine for a healthy smile',
      'Small daily habits make the biggest difference over time. Brush carefully twice a day, clean between your teeth, and arrange regular check-ups so we can spot changes early. Consistency is kinder to your smile than quick fixes.',
      'A simple routine for a healthy smile',
      'Everyday habits that support a comfortable, healthy smile between appointments.',
      '/previews/preview-2.webp',
      '2026-01-09 09:00:00',
      2,
      'template-basic-simple-routine-for-a-healthy-smile',
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
  values
    (
      1511301,
      1511102,
      'Everyday dental care kit',
      'https://example.com/dentalbio-demo/shop/daily-care-kit',
      'Demo shop',
      '/previews/preview-1.webp',
      12.99,
      'GBP(£)',
      1,
      true,
      'ba510000-0000-4000-8000-000000000001'
    ),
    (
      1511302,
      1511102,
      'Whitening maintenance kit',
      'https://example.com/dentalbio-demo/shop/whitening-care-kit',
      'Demo shop',
      '/previews/preview-2.webp',
      24.99,
      'GBP(£)',
      2,
      true,
      'ba510000-0000-4000-8000-000000000001'
    )
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
  values (
    1511401,
    'ba510000-0000-4000-8000-000000000001',
    'Smile transformation',
    '/previews/hero-image-1.webp',
    '/previews/hero-image-2.webp',
    1,
    true,
    'Before treatment',
    'After treatment'
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
    (1511501, 'ba510000-0000-4000-8000-000000000001', 'A welcoming clinical space', '/previews/hero-image-3.webp', 1, true),
    (1511502, 'ba510000-0000-4000-8000-000000000001', 'Personalised smile planning', '/previews/primary.webp', 2, true)
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
    created_at,
    rank,
    enabled
  )
  values
    (
      1511601,
      'ba510000-0000-4000-8000-000000000001',
      'Sophie M.',
      'Everything was explained clearly and I felt comfortable throughout my appointment. The result looks completely natural.',
      5,
      '/profile.webp',
      'Google',
      '2026-01-02 09:00:00+00',
      1,
      true
    ),
    (
      1511602,
      'ba510000-0000-4000-8000-000000000001',
      'Daniel R.',
      'A friendly, thoughtful experience from the first consultation onward. I always knew what the next step would be.',
      5,
      '/placeholder.webp',
      'Google',
      '2026-01-03 09:00:00+00',
      2,
      true
    ),
    (
      1511603,
      'ba510000-0000-4000-8000-000000000001',
      'Priya N.',
      'The appointment felt unhurried, my questions were answered directly, and the aftercare plan was easy to follow.',
      5,
      null,
      'Doctify',
      '2026-01-04 09:00:00+00',
      3,
      true
    ),
    (
      1511604,
      'ba510000-0000-4000-8000-000000000001',
      'Marcus T.',
      'I appreciated the balanced advice and the clear explanation of what could wait and what needed attention now.',
      4,
      null,
      'Google',
      '2026-01-05 09:00:00+00',
      4,
      true
    ),
    (
      1511691,
      'ba510000-0000-4000-8000-000000000001',
      'Hidden reviewer',
      'This disabled review must not appear on the public profile.',
      5,
      null,
      'Google',
      '2026-01-06 09:00:00+00',
      5,
      false
    ),
    (
      1511692,
      'ba510000-0000-4000-8000-000000000001',
      ' ',
      'This blank-name sentinel must not appear on the public profile.',
      5,
      null,
      'Google',
      '2026-01-07 09:00:00+00',
      6,
      true
    ),
    (
      1511693,
      'ba510000-0000-4000-8000-000000000001',
      'Null content sentinel',
      null,
      5,
      null,
      'Google',
      null,
      7,
      true
    ),
    (
      1511694,
      'ba510000-0000-4000-8000-000000000001',
      'Invalid score sentinel',
      'This invalid-score sentinel must not appear on the public profile.',
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

  insert into public.external_review_pages (id, user_id, link, rank, enabled)
  values
    (
      1511701,
      'ba510000-0000-4000-8000-000000000001',
      'https://example.com/dentalbio-demo/reviews',
      1,
      true
    ),
    (
      1511702,
      'ba510000-0000-4000-8000-000000000001',
      'https://reviews.example.net/dentalbio-demo',
      2,
      true
    ),
    (
      1511703,
      'ba510000-0000-4000-8000-000000000001',
      'https://feedback.example.org/dentalbio-demo',
      3,
      true
    ),
    (
      1511704,
      'ba510000-0000-4000-8000-000000000001',
      'https://community.example.com/dentalbio-demo/reviews',
      4,
      true
    ),
    (
      1511791,
      'ba510000-0000-4000-8000-000000000001',
      'https://hidden.example.com/dentalbio-demo/reviews',
      5,
      false
    )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    link = excluded.link,
    rank = excluded.rank,
    enabled = excluded.enabled;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values (
    'ba510000-0000-4000-8000-000000000020',
    'ba510000-0000-4000-8000-000000000002',
    'Helpful resources',
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
      'ba510000-0000-4000-8000-000000000021',
      'Book a consultation',
      'https://example.com/dentalbio-demo/book',
      true,
      1,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/profile-pics/ba510000-0000-4000-8000-000000000002/basic-profile.webp',
      'small-icon',
      'Portrait of the clinician',
      false,
      true
    ),
    (
      'ba510000-0000-4000-8000-000000000022',
      'New patient information',
      'https://example.com/dentalbio-demo/new-patients',
      true,
      2,
      0,
      'http://127.0.0.1:54321/storage/v1/object/public/profile-pics/ba510000-0000-4000-8000-000000000002/basic-profile.webp',
      'large-image',
      null,
      true,
      true
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
