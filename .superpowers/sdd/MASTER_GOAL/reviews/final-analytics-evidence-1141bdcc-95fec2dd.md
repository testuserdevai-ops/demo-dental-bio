# Independent review: final timing and analytics evidence

## Scope

- Reviewed exact delta `1141bdcc..95fec2dd` (`1e504f74`, `95fec2dd`).
- Files changed: `app/components/Card/BaseCard.test.tsx`, `app/register/page.test.tsx`, and `e2e/public-profile-analytics.spec.ts`.
- Read the production/default transport selection, tracked-link click ordering, public profile view tracker, server-verified render-context resolution, and legacy public link counter implementation to validate what the E2E assertions actually prove.
- No source, git, port, database, Trello, PR, or tracker changes were made as part of this review.

## Verdict

**PASS — no Medium-or-higher findings.**

## Findings and reasoning

### Timing changes are narrow and do not weaken behavior assertions

- `BaseCard.test.tsx` changes only the containing test's timeout from the Bun default to 10 seconds. No interaction or assertion was removed or relaxed. In the focused run, the success-path test took approximately 4.97 seconds, placing it directly on the default five-second boundary and substantively justifying the extra margin under full-suite load.
- `register/page.test.tsx` changes only the Testing Library wait bound for the OTP field from 5 to 10 seconds. The enclosing test already had a 10-second bound, and all concurrency, disabled-state, request-count, and ticket-flow assertions remain intact. This is a localized loaded-render allowance rather than a blanket suite timeout.

### Disabled controlled analytics and preserved legacy behavior are meaningfully evidenced

- The E2E expectation was corrected from requiring `profile_view` and `link_click` endpoint traffic to requiring an empty controlled-action inventory. This matches `AnalyticsProvider`, whose default is unconditionally `DisabledAnalyticsTransport`; an active keepalive transport is available only through explicit injection.
- The production public-profile route does not inject a transport. Therefore public and authenticated-preview visits exercise the disabled default, while focused provider tests separately prove both default-disabled behavior and explicit test-only transport injection.
- The E2E route is installed before the public page navigation, so it observes both the mount-time `profile_view` opportunity and the tracked public-link activation opportunity. The test performs additional page interaction before clearing the inventory for preview, providing ample browser task progression rather than checking only at initial render.
- `legacyCounterRequests === 1` after keyboard activation is an independent positive control: it proves the public link handler actually ran and that the public render context still permits the separate legacy `/api/links/click` adapter, while the controlled `/api/analytics/**` inventory remains empty.
- The authenticated `?analyticsContext=preview` visit then proves the inverse legacy policy (`0` link-counter requests) and again proves no controlled request. The preview state is server-verified against the logged-in owner; the query parameter alone is not trusted.
- Native anchor `href`, `target`, `rel`, keyboard focus/Enter activation, share-dialog semantics, and axe assertions remain unchanged. The expectation update therefore corrects the transport contract without weakening navigation or accessibility coverage.

## Verification

- `bun test app/components/Card/BaseCard.test.tsx app/register/page.test.tsx app/contexts/AnalyticsProductionTransport.test.tsx app/components/analytics/TrackedAction.test.tsx lib/analytics/transport.test.ts --preload ./test/setup.ts --isolate`
  - **32 passed, 0 failed, 117 assertions**.
- `bunx prettier --check app/components/Card/BaseCard.test.tsx app/register/page.test.tsx e2e/public-profile-analytics.spec.ts`
  - **PASS**.
- `bunx eslint app/components/Card/BaseCard.test.tsx app/register/page.test.tsx e2e/public-profile-analytics.spec.ts`
  - **PASS**.
- `bunx playwright test e2e/public-profile-analytics.spec.ts --project=chromium --list`
  - **PASS**, exact Chromium test discovered together with required dashboard setup (2 tests in 2 files).

The E2E was discovery-checked only, consistent with the review assignment's prohibition on starting or changing ports/databases; final runtime execution remains part of the master agent's integrated gate.
