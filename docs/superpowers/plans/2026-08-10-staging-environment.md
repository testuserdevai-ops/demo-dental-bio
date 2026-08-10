# Production-safe DentalBio staging environment

## Summary

- Create a persistent Supabase `develop` branch populated only with synthetic,
  deterministic staging seed data.
- Deploy GitHub `develop` to the protected Vercel Preview domain
  `staging.dental.bio`.
- Hard invariant: staging must never read or write production Supabase data and
  must never write to production external services.
- Redirect all staging email to `rameznoshy@gmail.com`.
- Allow temporary staging registrations, but do not create Stripe objects for
  them.

## Implementation

### Supabase branch and seed

- Configure Supabase GitHub branching so `develop` migrations deploy only to a
  persistent staging branch.
- Keep the existing `supabase/seed.sql` local-only. Add a separate
  `supabase/seeds/staging.sql` and select it only through the `develop` remote
  configuration.
- Seed deterministic, confirmed synthetic Auth accounts and representative
  DentalBio profile data needed for dashboard and public-profile testing. Use
  fake `.local` email addresses, example contact details, fixed UUIDs, known
  staging-only passwords, and no clinical or production-derived values.
- Seed `public.users` and `public.dentistries`, then rely on the existing triggers
  to create `public.public_profiles`; never write to the projection directly.
- Include representative treatments, locations, links, blogs, videos,
  galleries, reviews, products, and socials, but no Stripe IDs, Veriff sessions,
  verified custom domains, real Storage objects, IPs, fingerprints, audit logs,
  or provider identifiers.
- Make the staging seed safe to rerun: insert missing fixtures without
  overwriting staging edits, avoid duplicates, and keep stable visible ordering.
- Add a staging-seed verifier that requires the expected staging project ref,
  refuses production or unknown targets, and asserts the exact synthetic
  accounts, ownership graph, generated public projection, and absence of
  production identifiers.

### Vercel Hobby deployment

- Keep the existing Vercel project and deploy `develop` as a Preview branch on
  every push.
- Assign `staging.dental.bio` specifically to the `develop` Preview branch.
- Enable Standard Deployment Protection with Vercel Authentication.
- Use `develop`-specific Preview variables so feature branches cannot inherit
  staging secrets accidentally.
- Add `APP_ENV=staging`, `APP_URL=https://staging.dental.bio`, and
  `NEXT_PUBLIC_BASE_URL=https://staging.dental.bio`.
- Make redirects, checkout return URLs, email links, Auth URLs, and callbacks
  use the environment base URL while retaining the DentalBio brand.
- Do not change existing production domains, production environment variables,
  deployment settings, or production-branch behavior.

### Email containment

- Introduce one server-only application email policy using:
  - `EMAIL_DELIVERY_MODE=redirect`
  - `EMAIL_REDIRECT_TO=rameznoshy@gmail.com`
  - `EMAIL_SUBJECT_PREFIX=[STAGING]`
- Route every Resend call through the policy, replacing `to`, `cc`, and `bcc`
  recipients and recording the intended recipient in the redirected message.
- Ensure redirected marketing messages cannot unsubscribe or otherwise mutate
  the intended recipient's production preferences.
- Use a dedicated staging Resend key rather than the production key.
- Add a Supabase Auth Send Email Hook that validates its signature and redirects
  OTP, confirmation, invitation, and recovery messages to Ramez while retaining
  the original token or link.
- Preserve current production email behavior when the staging variables are
  absent.

### Stripe and other integrations

- If live pricing must be displayed during v0, use a live Stripe restricted key
  with read access only to the price/product catalog. Seeded users have no live
  customer or subscription linkage.
- Add server-side staging guards before every Stripe mutation. Disable checkout,
  registration trial creation, upgrades, cancellation, payment-method changes,
  customer deletion, and Stripe webhook processing.
- Hide or disable corresponding UI controls with an explicit message that
  billing changes are unavailable in staging.
- Temporary registrations create isolated Supabase staging users without Stripe
  customer or subscription IDs.
- Do not configure production Vercel management, Veriff, Stripe webhook, cron,
  or other mutation-capable credentials in staging.
- Permit only explicitly read-only services such as Contentful, Maps, and the
  restricted Stripe key.
- Add startup/build validation that rejects a staging deployment containing
  production Supabase credentials, an unrestricted Stripe secret, Vercel
  management tokens, Veriff credentials, or other forbidden mutation-capable
  secrets.

## Verification

- Test email redirection across Auth, transactional, report, trial, and marketing
  paths.
- Test every Stripe and external-service mutation boundary fails closed before
  contacting its provider in staging.
- Test production behavior remains unchanged.
- Test the staging seed and verifier against disposable databases, including
  wrong-target rejection, idempotent reruns, exact synthetic ownership,
  trigger-generated `public_profiles`, and absence of production identifiers.
- Verify the seeded accounts can log in and exercise representative dashboard
  and public-profile content while all billing controls remain unavailable.
- Verify a temporary user can register without creating a live Stripe object.
- Run Prettier checks, typecheck, lint, unit tests, production build, focused
  Playwright flows, and accessibility checks.
- Audit provider and database logs after smoke testing to confirm zero production
  writes.

## Acceptance assumptions

- Supabase Pro Branching is available.
- `main` remains production and `develop` remains staging.
- The staging branch receives no production database URL, production Supabase
  service-role key, production Auth identity, production password hash, or
  production Storage credential.
- All seeded identities, credentials, content, and provider state are synthetic
  and safe to commit as test fixtures.
- The only permitted production-service read is an optional restricted Stripe
  price/product catalog lookup; it cannot access customers or perform writes.
- If an operation cannot be technically demonstrated to be read-only, stop
  before performing it.
