This is a [Next.js](https://nextjs.org) application using [Bun](https://bun.sh/) as its package manager and script runner.

## Development

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

### Local Supabase accounts

A local database reset seeds the confirmed development-only accounts below.

| Account | Email                   | Password             | Username     | Role / subscription |
| ------- | ----------------------- | -------------------- | ------------ | ------------------- |
| Pro     | `pro@dentalbio.local`   | `DentalBioPro123!`   | `pro-user`   | `user` / `PRO`      |
| Admin   | `admin@dentalbio.local` | `DentalBioAdmin123!` | `admin-user` | `admin` / none      |

Each public-profile template also has a populated Pro showcase account. Sign in
at [http://localhost:3001/login](http://localhost:3001/login), or open its
username route directly to inspect the public profile.

| Template                    | Email                                            | Password           | Public route                                                                              |
| --------------------------- | ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------- |
| Basic                       | `template-basic@dentalbio.local`                 | `DentalBioPro123!` | [`/template-basic`](http://localhost:3001/template-basic)                                 |
| Direct Booking              | `template-direct-booking@dentalbio.local`        | `DentalBioPro123!` | [`/template-direct-booking`](http://localhost:3001/template-direct-booking)               |
| Location / Provider Router  | `template-location-router@dentalbio.local`       | `DentalBioPro123!` | [`/template-location-router`](http://localhost:3001/template-location-router)             |
| Services Catalogue          | `template-services-catalogue@dentalbio.local`    | `DentalBioPro123!` | [`/template-services-catalogue`](http://localhost:3001/template-services-catalogue)       |
| Cosmetic Transformation     | `template-cosmetic-results@dentalbio.local`      | `DentalBioPro123!` | [`/template-cosmetic-results`](http://localhost:3001/template-cosmetic-results)           |
| Trust-First Family Practice | `template-trust-first@dentalbio.local`           | `DentalBioPro123!` | [`/template-trust-first`](http://localhost:3001/template-trust-first)                     |
| Specialist Assessment       | `template-specialist-assessment@dentalbio.local` | `DentalBioPro123!` | [`/template-specialist-assessment`](http://localhost:3001/template-specialist-assessment) |
| Clinic & Commerce           | `template-clinic-commerce@dentalbio.local`       | `DentalBioPro123!` | [`/template-clinic-commerce`](http://localhost:3001/template-clinic-commerce)             |
| Expert & Educator           | `template-expert-educator@dentalbio.local`       | `DentalBioPro123!` | [`/template-expert-educator`](http://localhost:3001/template-expert-educator)             |

Reset and verify these fixtures only against the local Supabase stack:

```bash
bunx supabase db reset --local
bun scripts/verify-local-seed.ts
```

These credentials are public test fixtures, not secrets. The seed is intended
only for local development: never apply `supabase/seed.sql` to a linked or
remote project, and never use `--include-seed` in a production deployment.

The same nine template accounts can be applied without the Pro or Admin fixture
only to the isolated staging ref. From an isolated worktree, link the exact ref
and use the guarded template-only commands:

```bash
bunx supabase link --project-ref pcbakmokevyrpiqvbzni
bun run seed:staging-templates
bun run verify:staging-templates
```

Both staging scripts fail closed for every other Supabase ref. The apply command
uses only `supabase/seeds/template-showcases`; it never runs the full local seed
or writes `public_profiles` directly.

### Admin analytics tools

- **Lifecycle** (`/admin/lifecycle`): audits automated owner emails and delivery
  preferences. Delivery runs through `/api/cron/lifecycle`; data uses the
  `get_lifecycle_*` RPCs. See [lifecycle operator audit](docs/product/lifecycle-operator-audit.md).
- **Funnel** (`/admin/funnel`): shows how registration cohorts progress through
  verification, onboarding, publishing, views, and outbound actions. Data uses
  `get_admin_platform_funnel`. See [admin platform funnel](docs/admin-platform-funnel.md).

## Verification

Run the checks with Bun:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

End-to-end tests run against a production build started by Playwright:

```bash
bun run e2e:install
bun run e2e
```

`bun run e2e:install` installs the Chromium build paired with the exact `@playwright/test` version pinned by the project. In Linux CI, install the browser and its system dependencies with:

```bash
bunx playwright install --with-deps chromium
```

Use `PLAYWRIGHT_BASE_URL` to run the end-to-end suite against an already-running environment.
