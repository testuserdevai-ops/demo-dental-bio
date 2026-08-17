-- Stable, fictional Clinic and Commerce showcase. Content is written to the
-- same private source tables used by the dashboard; projection triggers publish
-- only the approved profile fields.
do $template_clinic_commerce_seed$
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
    'c11c0000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'template-clinic-commerce@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00', '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-clinic-commerce","registered_domain":"dental.bio"}',
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
    'c11c0000-0000-4000-8000-000000000101',
    'c11c0000-0000-4000-8000-000000000001',
    'c11c0000-0000-4000-8000-000000000001',
    '{"sub":"c11c0000-0000-4000-8000-000000000001","email":"template-clinic-commerce@dentalbio.local"}',
    'email', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (provider_id, provider) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = excluded.updated_at;

  update public.users showcase
  set first_name = 'Clara',
      middle_name = null,
      last_name = 'Bennett',
      title = 'Dr',
      gdc_no = '274630',
      qualification = 'BDS, PgCert Rest Dent',
      birthday = '1988-06-14',
      position = 'General and Restorative Dentist',
      country = 'United Kingdom',
      subscription_status = 'PRO',
      "isVerified" = true,
      use_dental_brand = true,
      registered_domain = 'dental.bio',
      domain = null,
      domain_verified = false,
      profile_presentation_published = jsonb_build_object(
        'schemaVersion', 1,
        'templateId', 'clinic-commerce',
        'themeId', 'editorial-expert',
        'layoutVariant', 'classic-stack',
        'answers', jsonb_build_object(
          'defaultAudience', 'shop',
          'featuredProductId', '1984101'
        )
      ),
      profile_presentation_published_revision = 1,
      profile_presentation_published_at = '2026-01-01 00:00:00+00',
      profile_presentation_draft = null,
      profile_presentation_draft_revision = 0,
      profile_presentation_draft_updated_at = null
  where showcase.id = 'c11c0000-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id, dentistry_id, about_title, about_text, location_title, phone,
    contact_email, website, booking_link, booking_link_enabled
  )
  values (
    'c11c0000-0000-4000-8000-000000000001',
    'c11c0000-0000-4000-8000-000000000002',
    'Professional care, in clinic and at home',
    'Book evidence-led dental care with Dr Clara Bennett, then browse a small collection of practical products selected to support everyday oral health between appointments.',
    'Visit Bennett Dental Studio',
    '+442079460882',
    'hello@bennettdental.example',
    'https://example.com/bennett-dental',
    'https://example.com/bennett-dental/book',
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

  insert into public.socials (
    dentistry_socials_id, dentistry_id, linkedin_link, twitter_link,
    instagram_link, facebook_link, tiktok_link, other_link
  )
  values (
    'c11c0000-0000-4000-8000-000000000005',
    'c11c0000-0000-4000-8000-000000000002',
    null, null, 'https://instagram.com/bennettdentalstudio',
    'https://facebook.com/bennettdentalstudio', null, null
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
    ('c11c0000-0000-4000-8000-000000000006', 'New patient consultation', 'A thorough assessment, digital imaging when appropriate, and a clear plan explained without pressure.', true),
    ('c11c0000-0000-4000-8000-000000000007', 'Restorative dentistry', 'Carefully planned repair and replacement options designed around long-term comfort and function.', false),
    ('c11c0000-0000-4000-8000-000000000008', 'Preventive hygiene care', 'Personalised gum care and realistic coaching for a routine you can maintain at home.', true)
  on conflict (treatment_id) do update
  set title = excluded.title,
      description = excluded.description,
      "isService" = excluded."isService";

  insert into public.dentistry_treatments (
    dentistry_treatment_id, dentistry_id, treatment_id, rank
  )
  values
    ('c11c0000-0000-4000-8000-000000000010', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000006', 1),
    ('c11c0000-0000-4000-8000-000000000011', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000007', 2),
    ('c11c0000-0000-4000-8000-000000000012', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000008', 3)
  on conflict (dentistry_treatment_id) do update
  set dentistry_id = excluded.dentistry_id,
      treatment_id = excluded.treatment_id,
      rank = excluded.rank;

  insert into public.products (
    id, user_id, name, link, platform, image_url, price, currency, rank, enabled
  )
  values
    (1984101, 'c11c0000-0000-4000-8000-000000000001', 'Electric brush travel set', 'https://example.com/bennett-dental/shop/electric-travel-set', 'Bennett Dental edit', 'http://127.0.0.1:54321/storage/v1/object/public/product-images/c11c0000-0000-4000-8000-000000000001/products/electric-travel-set.webp', 64.00, 'GBP', 1, true),
    (1984102, 'c11c0000-0000-4000-8000-000000000001', 'Sensitive care kit', 'https://example.com/bennett-dental/shop/sensitive-care-kit', 'Bennett Dental edit', 'http://127.0.0.1:54321/storage/v1/object/public/product-images/c11c0000-0000-4000-8000-000000000001/products/sensitive-care-kit.webp', 18.00, 'GBP', 2, true),
    (1984103, 'c11c0000-0000-4000-8000-000000000001', 'Everyday travel pouch', 'https://example.com/bennett-dental/shop/everyday-travel-pouch', 'Bennett Dental edit', 'http://127.0.0.1:54321/storage/v1/object/public/product-images/c11c0000-0000-4000-8000-000000000001/products/everyday-travel-pouch.webp', 24.00, 'GBP', 3, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
      name = excluded.name,
      link = excluded.link,
      platform = excluded.platform,
      image_url = excluded.image_url,
      price = excluded.price,
      currency = excluded.currency,
      rank = excluded.rank,
      enabled = excluded.enabled;

  insert into public.reviews (
    id, user_id, reviewer_name, content, stars, image_url, platform,
    created_at, rank, enabled
  )
  values
    (1984201, 'c11c0000-0000-4000-8000-000000000001', 'Amelia R.', 'Clara explained the clinic plan clearly and recommended only what was genuinely useful for my routine.', 5, null, 'Google', '2026-01-02 09:00:00+00', 1, true),
    (1984202, 'c11c0000-0000-4000-8000-000000000001', 'Daniel K.', 'Booking was straightforward and the home-care guidance felt practical rather than overwhelming.', 5, null, 'Google', '2026-01-03 09:00:00+00', 2, true),
    (1984203, 'c11c0000-0000-4000-8000-000000000001', 'Leila S.', 'The options were explained in plain language and I left knowing exactly how to care for the restoration at home.', 5, null, 'Doctify', '2026-01-04 09:00:00+00', 3, true),
    (1984204, 'c11c0000-0000-4000-8000-000000000001', 'Thomas W.', 'The team kept the visit calm and organised, and the product guidance matched what we discussed in the clinic.', 4, null, 'Google', '2026-01-05 09:00:00+00', 4, true),
    (1984291, 'c11c0000-0000-4000-8000-000000000001', 'Hidden reviewer', 'This disabled review must not appear on the public profile.', 5, null, 'Google', '2026-01-06 09:00:00+00', 5, false),
    (1984292, 'c11c0000-0000-4000-8000-000000000001', ' ', 'This blank-name sentinel must not appear on the public profile.', 5, null, 'Google', '2026-01-07 09:00:00+00', 6, true),
    (1984293, 'c11c0000-0000-4000-8000-000000000001', 'Null content sentinel', null, 5, null, 'Google', null, 7, true),
    (1984294, 'c11c0000-0000-4000-8000-000000000001', 'Invalid score sentinel', 'This invalid-score sentinel must not appear on the public profile.', 6, null, 'Google', '2026-01-08 09:00:00+00', 8, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
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
    (1984701, 'c11c0000-0000-4000-8000-000000000001', 'https://example.com/bennett-dental/reviews', 1, true),
    (1984702, 'c11c0000-0000-4000-8000-000000000001', 'https://reviews.example.net/bennett-dental', 2, true),
    (1984703, 'c11c0000-0000-4000-8000-000000000001', 'https://feedback.example.org/bennett-dental', 3, true),
    (1984704, 'c11c0000-0000-4000-8000-000000000001', 'https://community.example.com/bennett-dental/reviews', 4, true),
    (1984791, 'c11c0000-0000-4000-8000-000000000001', 'https://hidden.example.com/bennett-dental/reviews', 5, false)
  on conflict (id) do update
  set user_id = excluded.user_id,
      link = excluded.link,
      rank = excluded.rank,
      enabled = excluded.enabled;

  insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
  values ('c11c0000-0000-4000-8000-000000000020', 'c11c0000-0000-4000-8000-000000000002', 'Community', 1)
  on conflict (link_group_id) do update
  set dentistry_id = excluded.dentistry_id,
      heading = excluded.heading,
      rank = excluded.rank;

  insert into public.links (
    link_id, title, link, is_active, rank, click_counter, image_url,
    image_variant, image_alt, image_decorative, is_featured
  )
  values ('c11c0000-0000-4000-8000-000000000021', 'Join the monthly care notes', 'https://example.com/bennett-dental/care-notes', true, 1, 0, null, 'none', null, true, false)
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
  values ('c11c0000-0000-4000-8000-000000000022', 'c11c0000-0000-4000-8000-000000000020', 'c11c0000-0000-4000-8000-000000000021')
  on conflict (dentistry_links_id) do update
  set link_group_id = excluded.link_group_id,
      link_id = excluded.link_id;

  insert into public.blog_groups (id, user_id, name, rank, enabled)
  values
    (1984301, 'c11c0000-0000-4000-8000-000000000001', 'Clinic notes', 1, true),
    (1984302, 'c11c0000-0000-4000-8000-000000000001', 'At-home care', 2, true),
    (1984303, 'c11c0000-0000-4000-8000-000000000001', 'Draft notes', 3, false)
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
    (1984401, 1984301, 'What to expect at a first visit', 'A first visit creates space to understand your goals, assess your oral health, and agree on practical next steps together.', 'What to expect at a first visit', 'A clear guide to a first clinic visit.', '/previews/preview-1.webp', '2026-01-02 09:00:00+00', 1, 'what-to-expect-at-a-first-visit', true, 0),
    (1984402, 1984301, 'How preventive appointments help', 'Preventive appointments combine professional care with advice tailored to the routines and risks that matter to you.', 'How preventive appointments help', 'How regular preventive care supports oral health.', null, '2026-01-03 09:00:00+00', 2, 'how-preventive-appointments-help', true, 0),
    (1984403, 1984301, 'Planning restorative care together', 'Restorative choices work best when comfort, longevity, maintenance, and your priorities are considered as one plan.', 'Planning restorative care together', 'A shared approach to restorative treatment planning.', '/previews/preview-2.webp', '2026-01-04 09:00:00+00', 3, 'planning-restorative-care-together', true, 0),
    (1984404, 1984301, 'Questions to bring to your appointment', 'Writing down questions before an appointment can make it easier to compare choices and leave with a plan you understand.', 'Questions to bring to your appointment', 'Useful questions for a dental appointment.', null, '2026-01-05 09:00:00+00', 4, 'questions-to-bring-to-your-appointment', true, 0),
    (1984405, 1984302, 'Building a manageable brushing routine', 'A consistent routine should fit your day. Start with a realistic time, the right tools, and one habit you can repeat.', 'Building a manageable brushing routine', 'Practical ideas for a repeatable brushing routine.', null, '2026-01-06 09:00:00+00', 1, 'building-a-manageable-brushing-routine', true, 0),
    (1984406, 1984302, 'Choosing everyday oral care products', 'Everyday products should match your needs and be straightforward to use consistently between professional appointments.', 'Choosing everyday oral care products', 'A guide to everyday oral care product choices.', null, '2026-01-07 09:00:00+00', 2, 'choosing-everyday-oral-care-products', true, 0),
    (1984407, 1984302, 'Unpublished home-care draft', 'This draft remains owner-managed but must not appear on the public profile.', 'Unpublished home-care draft', 'A disabled article used to verify public filtering.', null, '2026-01-08 09:00:00+00', 3, 'unpublished-home-care-draft', false, 0),
    (1984408, 1984303, 'Article in a disabled group', 'This enabled article belongs to a disabled group and must remain private.', 'Article in a disabled group', 'An enabled article in a disabled group.', null, '2026-01-09 09:00:00+00', 1, 'article-in-a-disabled-group', true, 0)
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

  insert into public.galleries (
    id, user_id, title, before_image_url, after_image_url, rank, enabled,
    before_image_label, after_image_label
  )
  values
    (1984501, 'c11c0000-0000-4000-8000-000000000001', 'Composite edge refinement', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 1, true, 'Before refinement', 'After refinement'),
    (1984502, 'c11c0000-0000-4000-8000-000000000001', 'Whitening plan result', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-whitening-after.webp', 2, true, 'Before whitening', 'After whitening'),
    (1984503, 'c11c0000-0000-4000-8000-000000000001', 'Restorative smile review', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-whitening-after.webp', 3, true, 'Starting smile', 'Reviewed result'),
    (1984504, 'c11c0000-0000-4000-8000-000000000001', 'Everyday confidence result', '/previews/cosmetic-case-whitening-before.webp', '/previews/cosmetic-case-bonding-after.webp', 4, true, 'Before care', 'After care'),
    (1984505, 'c11c0000-0000-4000-8000-000000000001', 'Hidden comparison', '/previews/cosmetic-case-bonding-before.webp', '/previews/cosmetic-case-bonding-after.webp', 5, false, 'Before', 'After'),
    (1984506, 'c11c0000-0000-4000-8000-000000000001', ' ', 'javascript:alert(1)', '/previews/cosmetic-case-bonding-after.webp', 6, true, 'Before', 'After')
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
    id, user_id, title, image_url, rank, enabled
  )
  values
    (1984601, 'c11c0000-0000-4000-8000-000000000001', 'A calm consultation room', '/previews/hero-image-1.webp', 1, true),
    (1984602, 'c11c0000-0000-4000-8000-000000000001', 'The Bennett Dental Studio team', '/previews/hero-image-2.webp', 2, true),
    (1984603, 'c11c0000-0000-4000-8000-000000000001', 'Modern preventive care', '/previews/hero-image-3.webp', 3, true),
    (1984604, 'c11c0000-0000-4000-8000-000000000001', 'Comfort-focused treatment space', '/previews/primary.webp', 4, true),
    (1984605, 'c11c0000-0000-4000-8000-000000000001', 'Clinic and home-care collection', '/previews/template-clinic-commerce.webp', 5, true),
    (1984606, 'c11c0000-0000-4000-8000-000000000001', 'Hidden studio image', '/previews/hero-image-1.webp', 6, false),
    (1984607, 'c11c0000-0000-4000-8000-000000000001', ' ', '/previews/hero-image-2.webp', 7, true),
    (1984608, 'c11c0000-0000-4000-8000-000000000001', 'Unsafe studio image', 'file:///private/studio.webp', 8, true)
  on conflict (id) do update
  set user_id = excluded.user_id,
      title = excluded.title,
      image_url = excluded.image_url,
      rank = excluded.rank,
      enabled = excluded.enabled;
end;
$template_clinic_commerce_seed$;
