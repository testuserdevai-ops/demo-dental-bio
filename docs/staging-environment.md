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
| Vercel live alias          | `dentalbio-staging-rameziophobias-projects.vercel.app`   | Protected Production alias; current deployment is ready         |
| Vercel custom domain       | `staging.dental.bio`                                     | Attached but unused; no DNS verification is required            |

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
On 2026-08-11, a read-only Postgres audit with
`default_transaction_read_only=on` compared the repository and branch ledgers:
both contain the same 35 migration versions, with no missing or extra entries.
The stale branch status was therefore an integration-status problem, not an
unapplied schema change. The project is connected to
`rameziophobia/dentalbio` with working directory `.`, **Deploy to production**
off, and **Automatic branching** off. This prevents repository events from
updating production or creating unrequested preview branches; the existing
persistent `develop` branch remains the only repository-driven staging target.
The first connected run exposed psql-only commands in the branch seed wrapper;
PR #7 replaced them with a PostgreSQL idempotency gate. The rerun for merge
commit `39fbd351` completed successfully: GitHub's Supabase check passed, the
branch is `ACTIVE_HEALTHY`, and its workflow status is `FUNCTIONS_DEPLOYED`.

`supabase/seed.sql` was then applied twice through the `develop`-only remote
configuration: the first run created only the deterministic `.local` accounts
and synthetic content, and the second preserved staging edits. It never writes
`public.public_profiles`; database triggers build that projection. After the
hosted rerun, the staging seed verifier again confirmed exactly those two Auth
accounts and no provider identifiers on `pcbakmokevyrpiqvbzni`.

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

The staging project is owned by `rameziophobia` and is linked only to the
temporary private fork `rameziophobia/dentalbio`. Its Production environment
tracks `develop`, so every future push to that branch auto-deploys normally.
Vercel Authentication with Standard Protection is enabled. The existing
production project was not relinked and its branch and deployment settings were
not changed.

Thirty-two environment variables are installed with target
`production` on the isolated `dentalbio-staging` project. They include the
staging Supabase branch, redirected email, Stripe test keys and price IDs,
the Stripe test webhook signing secret, staging Vercel target IDs, and the
existing Contentful/maps credentials. No live Stripe secret was copied. The
staging Vercel API token is also stored locally as `STAGING_VERCEL_API_KEY` in
the gitignored `.env` and in macOS Keychain.

Auto deployment `dpl_47wLvn7a6wx6KFESSdwNGcPi5aQL` from fork merge commit
`39fbd351` reached READY on the protected Production alias. Earlier smoke
testing returned 302 without the protection bypass and 200 with it. This proves
that pushes to the fork's `develop` branch deploy only the separate staging
project. The build and startup safety validator passed with these critical
values:

- `APP_ENV=staging`
- `APP_URL=https://dentalbio-staging-rameziophobias-projects.vercel.app`
- `NEXT_PUBLIC_BASE_URL=https://dentalbio-staging-rameziophobias-projects.vercel.app`
- `STAGING_SUPABASE_PROJECT_REF=pcbakmokevyrpiqvbzni`
- the URL, anon key, and service-role key for `pcbakmokevyrpiqvbzni` only
- `EMAIL_DELIVERY_MODE=redirect`
- `EMAIL_REDIRECT_TO=rameznoshy@gmail.com`
- `EMAIL_SUBJECT_PREFIX=[STAGING]`
- the dedicated domain-restricted, send-only staging `RESEND_API_KEY`

`staging.dental.bio` remains attached but is intentionally unused and does not
need DNS verification. Application URLs, Auth redirects, email links, checkout
returns, and callbacks use the protected Vercel live alias above. The two Vercel
URL variables and the staging branch's Supabase Auth `site_url` and redirect
allow-list were read back with the exact alias values.

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
macOS Keychain account. Test webhook `we_1U2zysLtLr29rxiJfijurykg` targets
`/api/webhooks` on the protected live alias and subscribes only to the four
events handled by the route. Its signing secret and Vercel automation bypass
are stored in Keychain; the signing secret is installed only in this staging
project. A signed synthetic unhandled event returned 200 without executing a
mutation handler. Never reuse the live Stripe webhook secret.

## Verification and rollback

The 2026-08-11 repository verification passed Prettier, typecheck, lint, the
production build, and all 737 unit tests. A hosted-branch Playwright run passed
33 tests, including the protected domain, subscription read-only boundary,
Veriff boundary, and public-profile analytics checks. It also exposed that the
full browser suite is not currently a valid hosted-staging acceptance gate: one
email flow requires local Mailpit, several expectations refer to superseded UI
labels or newly required form fields, and remote fully-parallel workers exercise
destructive authorization fixtures. The run left no test identities behind;
the exact staging seed verifier passed again afterward. Keep hosted smoke tests
focused and non-destructive until the browser harness is updated for isolated
remote tenants.

Credential rotation is intentionally deferred. Existing staging-only Supabase
credentials and the staging Vercel API token remain in use.

The final provider audit on 2026-08-11 confirmed all 35 local migration versions
exactly match the staging branch under a read-only database connection,
`staging-send-email` is ACTIVE, and the staging Vercel deployment for `develop`
is READY. The production Vercel baseline is unchanged: project
`prj_4zsTxkjTJ2V7TzJSG0ohF7qzfG5a` still has update timestamp
`1781479719200`, repository link `Yuniro/dentalbio`, production branch `master`,
and latest deployment `dpl_71fcah5nC8pPuan4nNpa2yCcNRYe`.

For future smoke testing, verify that billing creates only Stripe test-mode
objects, every email arrives only at `rameznoshy@gmail.com`, and the protected
Vercel alias requires authentication.

After smoke testing, audit logs for zero writes to production Supabase, live
Stripe, and the existing DentalBio production Vercel project. Expected writes
to Stripe test mode and explicitly configured external providers are acceptable.
Rollback of staging means pausing the isolated resources or reverting staging
configuration. Removing a domain, deleting a project or branch, or replacing an
environment variable is destructive and requires an approval gate first.
