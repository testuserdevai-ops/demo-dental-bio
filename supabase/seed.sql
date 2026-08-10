-- Synthetic fixtures for local development and the isolated staging branch.
-- Never apply this file directly to a linked or remote project. Remote staging
-- seeding is gated through seeds/staging.sql and its branch-specific config.
begin;

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
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'pro@dentalbio.local',
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
    '{"username":"pro-user","registered_domain":"dental.bio"}',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'admin@dentalbio.local',
    '$2a$12$TUb5HX/.UL9XuMfBFwUqS.Rny0eSgoR5R5s5t3TK7FGegFY4bzIwO',
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
    '{"username":"admin-user","registered_domain":"dental.bio"}',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    false,
    false
  )
on conflict (id) do update
set
  instance_id = excluded.instance_id,
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change = excluded.email_change,
  phone_change = excluded.phone_change,
  phone_change_token = excluded.phone_change_token,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
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
values
  (
    '11111111-1111-4111-8111-111111111112',
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"pro@dentalbio.local"}',
    'email',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00',
    '2026-01-01 00:00:00+00'
  ),
  (
    '22222222-2222-4222-8222-222222222223',
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '{"sub":"22222222-2222-4222-8222-222222222222","email":"admin@dentalbio.local"}',
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

-- public.users is the private source of truth. The dentistry insert below
-- creates the matching public.public_profiles row through production triggers;
-- never seed the read-only projection directly.
update public.users
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
  domain = 'profile.dentalbio.local',
  domain_verified = false
where id = '11111111-1111-4111-8111-111111111111';

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
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111120',
  'Creating confident, healthy smiles',
  'I provide calm, evidence-led dental care with a focus on prevention, natural-looking restorative treatment, and confident smiles. Every appointment starts with clear options and a plan tailored to the person behind the smile.',
  'Visit us in Marylebone',
  '+442000000000',
  'hello@example.com',
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
  '11111111-1111-4111-8111-111111111190',
  'Hart Smile Studio',
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
  '11111111-1111-4111-8111-111111111191',
  '11111111-1111-4111-8111-111111111120',
  '11111111-1111-4111-8111-111111111190'
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
  '11111111-1111-4111-8111-111111111121',
  '11111111-1111-4111-8111-111111111120',
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
    '11111111-1111-4111-8111-111111111130',
    'Teeth whitening',
    'A dentist-supervised whitening plan designed to brighten your smile safely and predictably.',
    false
  ),
  (
    '11111111-1111-4111-8111-111111111131',
    'Invisalign consultation',
    'A detailed smile and bite assessment to explore discreet clear-aligner treatment options.',
    false
  ),
  (
    '11111111-1111-4111-8111-111111111132',
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
    '11111111-1111-4111-8111-111111111140',
    '11111111-1111-4111-8111-111111111120',
    '11111111-1111-4111-8111-111111111130',
    1
  ),
  (
    '11111111-1111-4111-8111-111111111141',
    '11111111-1111-4111-8111-111111111120',
    '11111111-1111-4111-8111-111111111131',
    2
  ),
  (
    '11111111-1111-4111-8111-111111111142',
    '11111111-1111-4111-8111-111111111120',
    '11111111-1111-4111-8111-111111111132',
    3
  )
on conflict (dentistry_treatment_id) do update
set
  dentistry_id = excluded.dentistry_id,
  treatment_id = excluded.treatment_id,
  rank = excluded.rank;

