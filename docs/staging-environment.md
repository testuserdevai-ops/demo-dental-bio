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

| Resource                   | Identifier                                               | Safety state                                                    |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Supabase persistent branch | `develop` / `pcbakmokevyrpiqvbzni`                       | `with_data=false`; no production rows copied                    |
| Vercel project             | `dentalbio-staging` / `prj_kxwpbXd58TM8zgp0aJyqy5edxc8q` | Separate `rameziophobia` project; no production project changes |
| Vercel domain              | `staging.dental.bio`                                     | Verified; move to staging Production target after Git linkage   |

The existing production Vercel project remains untouched. It is linked to the
outdated `Yuniro/dentalbio` repository; moving production to
`digimaxhub/dentalbio` is a separate migration and must not trigger an automatic
production deployment.

## Supabase deployment

The staging branch was created without `--with-data`. Its initial automatic
workflow reported `MIGRATIONS_FAILED` because the Supabase GitHub connection was
not available. After approval, all 35 repository migrations were applied
manually to the dynamically resolved staging connection on 2026-08-10. The
production ref was rejected by the command guard before any database action.

`supabase/seeds/staging.sql` was then applied twice: the first run created only
the deterministic `.local` accounts and synthetic content, and the second
preserved staging edits. It never writes `public.public_profiles`; database
triggers build that projection. The staging seed verifier passed against
`pcbakmokevyrpiqvbzni`.

`supabase/functions/staging-send-email` is deployed only to the staging ref. Its
five staging-only secrets are installed, and the remote Auth configuration uses
the staging site URL and signed Send Email Hook. The Resend credential is a
separate send-only key restricted to the verified `dental.bio` domain. Secret
values are stored in macOS Keychain under the `dentalbio-staging` account and
are not committed.

An end-to-end password-recovery request for `pro@dentalbio.local` returned 200.
Resend recorded the resulting `[STAGING] DentalBio recovery` message only to
`rameznoshy@gmail.com`. The hook also fails closed when its staging environment,
redirect, signature, or provider secrets are absent or invalid.

Run the verifier with the isolated staging values:

```sh
bun run verify:staging-seed
```

The verifier refuses the production ref, requires URL/ref agreement, checks the
synthetic ownership graph, and rejects Stripe, Veriff, or verified-domain state.

## Vercel deployment

The staging project is owned by `rameziophobia` and uses the temporary private
fork `rameziophobia/dentalbio`. Link only `dentalbio-staging`, set its production
branch to `develop`, and leave both existing Vercel projects untouched. The
existing production project must not be relinked and its production branch and
automatic-deployment settings must not change.

Thirty-one environment variables are already installed with target
`production` on the isolated `dentalbio-staging` project. They include the
staging Supabase branch, redirected email, Stripe test keys and price IDs,
staging Vercel target IDs, and the existing Contentful/maps credentials. No live
Stripe webhook secret was copied.

Once linked, set the staging project's production branch to `develop`. This
makes pushes to `develop` auto-deploy normally using these variables while the
separate existing DentalBio production project remains untouched. Confirm these
critical values before the first deploy:

- `APP_ENV=staging`
- `APP_URL=https://staging.dental.bio`
- `NEXT_PUBLIC_BASE_URL=https://staging.dental.bio`
- `STAGING_SUPABASE_PROJECT_REF=pcbakmokevyrpiqvbzni`
- the URL, anon key, and service-role key for `pcbakmokevyrpiqvbzni` only
- `EMAIL_DELIVERY_MODE=redirect`
- `EMAIL_REDIRECT_TO=rameznoshy@gmail.com`
- `EMAIL_SUBJECT_PREFIX=[STAGING]`
- the dedicated domain-restricted, send-only staging `RESEND_API_KEY`

Use Stripe test-mode secret and publishable keys, test products/prices, and a
test-mode webhook endpoint. Mutations are enabled in staging so checkout,
registration, subscription, Veriff, cron, and domain-management flows behave
normally. Other production-capable provider credentials may be reused, but
their resource targets must remain staging-specific where the provider exposes
one. In particular, a reused Vercel token must be paired with
`prj_kxwpbXd58TM8zgp0aJyqy5edxc8q` and
`team_U3rOXFQafDz6sjx43d5U3Rjo`; startup validation rejects a different Vercel
project or team.

The supplied test keys belong to Stripe account `acct_1U2xgZLtLr29rxiJ`. The
production catalog was read without accessing customers or subscriptions, then
mirrored as three active test products and six active recurring GBP prices:

| Variable                     | Test price                       |
| ---------------------------- | -------------------------------- |
| `PRICE_FREE_MONTHLY`         | `price_1U2xodLtLr29rxiJ2uWaE09L` |
| `PRICE_FREE_ANNUALLY`        | `price_1U2xoeLtLr29rxiJZfjrw3bW` |
| `PRICE_PRO_MONTHLY`          | `price_1U2xomLtLr29rxiJ8lpLyJAj` |
| `PRICE_PRO_ANNUALLY`         | `price_1U2xoqLtLr29rxiJugOLjzQd` |
| `PRICE_PREMIUM_PRO_MONTHLY`  | `price_1U2xohLtLr29rxiJ1ObHXUIW` |
| `PRICE_PREMIUM_PRO_ANNUALLY` | `price_1U2xojLtLr29rxiJM0fSo6tl` |

Each test object has source metadata and was created with an idempotency key.
The Stripe keys and the price map are stored under the `dentalbio-staging`
macOS Keychain account. Create the test webhook only after the staging deploy is
reachable and a Vercel protection bypass has been configured; never reuse the
live Stripe webhook secret.

## Verification and rollback

Before smoke testing, run typecheck, lint, tests, build, and focused Playwright
and accessibility checks. Verify that billing creates only Stripe test-mode
objects, every email arrives only at `rameznoshy@gmail.com`, and the protected
domain requires Vercel authentication.

After smoke testing, audit logs for zero writes to production Supabase, live
Stripe, and the existing DentalBio production Vercel project. Expected writes
to Stripe test mode and explicitly configured external providers are acceptable.
Rollback of staging means pausing the isolated resources or reverting staging
configuration. Removing a domain, deleting a project or branch, or replacing an
environment variable is destructive and requires an approval gate first.
