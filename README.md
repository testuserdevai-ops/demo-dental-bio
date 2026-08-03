This is a [Next.js](https://nextjs.org) application using [Bun](https://bun.sh/) as its package manager and script runner.

## Development

Install dependencies and start the development server:

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
