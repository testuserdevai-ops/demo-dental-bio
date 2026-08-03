# Task 4 report: server-only dashboard identity

## RED evidence

`/Users/ramezweissa/.bun/bin/bun test lib/dashboard/identity.test.ts --preload ./test/setup.ts` failed before production code existed with `Cannot find module './identity'` and `0 pass, 1 fail, 1 error`.

## GREEN evidence

The focused identity test then passed all nine cases: missing/invalid authentication, immutable actor lookup, ordinary self scope, malformed and forbidden targets, database-authorized existing and missing admin targets, missing dentistry, and exact minimal serialized scope. A Bun module-mocking ordering failure was traced to static-import hoisting before `mock.module("server-only")`; the test now follows the existing mock-then-dynamic-import pattern.

## Caller inventory

`getEffectiveUserId` remains required by the dashboard client/layout and older dashboard routes, seven subscription/dentistry API routes, `/api/user`, and `app/upgrade/PricingTable.tsx`. It cannot delegate to this server-only resolver while browser consumers remain.

`getAuthorizedUser` currently has only dashboard-page consumers: blog, domain, gallery, settings, shop, subscription, verification, and video. Their shell/context parity migration is assigned to Task 6, so this task leaves the compatibility helper in place rather than creating an overlapping scope/context migration.

## Files and self-review

Created `lib/dashboard/types.ts`, `lib/dashboard/identity.ts`, and `lib/dashboard/identity.test.ts`. The resolver imports `server-only`, uses only the typed cookie-bound server Supabase client, gets fresh auth identity with `auth.getUser()`, resolves role from the immutable user-row ID, validates UUID targets, never uses a service-role client, and serializes only `effectiveUserId`, `dentistryId`, `username`, plus presentation-only shell fields. No `any` is introduced.

## Verification

- `/Users/ramezweissa/.bun/bin/bun test lib/dashboard utils/user --preload ./test/setup.ts`
- `/Users/ramezweissa/.bun/bin/bun run typecheck`
- `prettier --write` on all three touched TypeScript files
- `git diff --check`

## Commit

`ddb16b1 feat(auth): resolve dashboard scope on the server`

## Concerns

The pre-existing client authorization effect and mutable dashboard context remain until their Task 6 server-seeded replacement. Existing compatibility helpers deliberately preserve their current redirect behavior for non-dashboard and browser callers.
