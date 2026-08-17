-- Additive deterministic Locations, Videos, and Shop inventory for Batch A.
-- Source tables remain private; public_profiles is synchronized by existing triggers.
do $$
declare
  fixture record;
  item_index integer;
  location_uuid uuid;
  location_join_uuid uuid;
begin
  for fixture in
    select *
    from (values
      ('db010000', 'db010000-0000-4000-8000-000000000001'::uuid, 'db010000-0000-4000-8000-000000000002'::uuid, 'Direct Booking', 1710000),
      ('c051e71c', 'c051e71c-0000-4000-8000-000000000001'::uuid, 'c051e71c-0000-4000-8000-000000000002'::uuid, 'Cosmetic Transformation', 1720000)
    ) as fixtures(prefix, user_id, dentistry_id, label, media_base)
  loop
    for item_index in 0..2 loop
      location_uuid := (fixture.prefix || '-0000-4000-8000-' || lpad((item_index * 10 + 3)::text, 12, '0'))::uuid;
      location_join_uuid := (fixture.prefix || '-0000-4000-8000-' || lpad((item_index * 10 + 4)::text, 12, '0'))::uuid;

      insert into public.locations (
        location_id, business_name, full_address, country, city, area,
        latitude, longitude, image_url, image_alt, image_decorative
      ) values (
        location_uuid,
        fixture.label || ' location ' || (item_index + 1),
        (item_index + 1) || ' Owner Street, London',
        'United Kingdom', 'London', 'Area ' || (item_index + 1),
        51.50 + item_index * 0.01, -0.10 - item_index * 0.01,
        'http://127.0.0.1:54321/storage/v1/object/public/location-images/' ||
          fixture.user_id || '/dentistries/' || fixture.dentistry_id ||
          '/locations/' || location_uuid || '/owner-location-' || (item_index + 1) || '.webp',
        case item_index
          when 0 then fixture.label || ' location 1 exterior'
          when 1 then fixture.label || ' location 2 consultation room'
          else null
        end,
        item_index = 2
      )
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

      insert into public.dentistry_locations (dentistry_location_id, dentistry_id, location_id)
      values (location_join_uuid, fixture.dentistry_id, location_uuid)
      on conflict (dentistry_location_id) do update
      set dentistry_id = excluded.dentistry_id,
          location_id = excluded.location_id;
    end loop;

    insert into public.groups (id, user_id, name, rank, enabled, type)
    values
      (fixture.media_base + 101, fixture.user_id, fixture.label || ' video group A', 1, true, 'videos'),
      (fixture.media_base + 102, fixture.user_id, fixture.label || ' video group B', 1, true, 'videos'),
      (fixture.media_base + 103, fixture.user_id, fixture.label || ' product group', 1, true, 'products'),
      (fixture.media_base + 190, fixture.user_id, fixture.label || ' disabled video group sentinel', 0, false, 'videos'),
      (fixture.media_base + 191, fixture.user_id, '   ', 0, true, 'videos')
    on conflict (id) do update
    set user_id = excluded.user_id,
        name = excluded.name,
        rank = excluded.rank,
        enabled = excluded.enabled,
        type = excluded.type;

    insert into public.videos (id, group_id, title, link, rank, enabled)
    values
      (fixture.media_base + 201, fixture.media_base + 101, fixture.label || ' video 1', 'https://www.youtube.com/watch?v=M1HinlfYA04', 1, true),
      (fixture.media_base + 202, fixture.media_base + 101, fixture.label || ' video 2', 'https://vimeo.com/76979871', 1, true),
      (fixture.media_base + 203, fixture.media_base + 102, fixture.label || ' video 3', 'https://www.dailymotion.com/video/x84sh87', 1, true),
      (fixture.media_base + 204, fixture.media_base + 102, fixture.label || ' video 4', 'https://media.example.com/' || fixture.prefix || '/owner-video.mp4', 1, true),
      (fixture.media_base + 290, fixture.media_base + 101, fixture.label || ' disabled video sentinel', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 0, false),
      (fixture.media_base + 291, fixture.media_base + 101, '   ', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 2, true),
      (fixture.media_base + 292, fixture.media_base + 101, fixture.label || ' HTTP video sentinel', 'http://www.youtube.com/watch?v=ysz5S6PUM-U', 2, true),
      (fixture.media_base + 293, fixture.media_base + 102, fixture.label || ' credential video sentinel', 'https://owner:secret@vimeo.com/76979871', 2, true),
      (fixture.media_base + 294, fixture.media_base + 102, fixture.label || ' lookalike video sentinel', 'https://youtube.com.attacker.example/watch?v=ysz5S6PUM-U', 2, true),
      (fixture.media_base + 295, fixture.media_base + 190, fixture.label || ' disabled group video sentinel', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 1, true),
      (fixture.media_base + 296, fixture.media_base + 191, fixture.label || ' blank group video sentinel', 'https://www.youtube.com/watch?v=ysz5S6PUM-U', 1, true)
    on conflict (id) do update
    set group_id = excluded.group_id,
        title = excluded.title,
        link = excluded.link,
        rank = excluded.rank,
        enabled = excluded.enabled;

    insert into public.products (
      id, group_id, name, link, platform, image_url, price, currency, rank, enabled, user_id
    ) values
      (fixture.media_base + 301, fixture.media_base + 103, fixture.label || ' product 1', 'https://seller.example.com/' || fixture.prefix || '/product-1', 'Owner seller', null, 11.00, 'GBP(£)', 1, true, fixture.user_id),
      (fixture.media_base + 302, fixture.media_base + 103, fixture.label || ' product 2', 'https://seller.example.com/' || fixture.prefix || '/product-2', 'Owner seller', null, 12.00, 'GBP(£)', 1, true, fixture.user_id),
      (fixture.media_base + 303, fixture.media_base + 103, fixture.label || ' product 3', 'https://seller.example.com/' || fixture.prefix || '/product-3', 'Owner seller', null, 13.00, 'GBP(£)', 2, true, fixture.user_id),
      (fixture.media_base + 304, fixture.media_base + 103, fixture.label || ' product 4', 'https://seller.example.com/' || fixture.prefix || '/product-4', 'Owner seller', 'not-an-image-url', 14.00, 'GBP(£)', 2, true, fixture.user_id),
      (fixture.media_base + 390, fixture.media_base + 103, fixture.label || ' disabled product sentinel', 'https://seller.example.com/disabled', 'Owner seller', null, 1.00, 'GBP(£)', 0, false, fixture.user_id),
      (fixture.media_base + 391, fixture.media_base + 103, '   ', 'https://seller.example.com/blank', 'Owner seller', null, 1.00, 'GBP(£)', 3, true, fixture.user_id),
      (fixture.media_base + 392, fixture.media_base + 103, fixture.label || ' HTTP product sentinel', 'http://seller.example.com/http', 'Owner seller', null, 1.00, 'GBP(£)', 3, true, fixture.user_id),
      (fixture.media_base + 393, fixture.media_base + 103, fixture.label || ' credential product sentinel', 'https://owner:secret@seller.example.com/credential', 'Owner seller', null, 1.00, 'GBP(£)', 3, true, fixture.user_id),
      (fixture.media_base + 394, fixture.media_base + 103, fixture.label || ' malformed product sentinel', 'not-a-product-url', 'Owner seller', null, 1.00, 'GBP(£)', 3, true, fixture.user_id)
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
end
$$;

