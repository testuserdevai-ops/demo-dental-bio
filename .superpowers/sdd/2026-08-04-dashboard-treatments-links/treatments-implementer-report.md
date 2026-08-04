# Treatments implementer report

## Delivered

- Server-only treatment aggregate, strict action schemas, scoped query key, and GET-only refetch boundary.
- Reauthorized typed atomic treatment Actions and Query-owned mutation/cache behavior.
- RHF create form, Query-derived lists, confirmed deletion, keyboard move controls with polite one-based announcements, and full mixed-kind reorder reconstruction.
- Browser treatment CRUD removed. Dashboard controls remain excluded from public-profile conversion analytics.

## Verification

- `bun test app/dashboard/treatments app/api/treatments --preload ./test/setup.ts` — 14 passing.
- `npx tsc --noEmit --pretty false` — passing.
- `npx eslint app/dashboard/treatments app/api/treatments --max-warnings=0` — passing.
- Browser CRUD guard and Prettier/diff checks — passing.

## Scope notes

- No migration, SQL test, generated type, shared provider, analytics, or package files were changed.
- E2E and migration/cache matrix updates deferred to the root PR boundary at the speed directive.
