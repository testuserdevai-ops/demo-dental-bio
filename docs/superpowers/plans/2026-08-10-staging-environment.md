# Production-safe DentalBio staging environment

## Summary

- Create a persistent Supabase `develop` branch populated from an approved,
  point-in-time production snapshot without ever writing to production.
- Deploy GitHub `develop` automatically as the production branch of the separate
  `dentalbio-staging` Vercel project on its protected Vercel alias.
- Hard invariant: staging must never read or write production Supabase data and
  must never update the production Vercel project or deployment.
- Redirect all staging email to `rameznoshy@gmail.com`.
- Run normal application flows, including mutations, against staging Supabase
  and Stripe test mode.

## Implementation

### Supabase branch and data

- Configure Supabase GitHub branching so `develop` migrations deploy only to a
  persistent staging branch.
- Disable hosted seed execution for `develop`; the local synthetic seed remains
  for disposable local databases only.
- Take permission-restricted, checksummed schema/data/Storage backups of both
  production and staging before any reset. Production database access must be
  read-only dumps and `SELECT` verification only.
- Validate the staging project ref immediately before every destructive command.
  Reset only staging to the production baseline migration, restore the snapshot
  with triggers disabled, then apply all remaining repository migrations so
  their backfills and constraints normalize the legacy rows.
- Upload Storage files through the staging Storage API so object metadata is
  recreated consistently. Let migrations and owned triggers populate
  `public.public_profiles`; never write to that projection directly.
- Account for the versioned local template assets configured by
  `storage.buckets.*.objects_path`; the hosted repository workflow upserts those
  staging fixtures after the production Storage snapshot is restored.
- Preserve Auth password hashes so copied users can authenticate on staging.
  All recovery and other Auth email still passes through staging containment.
- Add a snapshot verifier that requires the expected staging project ref,
  refuses production or unknown targets, and checks Auth/application/profile
  parity, the required administrator, and recursive Storage object counts.

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
  - `EMAIL_TEST_MODE=true`
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
- Test the staging snapshot verifier, including wrong-target rejection,
  Auth/application/profile consistency, and recursive Storage coverage.
- Verify the copied Shaz administrator can log in and exercise the current admin
  dashboard. Existing production credentials or a staging recovery link should
  work, without changing production Auth.
- Verify a temporary user can register and create only Stripe test-mode objects.
- Run Prettier checks, typecheck, lint, unit tests, production build, focused
  Playwright flows, and accessibility checks.
- Audit provider and database logs after smoke testing to confirm zero production
  writes.

## Acceptance assumptions

- Supabase Pro Branching is available.
- `main` remains production and `develop` remains staging.
- Production credentials are used only by the guarded, read-only snapshot step
  and are never installed in staging or Vercel.
- The staging branch contains production-derived personal data and must retain
  access protection, email redirection, least-privilege secrets, and a documented
  refresh/deletion procedure.
- Stripe staging configuration is test mode only; all Stripe objects created by
  staging must be test objects.
- Reused production-capable credentials do not authorize changing the
  production Vercel project, its Git linkage, or its deployments.
