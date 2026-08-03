# Referral and Phase 6 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the referral invitation form, close every remaining ordinary dashboard form/data ownership row, and produce the complete local verification, performance, documentation, PR, and Trello evidence for Phase 6.

**Architecture:** Referral view data is server-derived and immutable for the mounted page, so it remains a small Server Component seed rather than forcing a Query cache with no refetch lifecycle. RHF submits only an invitee email to a target-bound Action; sender identity, referral URL, plan, and brand/domain come from authorized server state. Completion uses static inventories plus full local verification to prove all ordinary forms have one owner and every specialized defer is explicit.

**Tech Stack:** Next.js Server Components/Actions, RHF/Zod, ActionResult/Sonner, local email/provider test boundary, Bun/Playwright/axe, Supabase CLI, Trello API.

## Global Constraints

- Stack on the reviewed products/locations PR.
- Do not migrate settings/custom domain, verification/Veriff, subscription/billing, or admin forms; keep each explicit in the matrix.
- Referral email and message/provider values are never analytics payloads. Dashboard copy/invite controls remain conversion-analytics excluded.
- Never send a real email or use production providers/data during tests.
- Completion claims require current command output, not historical Phase 5 evidence.

---

### Task 1: Define referral schema, server view, and authorized invite Action

**Files:**

- Create: `app/dashboard/referral/_lib/schemas.ts`
- Create: `app/dashboard/referral/_lib/schemas.test.ts`
- Create: `app/dashboard/referral/_lib/queries.ts`
- Create: `app/dashboard/referral/_lib/queries.test.ts`
- Create: `app/dashboard/referral/_lib/actions.ts`
- Create: `app/dashboard/referral/_lib/actions.test.ts`
- Modify/remove same-app POST: `app/api/invite/route.ts`

**Interfaces:**

```ts
export type ReferralViewModel = {
  referralUrl: string;
  senderDisplayName: string;
  canInvite: boolean;
};
export const referralInviteSchema = z
  .object({ email: z.string().trim().toLowerCase().email() })
  .strict();
export async function getReferralViewModel(
  scope: DashboardScope,
): Promise<ReferralViewModel>;
export async function sendReferralInvite(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>>;
```

- [ ] **Step 1: Write failing strict schema tests**

Valid email normalizes. Invalid/blank/oversized email and extra `name`, `referralLink`, `userId`, `role`, `plan`, or arbitrary fields fail.

- [ ] **Step 2: Write failing query tests**

Referral URL uses the authorized effective user's username and server domain config; sender display name and entitlement come from server records; custom/query input cannot choose them; no Query key/cache is created because the view has no mounted refetch/mutation-owned record lifecycle.

- [ ] **Step 3: Write failing Action tests**

Malformed input before provider, unauthenticated, ordinary forged target, admin existing target, entitlement failure, provider failure safe message, success, and proof that submitted sender/link/message values cannot reach provider dependencies.

- [ ] **Step 4: Implement server-only view and Action**

Resolve scope every call, parse strict schema, derive brand-safe referral URL/name, call the injected email provider with controlled template data, and return ActionResult. Keep any demonstrated public GET redirect in `/api/invite`; remove POST after `rg` proves no other HTTP consumer.

- [ ] **Step 5: Run and commit referral boundary**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/referral/_lib --preload ./test/setup.ts
git add app/dashboard/referral/_lib app/api/invite
git commit -m "feat(referral): authorize invitation form data"
```

### Task 2: Migrate referral RHF form and native copy feedback

**Files:**

- Create: `app/dashboard/referral/_components/ReferralManager.tsx`
- Create: `app/dashboard/referral/_components/ReferralManager.test.tsx`
- Create: `app/dashboard/referral/_components/InviteEmailForm.tsx`
- Create: `app/dashboard/referral/_components/InviteEmailForm.test.tsx`
- Create: `app/dashboard/referral/_components/ReferralCopyButton.tsx`
- Create: `app/dashboard/referral/_components/ReferralCopyButton.test.tsx`
- Modify: `app/dashboard/referral/page.tsx`
- Delete after parity: `app/dashboard/referral/InviteEmailForm.tsx`
- Retire/adapt after parity: `app/dashboard/referral/ReferralButton.tsx`

- [ ] **Step 1: Write failing RHF pending/error/success tests**

Client/server errors preserve email and focus field/one Alert; pending prevents duplicates; provider failure has no success toast/reset; success awaits Action, then resets and shows one Sonner confirmation.

- [ ] **Step 2: Write failing copy semantics tests**

Native button supports keyboard, copies the server-derived read-only URL, reports clipboard success only after resolution, preserves a manual-select fallback on failure, and emits no public analytics descriptor.

- [ ] **Step 3: Implement minimal forms without Query/local server copies**

Page passes immutable `ReferralViewModel`. RHF owns email; local state owns only clipboard feedback. No name/link is included in the Action DTO.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/referral --preload ./test/setup.ts
! rg -n 'apiClient\.post\("/api/invite"|createClient\(|\.from\(' app/dashboard/referral --glob '*.{ts,tsx}'
git add app/dashboard/referral
git commit -m "refactor(referral): migrate invite and copy controls"
```

### Task 3: Close the ordinary dashboard form/data inventory

**Files:**

- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/frontend-modernization.md`
- Modify: `docs/testing/dashboard-e2e-coverage.md`

- [ ] **Step 1: Run the residual form/transport inventory**

```bash
rg -n '<form|useForm\(|onSubmit=|action=' app/dashboard --glob '*.tsx'
rg -n 'createBrowserSupabaseClient|createClient\(|\.from\(|apiClient\.(post|put|delete)|fetch\(' app/dashboard --glob '*.{ts,tsx}'
rg -n 'useState<.*\[\]|set[A-Za-z]+\(data|/api/update-order|DashboardUserContext|/api/user' app/dashboard app/contexts e2e --glob '*.{ts,tsx}'
```

- [ ] **Step 2: Classify every residual exact path**

Each match is one of: documented auth lifecycle; documented feature Storage upload; completed Phase 6 Query/Action boundary; semantic non-data form wrapper removed; or explicit Phase 8 settings/domain, Veriff, subscription, or admin defer. No ordinary content form may remain unclassified.

- [ ] **Step 3: Add any missed ordinary form as a focused TDD mini-slice**

For each missed ordinary form, add its strict schema/action/component test, run red, implement RHF/server parse/ActionResult/narrow ownership, run green, and update the same matrix row. Do not use a generic abstraction or defer it silently.

- [ ] **Step 4: Verify public-cache matrix completeness without runtime caching**

Every profile/content mutation row has immutable `public-profile:<profileId>` plus exact entity-family/entity-ID future tags. Search proves no new `revalidateTag`, `unstable_cache`, `cacheTag`, or production public cache path was introduced.

- [ ] **Step 5: Commit inventory closure**

```bash
git add docs app/dashboard
git commit -m "docs: close dashboard form ownership matrix"
```

### Task 4: Extend referral E2E and final critical accessibility coverage

**Files:**

- Modify: `e2e/dashboard/referral.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: relevant existing feature specs only for residual verified gaps.

- [ ] **Step 1: Add local-only referral success/failure E2E**

Intercept or use the local mail provider only. Verify server-derived URL, email validation, controlled provider failure retains value, success resets, duplicate pending blocked, copy keyboard success/failure fallback, and no production request.

- [ ] **Step 2: Add referral critical axe check if changed controls require it**

Scan the route without filtering. Fix only Phase 6 regressions in labels, error references/focus, button semantics, or status feedback.

- [ ] **Step 3: Run focused browser checks**

```bash
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/referral.spec.ts e2e/accessibility.spec.ts --project=chromium
```

- [ ] **Step 4: Commit E2E evidence**

```bash
git add e2e docs/testing/dashboard-e2e-coverage.md
git commit -m "test: cover referral and final dashboard semantics"
```

### Task 5: Run clean database, full repository, build, Playwright, axe, and performance verification

**Files:**

- Modify: `docs/frontend-modernization.md`
- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/superpowers/specs/2026-08-04-dashboard-data-ownership-design.md` only for actual verified deviations.

- [ ] **Step 1: Run touched-file formatting and whitespace checks**

Build the exact touched-file list from `git diff --name-only <Phase5-base>...HEAD` and pass only supported text/code files to Prettier; do not run repository-wide formatting.

```bash
git diff --check
```

- [ ] **Step 2: Reset/verify local Supabase and generated types**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase migration list --local
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > /tmp/dentalbio-phase6-database.types.ts
cmp /tmp/dentalbio-phase6-database.types.ts lib/supabase/database.types.ts
git ls-files 'supabase/migrations/*.sql' 'supabase/tests/*.sql'
```

Expected: clean reset; all migrations tracked; anonymous/owner/cross-user/admin and atomic tests pass; generated types are canonical; advisors/lint have no unresolved introduced issue.

- [ ] **Step 3: Run complete application verification in order**

```bash
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bun run e2e
```

Expected: all unit/component tests pass; non-incremental typecheck passes; lint has zero errors/no warning growth; production build succeeds; all Playwright and axe checks pass. Invoke systematic-debugging for any failure; do not loop or suppress.

- [ ] **Step 4: Record route/bundle/performance comparison**

Capture shared JS, middleware, `/dashboard`, and every changed dashboard route from build output. Compare with Phase 2 values and Phase 5 evidence; report deltas and explanation without raising a new budget or hiding regressions.

- [ ] **Step 5: Request final code review and re-verify after fixes**

Use `superpowers:requesting-code-review`; review every delegated result; resolve findings with TDD; rerun affected focused checks, then use `superpowers:verification-before-completion` and rerun the full required gate from fresh output.

### Task 6: Finalize stacked PRs, Trello, and Phase 6 handoff

**Files:**

- Modify: Phase 6 docs with final commits/PRs/verification/rollback/deployment order.

- [ ] **Step 1: Ensure every stacked PR is independently testable and linked**

Each PR description states base/dependency, scope, migrations/deployment order, verification, public/analytics preservation, rollback, and exclusions. Do not merge or retarget silently; explicitly stack unresolved dependencies.

- [ ] **Step 2: Update the Phase 6 Trello card and checklist**

Add every PR URL and review/completion state to card 110. Check only verified checklist items. Keep classification exactly High priority and Bug false. Location race has its separate verified Bug card with exactly one priority and Done only after evidence.

- [ ] **Step 3: Read back and verify Trello uniqueness/state**

Use the bundled Trello client plus checklist read-back to verify exactly one Phase 6 title, Dev/review/completion list appropriate to actual state, exactly one High priority label, no Bug label, complete description, all PR references, and all expected checklist items/states.

- [ ] **Step 4: Commit final evidence and mark goal complete only when nothing remains**

```bash
git add docs
git commit -m "docs: complete dashboard data modernization phase"
```

Only after all ordinary forms, PRs, verification, and Trello evidence are complete may the active goal be marked complete.
