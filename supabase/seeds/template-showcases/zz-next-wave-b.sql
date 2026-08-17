-- Additive, idempotent fixtures for next-wave Batch B.
-- Private source tables remain authoritative; public_profiles is trigger-owned.
do $next_wave_b_empty$
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
    'bba70000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'template-next-wave-b-empty@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00', '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-next-wave-b-empty","registered_domain":"dental.bio"}',
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
    'bba70000-0000-4000-8000-000000000101',
    'bba70000-0000-4000-8000-000000000001',
    'bba70000-0000-4000-8000-000000000001',
    '{"sub":"bba70000-0000-4000-8000-000000000001","email":"template-next-wave-b-empty@dentalbio.local"}',
    'email', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  )
  on conflict (provider_id, provider) do update
  set user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = excluded.updated_at;

  update public.users
  set first_name = 'Empty',
      last_name = 'Inventory',
      title = 'Dr',
      subscription_status = 'PRO',
      "isVerified" = true,
      use_dental_brand = true,
      registered_domain = 'dental.bio',
      profile_presentation_published = jsonb_build_object(
        'schemaVersion', 1,
        'templateId', 'services-catalogue',
        'themeId', 'warm-care',
        'layoutVariant', 'section-navigator',
        'answers', jsonb_build_object()
      ),
      profile_presentation_published_revision = 1,
      profile_presentation_published_at = '2026-01-01 00:00:00+00'
  where id = 'bba70000-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id, dentistry_id, about_title, about_text, location_title,
    phone, contact_email, website, booking_link, booking_link_enabled
  )
  values (
    'bba70000-0000-4000-8000-000000000001',
    'bba70000-0000-4000-8000-000000000002',
    'Empty inventory fixture', null, null, null, null, null, null, false
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
end
$next_wave_b_empty$;

do $next_wave_b$
declare
  fixture record;
begin
  for fixture in
    select *
    from (values
      ('10ca7100-0000-4000-8000-000000000001'::uuid, 820100, 821000, 831000, 'Location Router'),
      ('5e010000-0000-4000-8000-000000000001'::uuid, 820200, 822000, 832000, 'Services Catalogue'),
      ('ed0ca700-0000-4000-8000-000000000001'::uuid, 820300, 823000, 833000, 'Expert Educator')
    ) as fixtures(user_id, group_base, video_base, product_base, label)
  loop
    insert into public.groups (id, user_id, name, rank, enabled, type)
    values
      (fixture.group_base + 1, fixture.user_id, fixture.label || ' video guides', 10, true, 'videos'),
      (fixture.group_base + 2, fixture.user_id, fixture.label || ' demonstrations', 10, true, 'videos'),
      (fixture.group_base + 3, fixture.user_id, fixture.label || ' disabled videos', 11, false, 'videos'),
      (fixture.group_base + 4, fixture.user_id, '', 12, true, 'videos')
    on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        rank = excluded.rank,
        enabled = excluded.enabled,
        type = excluded.type;

    insert into public.videos (id, group_id, title, link, rank, enabled)
    values
      (fixture.video_base + 1, fixture.group_base + 1, fixture.label || ' first visit guide', 'https://www.youtube.com/watch?v=M1HinlfYA04', 10, true),
      (fixture.video_base + 2, fixture.group_base + 1, fixture.label || ' daily care guide', 'https://vimeo.com/76979871', 10, true),
      (fixture.video_base + 3, fixture.group_base + 2, fixture.label || ' treatment demonstration', 'https://www.dailymotion.com/video/x8abc12', 10, true),
      (fixture.video_base + 4, fixture.group_base + 2, fixture.label || ' home care demonstration', 'https://media.example.com/dentalbio/owner-video.mp4', 10, true),
      (fixture.video_base + 5, fixture.group_base + 1, '', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 11, true),
      (fixture.video_base + 6, fixture.group_base + 1, fixture.label || ' HTTP sentinel video', 'http://www.youtube.com/watch?v=ysz5S6PUM-U', 12, true),
      (fixture.video_base + 7, fixture.group_base + 1, fixture.label || ' credential sentinel video', 'https://owner:secret@www.youtube.com/watch?v=ysz5S6PUM-U', 13, true),
      (fixture.video_base + 8, fixture.group_base + 1, fixture.label || ' lookalike sentinel video', 'https://youtube.com.attacker.example/watch?v=ysz5S6PUM-U', 14, true),
      (fixture.video_base + 9, fixture.group_base + 1, fixture.label || ' disabled sentinel video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 15, false),
      (fixture.video_base + 10, fixture.group_base + 3, fixture.label || ' disabled group sentinel video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 1, true),
      (fixture.video_base + 11, fixture.group_base + 4, fixture.label || ' blank group sentinel video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 1, true)
    on conflict (id) do update
    set group_id = excluded.group_id,
        title = excluded.title,
        link = excluded.link,
        rank = excluded.rank,
        enabled = excluded.enabled;

    insert into public.products (
      id, group_id, name, link, platform, image_url, price, currency, rank, enabled, user_id
    )
    values
      (fixture.product_base + 1, null, fixture.label || ' daily care kit', 'https://example.com/dentalbio/' || fixture.product_base || '/daily-care', 'Owner shop', null, 12.99, 'GBP(£)', 10, true, fixture.user_id),
      (fixture.product_base + 2, null, fixture.label || ' travel care kit', 'https://example.com/dentalbio/' || fixture.product_base || '/travel-care', 'Owner shop', 'not-an-image-url', 8.50, 'GBP(£)', 10, true, fixture.user_id),
      (fixture.product_base + 3, null, fixture.label || ' interdental care kit', 'https://example.com/dentalbio/' || fixture.product_base || '/interdental-care', 'Owner shop', null, 15.00, 'GBP(£)', 11, true, fixture.user_id),
      (fixture.product_base + 4, null, fixture.label || ' sensitivity care kit', 'https://example.com/dentalbio/' || fixture.product_base || '/sensitivity-care', 'Owner shop', null, 18.25, 'GBP(£)', 12, true, fixture.user_id),
      (fixture.product_base + 5, null, fixture.label || ' disabled sentinel product', 'https://example.com/dentalbio/disabled', 'Owner shop', null, 1.00, 'GBP(£)', 13, false, fixture.user_id),
      (fixture.product_base + 6, null, '', 'https://example.com/dentalbio/blank', 'Owner shop', null, 1.00, 'GBP(£)', 14, true, fixture.user_id),
      (fixture.product_base + 7, null, fixture.label || ' malformed sentinel product', 'not-a-url', 'Owner shop', null, 1.00, 'GBP(£)', 15, true, fixture.user_id),
      (fixture.product_base + 8, null, fixture.label || ' HTTP sentinel product', 'http://example.com/dentalbio/http', 'Owner shop', null, 1.00, 'GBP(£)', 16, true, fixture.user_id),
      (fixture.product_base + 9, null, fixture.label || ' credential sentinel product', 'https://owner:secret@example.com/dentalbio/credential', 'Owner shop', null, 1.00, 'GBP(£)', 17, true, fixture.user_id)
    on conflict (id) do update
    set group_id = excluded.group_id,
        name = excluded.name,
        link = excluded.link,
        platform = excluded.platform,
        image_url = excluded.image_url,
        price = excluded.price,
        currency = excluded.currency,
        rank = excluded.rank,
        enabled = excluded.enabled,
        user_id = excluded.user_id;
  end loop;

  update public.locations
  set image_url = 'http://127.0.0.1:54321/storage/v1/object/public/location-images/ed0ca700-0000-4000-8000-000000000001/dentistries/ed0ca700-0000-4000-8000-000000000002/locations/ed0ca700-0000-4000-8000-000000000003/northbank-teaching-suite.webp',
      image_alt = 'Teaching suite at Northbank Dental Education Centre',
      image_decorative = false
  where location_id = 'ed0ca700-0000-4000-8000-000000000003';

  insert into public.locations (
    location_id, business_name, full_address, country, city, area,
    latitude, longitude, image_url, image_alt, image_decorative
  )
  values
    ('ed0ca700-0000-4000-8000-000000000201', 'Riverside Clinical Teaching Centre', '18 River Walk, London SE1 2RT', 'United Kingdom', 'London', 'South Bank', 51.5055, -0.1160, 'http://127.0.0.1:54321/storage/v1/object/public/location-images/ed0ca700-0000-4000-8000-000000000001/dentistries/ed0ca700-0000-4000-8000-000000000002/locations/ed0ca700-0000-4000-8000-000000000201/riverside-teaching-centre.webp', null, true),
    ('ed0ca700-0000-4000-8000-000000000202', 'City Dental Learning Rooms', '7 Aldersgate Street, London EC1A 4HY', 'United Kingdom', 'London', 'City of London', 51.5177, -0.0977, 'http://127.0.0.1:54321/storage/v1/object/public/location-images/ed0ca700-0000-4000-8000-000000000001/dentistries/ed0ca700-0000-4000-8000-000000000002/locations/ed0ca700-0000-4000-8000-000000000202/city-learning-rooms.webp', 'Seminar room at City Dental Learning Rooms', false)
  on conflict (location_id) do update
  set business_name = excluded.business_name,
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
    dentistry_location_id, dentistry_id, location_id
  )
  values
    ('ed0ca700-0000-4000-8000-000000000211', 'ed0ca700-0000-4000-8000-000000000002', 'ed0ca700-0000-4000-8000-000000000201'),
    ('ed0ca700-0000-4000-8000-000000000212', 'ed0ca700-0000-4000-8000-000000000002', 'ed0ca700-0000-4000-8000-000000000202')
  on conflict (dentistry_location_id) do update
  set dentistry_id = excluded.dentistry_id,
      location_id = excluded.location_id;
end
$next_wave_b$;
