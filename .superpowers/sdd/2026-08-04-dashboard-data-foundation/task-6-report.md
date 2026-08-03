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

## Fix round 4

### Historical path and RED evidence

Repository history before base `9018cc3` identifies the existing activation path: paid plans rendered a warning-style semantic `FullRoundedButton` labelled `Cancel Current Plan`, whose click set `isOpenDowngradeConfirmMessage` to `true`. The control was later commented out while its confirmation state and handler remained.

The required trigger test was written before the production restoration and run with:

`/Users/ramezweissa/.bun/bin/bun test app/dashboard/components/Sidebar.downgrade.test.tsx --preload ./test/setup.ts`

RED title and output: `Sidebar subscription downgrade > opens the downgrade confirmation from the paid-plan control` failed with `Unable to find an accessible element with the role "button" and name "Cancel Current Plan"` (`0 pass, 1 fail`). After restoring the historical paid-only `FullRoundedButton`, the same command passed.

Existing behavior tests were mutation-checked before the final GREEN run:

- `/Users/ramezweissa/.bun/bin/bun test app/dashboard/components/Sidebar.expiry.test.tsx --preload ./test/setup.ts -t 'does not update an already-FREE subscription'` failed after temporarily removing the FREE guard: expected 0 update calls, received 1.
- `/Users/ramezweissa/.bun/bin/bun test app/dashboard/components/RightPanel.behavior.test.tsx --preload ./test/setup.ts -t 'refreshes only after the branding PUT succeeds'` failed after temporarily moving refresh before PUT resolution: expected 0 refresh calls, received 1.
- `/Users/ramezweissa/.bun/bin/bun test app/dashboard/settings/SettingsForm.behavior.test.tsx --preload ./test/setup.ts -t 'awaits the successful save before refreshing'` failed after temporarily moving refresh before update resolution: expected 0 refresh calls, received 1.

Every mutation was restored immediately and is absent from commit `ed4881b6f539b9ae313af3e7ecd70105f3c69475`.

### GREEN titles and output

Each new mock-owning file was run in its own Bun process:

- `Sidebar subscription downgrade > opens the downgrade confirmation from the paid-plan control`
- `Sidebar subscription downgrade > cancels without deleting the subscription`
- `Sidebar subscription downgrade > refreshes only after the authoritative downgrade resolves`
- `Sidebar subscription downgrade > keeps the confirmation open and does not refresh when downgrade fails`
- `Sidebar expired subscription reconciliation > attempts one FREE update under StrictMode and rerender`
- `Sidebar expired subscription reconciliation > does not update an already-FREE subscription`
- `Sidebar expired subscription reconciliation > refreshes only after a successful FREE update resolves`
- `Sidebar expired subscription reconciliation > does not refresh or retry-loop after a failed FREE update`
- `Sidebar expired subscription reconciliation > preserves the six-month student message`
- `RightPanel server seed and branding mutation > renders the server-seeded preview shell and branding state`
- `RightPanel server seed and branding mutation > refreshes only after the branding PUT succeeds`
- `RightPanel server seed and branding mutation > restores the server branding state and does not refresh when PUT fails`
- `SettingsForm server seed and save mutation > renders the server-seeded settings values`
- `SettingsForm server seed and save mutation > awaits the successful save before refreshing`
- `SettingsForm server seed and save mutation > preserves edited values and does not refresh when save fails`

Focused output: 15 pass, 0 fail. The complete Task 6 inventory was then run as thirteen isolated per-file Bun processes: 45 pass, 0 fail. This process boundary is required because Bun module mocks are process-wide. For comparison, the monolithic directory command reported 42 pass and one cross-file `next/navigation` mock-loading error in `SettingsForm.behavior.test.tsx`; the same file passes 3/3 in isolation.

Fresh verification after restoring all mutations:

- `/Users/ramezweissa/.bun/bin/bun run typecheck` — pass.
- touched `/Users/ramezweissa/.bun/bin/bunx prettier --check ...` — all matched files use Prettier style.
- touched ESLint — 0 errors, 4 pre-existing hook/image warnings in `Sidebar.tsx` and `RightPanelClient.tsx`.
- `git diff --check` — pass.

### Changes, commit, and self-review

Commit `ed4881b6f539b9ae313af3e7ecd70105f3c69475` (`fix(dashboard): restore mutation interaction parity`) restores the historical paid-plan cancellation control, preserves the accessible confirmation/cancel flow, makes the branding control a native button, and rolls optimistic branding presentation back to the server seed on PUT failure. Settings already awaited its reauthorized Supabase update and now has direct regression coverage.

No owner-profile conversion analytics were added: cancellation, branding, and settings are existing dashboard/editor controls covered by the documented analytics exclusion. The tests exercise real components and observable UI state, with only network, router, and Supabase boundaries mocked. The informational Bug story `Restore paid-plan cancellation and reliable dashboard saves` remains in `Backlog` pending lead verification and was uniquely read back with one Medium priority and Bug label: https://trello.com/c/5HoOyeJa/112-restore-paid-plan-cancellation-and-reliable-dashboard-saves.

Concern: no pull request exists yet for the parent Phase 6 branch, so the Trello story contains the fixing commit and branch links plus an explicit instruction to add the PR URL when the parent integration PR is opened. The card has not been marked complete or moved to `Done 🎉`; lead review remains required. The pre-existing `dashboard-shell-props.test.tsx` emits React `act` warnings when run alone; the new isolated files have clean output.
