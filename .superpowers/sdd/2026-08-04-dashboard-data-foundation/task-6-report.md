# Task 6 report: dashboard identity ownership cutover

## RED evidence

`bun test app/contexts/DashboardScopeContext.test.tsx app/dashboard/dashboard-identity-ownership.test.ts --preload ./test/setup.ts` failed before implementation: `DashboardScopeContext` did not exist, the old `DashboardUserContext` contained the POST `/api/user` read, and the dashboard fixture waited for that POST.

The specialized admin-read TDD test also failed before implementation because `lib/dashboard/admin-user-read.ts` did not exist. It defines the required anonymous, ordinary-user, malformed-target, and DTO-redaction behavior.

## GREEN evidence

Dashboard layout now resolves the identity once on the server, treating `x-next-url`/`next-url` only as untrusted transport for an optional target hint. `resolveDashboardIdentity` validates that hint against server-owned authenticated identity and role; its focused tests prove malformed hints and ordinary cross-user requests cannot become scope while an authorized admin target can.

`DashboardScopeProvider` exposes exactly the immutable `effectiveUserId`, `dentistryId`, and `username` seed. Shell components receive only `DashboardShellViewModel` props. The old client authorization effect and mutable `DashboardUserContext` are removed; Query remains around route content only. Settings and branding await their mutations and call `router.refresh()` rather than mutating the prior client user object. Verification presentation derives from server data.

The dashboard fixture now waits for the rendered Settings landmark. The generic `/api/user` route has only PUT (branding) and DELETE (admin delete) writes. Admin dashboard reads moved to `GET /api/admin/user`: it requires an authenticated `admin`, validates an optional UUID target, returns a restricted DTO, and has focused negative coverage. `AdminVerificationPanel` and `UsersManagement` no longer POST to `/api/user`.

## Method and consumer inventory

- `POST /api/user`: removed. Former dashboard context, admin verification panel, and admin user-management reads are migrated.
- `PUT /api/user`: `RightPanelClient` branding preference mutation; `withAuth` reauthorizes and client refreshes server presentation.
- `DELETE /api/user`: `UsersManagement` admin deletion; retained as the existing separately authorized write.
- `GET /api/admin/user`: `AdminVerificationPanel` target presentation and `UsersManagement` actor-role read; restricted DTO and admin authorization.

## Verification

- `/Users/ramezweissa/.bun/bin/bun test lib/dashboard app/contexts app/dashboard/components app/dashboard/settings app/dashboard/verification app/dashboard/dashboard-identity-ownership.test.ts --preload ./test/setup.ts` — 29 pass, 0 fail.
- `/Users/ramezweissa/.bun/bin/bun run typecheck` — pass.
- `prettier --write` on touched files and `git diff --check` — pass.
- Named Playwright navigation flow attempted against the existing port-3000 listener (PID 74350), but Playwright's configured `webServer` failed before tests because `/bin/sh` could not resolve `bun` from PATH. No server was restarted or modified.

## Self-review and concerns

No owner-profile conversion analytics were added: these remain dashboard/editor controls. The header is not an authority source; authorization still occurs only in the server identity resolver. The request URL header name is framework transport-dependent; the attempted E2E could not verify its availability in this environment because Playwright could not start its configured web server.

## Fix round 1

### RED/GREEN

The new immutable-scope test failed first because the provider exposed the mutable seed (`Object.isFrozen` returned false). The admin DTO redaction test also failed because email remained serialized. Both are now green: scope fields are readonly and the provider freezes one stable copy; admin reads no longer select or return email.

The full focused run passes 27 tests and typecheck passes. Real render coverage verifies the prior student six-month message, paid mobile navigation, and server-derived verification presentation.

### Changes and self-review

Server shell presentation now includes only the historical trial/student display values needed by Sidebar. Expired trial and subscription periods reconcile the existing FREE update then refresh server presentation; successful downgrades refresh after the authoritative DELETE. Dashboard target parsing is centralized in `lib/dashboard/target.ts`, and both layout and verification route unauthorized/malformed resolver failures to login. The resolver remains the authority boundary and existing identity tests cover malformed, ordinary cross-user, and authorized-admin target outcomes.

The focused tests intentionally use complete navigation mocks because Bun test module mocks are process-wide; this avoids unrelated test modules dropping `usePathname`/`useSearchParams` exports.

## Fix round 2

Verification now consumes immutable layout-seeded scope/shell/target presentation and no longer independently parses a page query or resolves identity. Invalid URL transport throws into the layout's existing controlled redirect. Sidebar reconciliation is gated for FREE state and per-mount execution.

## Fix round 3 status

Focused existing scope/shell/identity/admin tests pass (16 pass) and typecheck/diff check pass. The requested downgrade interaction cannot currently be reached from Sidebar: `isOpenDowngradeConfirmMessage` has no activating control, so a real UI test cannot exercise its `onOk` path without first introducing a product interaction not authorized by this test-only round. The remaining isolated interaction tests were not completed.