-- Dedicated cache-stable public empty-state fixture for the shared renderers.
do $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current,
    reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at,
    updated_at, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    'a000000a-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'template-next-wave-a-empty@dentalbio.local',
    '$2a$12$yjIElPlF35CeOiDRSd28duupD/bzfdrskYgeOJPG1BhuB6z1TB4gi',
    '2026-01-01 00:00:00+00', '', '', '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"username":"template-next-wave-a-empty","registered_domain":"dental.bio"}',
    '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00', false, false
  )
  on conflict (id) do update
  set email = excluded.email,
      encrypted_password = excluded.encrypted_password,
      raw_app_meta_data = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at = excluded.updated_at;

  update public.users
  set first_name = 'Empty',
      last_name = 'Fixture',
      position = 'Dentist',
      subscription_status = 'PRO',
      registered_domain = 'dental.bio',
      profile_presentation_published = jsonb_build_object(
        'schemaVersion', 1,
        'templateId', 'direct-booking',
        'themeId', 'modern-specialist',
        'layoutVariant', 'classic-stack',
        'answers', '{}'::jsonb
      ),
      profile_presentation_published_revision = 1,
      profile_presentation_published_at = '2026-01-01 00:00:00+00'
  where id = 'a000000a-0000-4000-8000-000000000001';

  insert into public.dentistries (
    user_id, dentistry_id, about_title, about_text, location_title,
    booking_link_enabled
  ) values (
    'a000000a-0000-4000-8000-000000000001',
    'a000000a-0000-4000-8000-000000000002',
    'Empty profile fixture', '', 'Locations', false
  )
  on conflict (user_id) do update
  set dentistry_id = excluded.dentistry_id,
      about_title = excluded.about_title,
      about_text = excluded.about_text,
      location_title = excluded.location_title,
      booking_link_enabled = excluded.booking_link_enabled;
end
$$;
