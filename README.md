This is a [Next.js](https://nextjs.org) application using [Bun](https://bun.sh/) as its package manager and script runner.

## Development

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Local Supabase accounts

A local database reset seeds two confirmed development-only accounts:

| Account | Email                   | Password             | Username     | Role / subscription |
| ------- | ----------------------- | -------------------- | ------------ | ------------------- |
| Pro     | `pro@dentalbio.local`   | `DentalBioPro123!`   | `pro-user`   | `user` / `PRO`      |
| Admin   | `admin@dentalbio.local` | `DentalBioAdmin123!` | `admin-user` | `admin` / none      |

Reset and verify these fixtures only against the local Supabase stack:

```bash
bunx supabase db reset --local
bun scripts/verify-local-seed.ts
```

These credentials are public test fixtures, not secrets. The seed is intended
only for local development: never apply `supabase/seed.sql` to a linked or
remote project, and never use `--include-seed` in a production deployment.

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
