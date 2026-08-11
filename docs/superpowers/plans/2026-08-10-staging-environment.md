# Production-safe DentalBio staging environment

## Summary

- Create a persistent Supabase `develop` branch populated only with synthetic,
  deterministic staging seed data.
- Deploy GitHub `develop` automatically as the production branch of the separate
  `dentalbio-staging` Vercel project on its protected Vercel alias.
- Hard invariant: staging must never read or write production Supabase data and
  must never update the production Vercel project or deployment.
- Redirect all staging email to `rameznoshy@gmail.com`.
- Run normal application flows, including mutations, against staging Supabase
  and Stripe test mode.

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

- Use the isolated `dentalbio-staging` Vercel project. The existing production
  project is linked to the outdated `Yuniro/dentalbio` repository and must not
  be relinked or otherwise changed as part of this staging work.
- Link only the staging project to `rameziophobia/dentalbio`, set that project's
  production branch to `develop`, and deploy it automatically on every push.
  This creates a Production-target deployment only inside
  `dentalbio-staging`; it does not update the existing DentalBio production
  project.
- Use `dentalbio-staging-rameziophobias-projects.vercel.app` as the staging
  project's production URL; custom DNS is not required initially.
- Enable Standard Deployment Protection with Vercel Authentication.
- Use Production-target variables scoped to the isolated staging project so
  feature-branch previews cannot inherit staging secrets accidentally.
- Add `APP_ENV=staging` and set `APP_URL` and `NEXT_PUBLIC_BASE_URL` to
  `https://dentalbio-staging-rameziophobias-projects.vercel.app`.
- Make redirects, checkout return URLs, email links, Auth URLs, and callbacks
  use the environment base URL while retaining the DentalBio brand.
- Do not change existing production domains, production environment variables,
  deployment settings, or production-branch behavior.
- Plan migration away from the outdated production Git linkage separately,
  with its own backup, review, rollback, and an explicit prohibition on
  triggering an automatic production deployment during the migration.

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

- Use Stripe test-mode secret and publishable keys, test products/prices, and a
  webhook endpoint backed by the Stripe test account. Never use live Stripe
  keys or live price IDs in staging.
- Keep checkout, registration trial creation, upgrades, cancellation,
  payment-method changes, customer deletion, webhooks, cron, Veriff, and domain
  management enabled so staging exercises production behavior normally.
- Reuse other provider credentials where needed. When a provider accepts a
  resource target, configure the isolated staging target rather than its
  production counterpart.
- A reused Vercel token must always be paired with the `dentalbio-staging`
  project and its team ID. The startup/build validator rejects any other Vercel
  project target while `APP_ENV=staging`.
- Keep production Supabase credentials forbidden and keep application and Auth
  email redirected to `rameznoshy@gmail.com`.

## Verification

- Test email redirection across Auth, transactional, report, trial, and marketing
  paths.
- Test normal Stripe and external-service mutation flows against the configured
  staging/test targets.
- Test production behavior remains unchanged.
- Test the staging seed and verifier against disposable databases, including
  wrong-target rejection, idempotent reruns, exact synthetic ownership,
  trigger-generated `public_profiles`, and absence of production identifiers.
- Verify the seeded accounts can log in and exercise representative dashboard
  and public-profile content while all billing controls remain unavailable.
- Verify a temporary user can register and create only Stripe test-mode objects.
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
- Stripe staging configuration is test mode only; all Stripe objects created by
  staging must be test objects.
- Reused production-capable credentials do not authorize changing the
  production Vercel project, its Git linkage, or its deployments.
