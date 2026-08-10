# DentalBio staging runbook

## Safety invariant

Staging must never read or write the production Supabase project
`cxqkuqtwrtgvoorxidvn` and must never mutate a production provider. Any unknown
target or missing containment setting fails closed. Do not delete or recreate a
branch, overwrite an environment variable, move a domain, or push migrations
that contain destructive SQL without an explicit approval gate.

Verified production backups live outside the repository at:

- `/Users/ramezweissa/code/other/dentalbio-bk/supabase-2026-08-10`
- `/Users/ramezweissa/code/other/dentalbio-bk/vercel-2026-08-10`

Both directories contain `SHA256SUMS`; verify them before any production
migration or rollback.

## Provisioned isolated resources

| Resource                   | Identifier                                               | Safety state                                                     |
| -------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Supabase persistent branch | `develop` / `pcbakmokevyrpiqvbzni`                       | `with_data=false`; no production rows copied                     |
| Vercel project             | `dentalbio-staging` / `prj_E2DKilXYKsR9PKgPtzB86m3y6DDI` | Separate from production; Standard Vercel Authentication enabled |
| Vercel domain              | `staging.dental.bio`                                     | Verified and assigned to Preview branch `develop`                |

The existing production Vercel project remains untouched. It is linked to the
outdated `Yuniro/dentalbio` repository; moving production to
`digimaxhub/dentalbio` is a separate migration and must not trigger an automatic
production deployment.

## Supabase deployment

The staging branch was created without `--with-data`. Its initial automatic
migration run reported `MIGRATIONS_FAILED`, and its migration history is empty.
A dry run confirmed that the repository's 35 migrations are pending. Several
migrations contain cleanup `delete` and `drop ... if exists` statements, so the
actual push requires explicit destructive-operation approval even though the
target is the empty isolated staging branch.

After approval, resolve the branch connection dynamically and validate the
project ref before pushing. Never paste a connection string into this runbook or
shell history.

Then apply `supabase/seeds/staging.sql`, deploy
`supabase/functions/staging-send-email`, and configure the Send Email Hook. The
seed contains only deterministic `.local` accounts and synthetic content. It
never writes `public.public_profiles`; database triggers build that projection.

Run the verifier with the isolated staging values:

```sh
bun run verify:staging-seed
```

The verifier refuses the production ref, requires URL/ref agreement, checks the
synthetic ownership graph, and rejects Stripe, Veriff, or verified-domain state.

## Vercel deployment

The Vercel GitHub integration currently cannot access
`digimaxhub/dentalbio`. Authorize the Vercel GitHub app for that repository, then
link only `dentalbio-staging`. Do not relink the production project.

Once linked, add these variables with target `preview` and Git branch `develop`
only:

- `APP_ENV=staging`
- `APP_URL=https://staging.dental.bio`
- `NEXT_PUBLIC_BASE_URL=https://staging.dental.bio`
- `STAGING_SUPABASE_PROJECT_REF=pcbakmokevyrpiqvbzni`
- the URL, anon key, and service-role key for `pcbakmokevyrpiqvbzni` only
- `EMAIL_DELIVERY_MODE=redirect`
- `EMAIL_REDIRECT_TO=rameznoshy@gmail.com`
- `EMAIL_SUBJECT_PREFIX=[STAGING]`
- a dedicated staging `RESEND_API_KEY`

For v0 pricing, an optional live Stripe key must be an `rk_` restricted key
with price/product catalog read permissions only. Never configure an `sk_` key,
live publishable key, webhook secret, Vercel management token, Veriff secret,
cron secret, or Entri mutation credential.

## Verification and rollback

Before smoke testing, run typecheck, lint, tests, build, and focused Playwright
and accessibility checks. Verify that billing controls are disabled, temporary
registration stores no Stripe IDs, every email arrives only at
`rameznoshy@gmail.com`, and the protected domain requires Vercel authentication.

After smoke testing, audit Supabase, Stripe, Resend, Veriff, and Vercel logs for
zero production writes. Rollback of staging means pausing the isolated resources
or reverting staging configuration. Removing a domain, deleting a project or
branch, or replacing an environment variable is destructive and requires an
approval gate first.