insert into public.groups (id, user_id, name, rank, enabled, type)
values
  (
    1111101,
    '11111111-1111-4111-8111-111111111111',
    'Patient guides',
    1,
    true,
    'videos'
  ),
  (
    1111102,
    '11111111-1111-4111-8111-111111111111',
    'Smile care essentials',
    2,
    true,
    'products'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  rank = excluded.rank,
  enabled = excluded.enabled,
  type = excluded.type;

insert into public.videos (id, group_id, title, link, rank, enabled)
values
  (
    1111201,
    1111101,
    'What to expect at your first visit',
    'https://www.youtube.com/watch?v=M1HinlfYA04',
    1,
    true
  ),
  (
    1111202,
    1111101,
    'Building a healthy daily routine',
    'https://www.youtube.com/watch?v=ysz5S6PUM-U',
    2,
    true
  )
on conflict (id) do update
set
  group_id = excluded.group_id,
  title = excluded.title,
  link = excluded.link,
  rank = excluded.rank,
  enabled = excluded.enabled;

insert into public.blog_groups (id, user_id, name, rank, enabled)
values (
  1111801,
  '11111111-1111-4111-8111-111111111111',
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
    1111901,
    1111801,
    'How to prepare for your first dental visit',
    'Your first visit should feel straightforward. Bring any questions, tell us about previous treatment, and share what you would most like to improve. We will listen first, explain each option clearly, and help you choose a comfortable next step.',
    'How to prepare for your first dental visit',
    'A calm, practical guide to making your first appointment feel easy and informed.',
    '/previews/preview-1.webp',
    '2026-01-02 09:00:00+00',
    1,
    'prepare-for-your-first-dental-visit',
    true,
    0
  ),
  (
    1111902,
    1111801,
    'A simple routine for a healthy smile',
    'Small daily habits make the biggest difference over time. Brush carefully twice a day, clean between your teeth, and arrange regular check-ups so we can spot changes early. Consistency is kinder to your smile than quick fixes.',
    'A simple routine for a healthy smile',
    'Everyday habits that support a comfortable, healthy smile between appointments.',
    '/previews/preview-2.webp',
    '2026-01-09 09:00:00+00',
    2,
    'simple-routine-for-a-healthy-smile',
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
    1111301,
    1111102,
    'Everyday dental care kit',
    'https://example.com/dentalbio-demo/shop/daily-care-kit',
    'Demo shop',
    '/previews/preview-1.webp',
    12.99,
    'GBP(£)',
    1,
    true,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    1111302,
    1111102,
    'Whitening maintenance kit',
    'https://example.com/dentalbio-demo/shop/whitening-care-kit',
    'Demo shop',
    '/previews/preview-2.webp',
    24.99,
    'GBP(£)',
    2,
    true,
    '11111111-1111-4111-8111-111111111111'
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
  1111401,
  '11111111-1111-4111-8111-111111111111',
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
  (
    1111501,
    '11111111-1111-4111-8111-111111111111',
    'A welcoming clinical space',
    '/previews/hero-image-3.webp',
    1,
    true
  ),
  (
    1111502,
    '11111111-1111-4111-8111-111111111111',
    'Personalised smile planning',
    '/previews/primary.webp',
    2,
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
    1111601,
    '11111111-1111-4111-8111-111111111111',
    'Sophie M.',
    'Everything was explained clearly and I felt comfortable throughout my appointment. The result looks completely natural.',
    5,
    '/profile.webp',
    'Google',
    1,
    true
  ),
  (
    1111602,
    '11111111-1111-4111-8111-111111111111',
    'Daniel R.',
    'A friendly, thoughtful experience from the first consultation onward. I always knew what the next step would be.',
    5,
    '/placeholder.webp',
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
  1111701,
  '11111111-1111-4111-8111-111111111111',
  'https://example.com/dentalbio-demo/reviews'
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  link = excluded.link;

insert into public.link_groups (link_group_id, dentistry_id, heading, rank)
values (
  '11111111-1111-4111-8111-111111111180',
  '11111111-1111-4111-8111-111111111120',
  'Helpful resources',
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
    '11111111-1111-4111-8111-111111111181',
    'Book a consultation',
    'https://example.com/dentalbio-demo/book',
    true,
    1,
    0
  ),
  (
    '11111111-1111-4111-8111-111111111182',
    'New patient information',
    'https://example.com/dentalbio-demo/new-patients',
    true,
    2,
    0
  )
on conflict (link_id) do update
set
  title = excluded.title,
  link = excluded.link,
  is_active = excluded.is_active,
  rank = excluded.rank;

insert into public.dentistry_links (
  dentistry_links_id,
  link_group_id,
  link_id
)
values
  (
    '11111111-1111-4111-8111-111111111183',
    '11111111-1111-4111-8111-111111111180',
    '11111111-1111-4111-8111-111111111181'
  ),
  (
    '11111111-1111-4111-8111-111111111184',
    '11111111-1111-4111-8111-111111111180',
    '11111111-1111-4111-8111-111111111182'
  )
on conflict (dentistry_links_id) do update
set
  link_group_id = excluded.link_group_id,
  link_id = excluded.link_id;

update public.users
set
  role = 'admin',
  subscription_status = null
where id = '22222222-2222-4222-8222-222222222222';

commit;
