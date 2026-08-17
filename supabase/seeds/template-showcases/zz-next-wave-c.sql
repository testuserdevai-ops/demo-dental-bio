-- Additive, idempotent parity fixtures for Clinic Commerce, Specialist
-- Assessment, and Trust-First Family Practice. Public profile projection rows
-- are synchronized by the existing source-table triggers.
do $next_wave_c_seed$
declare
  fixture record;
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
    'c0000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'template-next-wave-c-empty@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00', '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-next-wave-c-empty","registered_domain":"dental.bio"}',
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

  update public.users
  set first_name = 'Empty',
      last_name = 'Fixture',
      title = 'Dr',
      position = 'Dentist',
      subscription_status = 'PRO',
      "isVerified" = true,
      registered_domain = 'dental.bio',
      profile_presentation_published = '{"schemaVersion":1,"templateId":"clinic-commerce","themeId":"clinical-light","layoutVariant":"classic-stack","answers":{"defaultAudience":"clinic"}}'::jsonb,
      profile_presentation_published_revision = 1,
      profile_presentation_published_at = '2026-01-01 00:00:00+00'
  where id = 'c0000000-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id, dentistry_id, about_title, about_text, location_title,
    phone, contact_email, website, booking_link, booking_link_enabled
  )
  values (
    'c0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000002',
    'Empty collection fixture', null, null, null, null, null, null, false
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

  for fixture in
    select *
    from (
      values
        ('c11c0000'::text, 'c11c0000-0000-4000-8000-000000000001'::uuid, 'c11c0000-0000-4000-8000-000000000002'::uuid, 1984800::bigint, 1984900::bigint, 1984100::bigint, 'Clinic'::text),
        ('5a5e5500'::text, '5a5e5500-0000-4000-8000-000000000001'::uuid, '5a5e5500-0000-4000-8000-000000000002'::uuid, 1655100::bigint, 1655200::bigint, 1655300::bigint, 'Specialist'::text),
        ('7f570000'::text, '7f570000-0000-4000-8000-000000000001'::uuid, '7f570000-0000-4000-8000-000000000002'::uuid, 1637100::bigint, 1637200::bigint, 1637300::bigint, 'Family'::text)
    ) as fixtures(prefix, user_id, dentistry_id, group_base, video_base, product_base, label)
  loop
    insert into public.groups (id, user_id, name, rank, enabled, type)
    values
      (fixture.group_base + 1, fixture.user_id, fixture.label || ' video guides', 1, true, 'videos'),
      (fixture.group_base + 2, fixture.user_id, fixture.label || ' visit explainers', 1, true, 'videos'),
      (fixture.group_base + 91, fixture.user_id, fixture.label || ' disabled videos sentinel', 3, false, 'videos'),
      (fixture.group_base + 92, fixture.user_id, ' ', 4, true, 'videos')
    on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        rank = excluded.rank,
        enabled = excluded.enabled,
        type = excluded.type;

    insert into public.videos (id, group_id, title, link, rank, enabled)
    values
      (fixture.video_base + 1, fixture.group_base + 1, fixture.label || ' first video', 'https://www.youtube.com/watch?v=M1HinlfYA04', 1, true),
      (fixture.video_base + 2, fixture.group_base + 1, fixture.label || ' second video', 'https://vimeo.com/76979871', 1, true),
      (fixture.video_base + 3, fixture.group_base + 2, fixture.label || ' third video', 'https://www.dailymotion.com/video/x84sh87', 1, true),
      (fixture.video_base + 4, fixture.group_base + 2, fixture.label || ' fourth video', 'https://media.example.com/' || lower(fixture.label) || '-fourth.mp4', 1, true),
      (fixture.video_base + 91, fixture.group_base + 91, fixture.label || ' disabled group sentinel video', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 1, true),
      (fixture.video_base + 92, fixture.group_base + 1, fixture.label || ' disabled video sentinel', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 2, false),
      (fixture.video_base + 93, fixture.group_base + 1, ' ', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 3, true),
      (fixture.video_base + 94, fixture.group_base + 1, fixture.label || ' HTTP video sentinel', 'http://www.youtube.com/watch?v=ysz5S6PUM-U', 4, true),
      (fixture.video_base + 95, fixture.group_base + 1, fixture.label || ' credential video sentinel', 'https://user:secret@www.youtube.com/watch?v=ysz5S6PUM-U', 5, true),
      (fixture.video_base + 96, fixture.group_base + 1, fixture.label || ' lookalike video sentinel', 'https://youtube.com.example.test/watch?v=ysz5S6PUM-U', 6, true),
      (fixture.video_base + 97, fixture.group_base + 1, fixture.label || ' malformed video sentinel', 'not-a-video-url', 7, true)
    on conflict (id) do update
    set group_id = excluded.group_id,
        title = excluded.title,
        link = excluded.link,
        rank = excluded.rank,
        enabled = excluded.enabled;

    insert into public.products (
      id, user_id, name, link, platform, image_url, price, currency, rank, enabled
    )
    values
      (fixture.product_base + 1, fixture.user_id, fixture.label || ' care product one', 'https://example.com/' || lower(fixture.label) || '/product-one', fixture.label || ' shop', '/previews/preview-1.webp', 12.00, 'GBP', 1, true),
      (fixture.product_base + 2, fixture.user_id, fixture.label || ' care product two', 'https://example.com/' || lower(fixture.label) || '/product-two', fixture.label || ' shop', '/previews/preview-2.webp', 18.00, 'GBP', 1, true),
      (fixture.product_base + 3, fixture.user_id, fixture.label || ' care product three', 'https://example.com/' || lower(fixture.label) || '/product-three', fixture.label || ' shop', '/previews/primary.webp', 24.00, 'GBP', 2, true),
      (fixture.product_base + 4, fixture.user_id, fixture.label || ' care product four', 'https://example.com/' || lower(fixture.label) || '/product-four', fixture.label || ' shop', 'file:///invalid-optional-image.webp', 30.00, 'GBP', 2, true),
      (fixture.product_base + 91, fixture.user_id, fixture.label || ' disabled product sentinel', 'https://example.com/hidden-product', fixture.label || ' shop', null, 1.00, 'GBP', 3, false),
      (fixture.product_base + 92, fixture.user_id, ' ', 'https://example.com/blank-product', fixture.label || ' shop', null, 1.00, 'GBP', 4, true),
      (fixture.product_base + 93, fixture.user_id, fixture.label || ' HTTP product sentinel', 'http://example.com/http-product', fixture.label || ' shop', null, 1.00, 'GBP', 5, true),
      (fixture.product_base + 94, fixture.user_id, fixture.label || ' credential product sentinel', 'https://user:secret@example.com/credential-product', fixture.label || ' shop', null, 1.00, 'GBP', 6, true),
      (fixture.product_base + 95, fixture.user_id, fixture.label || ' malformed product sentinel', 'not-a-product-url', fixture.label || ' shop', null, 1.00, 'GBP', 7, true)
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
  end loop;

  -- Clinic product 1984101 is configured as featured. Its authored rank is
  -- deliberately later, proving the featured item moves without consumption.
  update public.products
  set rank = case id
    when 1984101 then 3
    when 1984102 then 1
    when 1984103 then 2
    when 1984104 then 2
    else rank
  end
  where id in (1984101, 1984102, 1984103, 1984104);

  insert into public.locations (
    location_id, business_name, full_address, country, city, area,
    latitude, longitude, image_url, image_alt, image_decorative
  )
  values
    ('c11c0000-0000-4000-8000-000000000101', 'Bennett Dental Central', '11 Central Street, London W1', 'United Kingdom', 'London', 'Central', 51.5151, -0.1411, '/previews/hero-image-1.webp', 'Reception at Bennett Dental Central', false),
    ('c11c0000-0000-4000-8000-000000000102', 'Bennett Dental Riverside', '22 River Road, London SW1', 'United Kingdom', 'London', 'Riverside', 51.5012, -0.1244, '/previews/hero-image-2.webp', null, true),
    ('c11c0000-0000-4000-8000-000000000103', 'Bennett Dental North', '33 North Lane, London N1', 'United Kingdom', 'London', 'North', 51.5363, -0.1033, '/previews/hero-image-3.webp', 'Treatment room at Bennett Dental North', false),
    ('5a5e5500-0000-4000-8000-000000000101', 'Fitzrovia Endodontic Centre', '24 Queen Anne Street, Fitzrovia, London W1G 9LG', 'United Kingdom', 'London', 'Fitzrovia', 51.5193, -0.1453, '/previews/template-specialist-assessment.webp', 'Consultation room at Fitzrovia Endodontic Centre', false),
    ('5a5e5500-0000-4000-8000-000000000103', 'City Endodontic Rooms', '8 City Road, London EC1', 'United Kingdom', 'London', 'City', 51.5231, -0.0877, '/previews/preview-1.webp', null, true),
    ('5a5e5500-0000-4000-8000-000000000105', 'West End Specialist Centre', '16 West Street, London W1', 'United Kingdom', 'London', 'West End', 51.5138, -0.1291, '/previews/preview-2.webp', 'Entrance at West End Specialist Centre', false),
    ('7f570000-0000-4000-8000-000000000003', 'Willow Family Dental', '42 Willow Road, Richmond, London TW9 2LS', 'United Kingdom', 'London', 'Richmond', 51.4613, -0.3037, '/previews/template-trust-first.webp', 'Welcome area at Willow Family Dental', false),
    ('7f570000-0000-4000-8000-000000000103', 'Willow Family Dental East', '15 East Avenue, London E1', 'United Kingdom', 'London', 'East', 51.5172, -0.0612, '/previews/cosmetic-case-bonding-before.webp', null, true),
    ('7f570000-0000-4000-8000-000000000105', 'Willow Family Dental South', '27 South Lane, London SE1', 'United Kingdom', 'London', 'South', 51.5031, -0.0912, '/previews/cosmetic-case-bonding-after.webp', 'Family consultation room at Willow Dental South', false)
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
    ('c11c0000-0000-4000-8000-000000000111', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000101'),
    ('c11c0000-0000-4000-8000-000000000112', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000102'),
    ('c11c0000-0000-4000-8000-000000000113', 'c11c0000-0000-4000-8000-000000000002', 'c11c0000-0000-4000-8000-000000000103'),
    ('5a5e5500-0000-4000-8000-000000000104', '5a5e5500-0000-4000-8000-000000000002', '5a5e5500-0000-4000-8000-000000000103'),
    ('5a5e5500-0000-4000-8000-000000000106', '5a5e5500-0000-4000-8000-000000000002', '5a5e5500-0000-4000-8000-000000000105'),
    ('7f570000-0000-4000-8000-000000000104', '7f570000-0000-4000-8000-000000000002', '7f570000-0000-4000-8000-000000000103'),
    ('7f570000-0000-4000-8000-000000000106', '7f570000-0000-4000-8000-000000000002', '7f570000-0000-4000-8000-000000000105')
  on conflict (dentistry_location_id) do update
  set dentistry_id = excluded.dentistry_id,
      location_id = excluded.location_id;
end;
$next_wave_c_seed$;
