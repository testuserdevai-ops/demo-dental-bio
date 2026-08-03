# Task 5 report: dashboard Query foundation

## RED evidence

`/Users/ramezweissa/.bun/bin/bun test lib/query app/dashboard/_components/DashboardQueryProvider.test.tsx --preload ./test/setup.ts` failed before production implementation existed with the intended missing-module errors for `./client` and `./DashboardQueryProvider` (`0 pass, 2 fail, 2 errors`).

## GREEN evidence

The focused run passes all seven tests. It verifies the 30-second stale time, 10-minute garbage collection, focus/reconnect policy, exactly one network or controlled 5xx retry, no controlled 4xx/action-validation retry, global mutation retry/throw behavior, and per-mount provider-client lifetime.

## Files and self-review

Created `lib/query/client.ts`, `lib/query/errors.ts`, `lib/query/client.test.ts`, `app/dashboard/_components/DashboardQueryProvider.tsx`, and `app/dashboard/_components/DashboardQueryProvider.test.tsx`; updated `app/dashboard/layout.tsx`. The factory has no global singleton or auth/user state. `DashboardQueryProvider` accepts children only and creates one `QueryClient` with `useState` for each mount. It wraps only `DashboardClientLayout` and route content; Sidebar, MobileNavbar, RightPanel, and `DashboardUserProvider` stay outside Query.

## Verification

- `/Users/ramezweissa/.bun/bin/bun test lib/query app/dashboard/_components/DashboardQueryProvider.test.tsx --preload ./test/setup.ts` — 7 pass, 0 fail
- `/Users/ramezweissa/.bun/bin/bun run typecheck` — pass
- `prettier --check` on all six implementation/test/layout files — pass
- `git diff --check` — pass

## Commit

`feat(query): scope dashboard server-state provider`

## Concerns

No concerns. Feature-level consumers must wrap controlled action failures in `DashboardQueryError` to preserve the documented 4xx/5xx retry classification.
