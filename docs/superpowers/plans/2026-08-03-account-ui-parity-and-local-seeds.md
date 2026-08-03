# Account UI Parity and Local Seeds Implementation Plan

> **For Codex:** Execute this plan with the `superpowers:subagent-driven-development` workflow. Keep implementation ownership non-overlapping and review every delegated diff before integration.

**Goal:** Restore registration calendar/copy parity, explain the existing login lockout, and make local Supabase resets produce stable Pro and admin accounts.

**Architecture:** Add one reusable owned shadcn-style Calendar primitive under `app/components/ui`, keep registration policy in its route-private component, and extract duplicated login lockout state into a shared auth hook. Seed only local Supabase Auth/profile data through the already configured `supabase/seed.sql` path. Account-entry interactions remain outside public-profile analytics.

**Tech stack:** Next.js App Router, React 19, TypeScript, React Hook Form, Radix/shadcn owned primitives, react-day-picker, date-fns, Bun test, Testing Library, Playwright, Supabase CLI/Postgres.

---

## Task 1: Restore the registration availability message

**Files:**

- Modify: `app/register/page.test.tsx`
- Modify: `app/register/page.tsx`

1. Add a component test that renders the details step and expects `Congratulations!`, the brand-aware `dental.bio/dr-ada` address, `is available, make it yours:`, and the `Almost there` heading.
2. Run `bun test app/register/page.test.tsx --preload ./test/setup.ts` and confirm the new assertions fail because the copy is absent.
3. Add a small semantic availability-header component in `app/register/page.tsx`; derive the displayed address from `domainConfig.domain` and the normalized query username, use responsive wrapping/spacing, and render it only on the details step.
4. Re-run the focused test and confirm it passes.
5. Run `bunx prettier --write app/register/page.tsx app/register/page.test.tsx` and `git diff --check`.

## Task 2: Add an owned shadcn Calendar and restore the birthday popup

**Files:**

- Create: `app/components/ui/calendar.tsx`
- Create: `app/components/ui/calendar.test.tsx`
- Modify: `app/register/_components/DateOfBirthField.tsx`
- Modify: `app/register/page.test.tsx`

1. Add focused tests for the primitive's accessible grid/day behavior and registration tests for the named calendar trigger, Dialog title/description, adult cutoff, selecting a day into `DD/MM/YYYY`, Escape close/focus restoration, and continued manual/paste input.
2. Run the two focused test files and confirm the new behavior fails before implementation.
3. Implement the project-owned shadcn-style `Calendar` wrapper using react-day-picker v9, Phosphor navigation icons, `cn`, existing tokens, and consumer-supplied selection policy. Do not import global third-party CSS.
4. Compose Calendar inside the existing owned `Dialog` in `DateOfBirthField`; calculate the 18-year cutoff and 100-year range in route-private code, keep the text input editable, and close/focus the trigger after selection or cancellation.
5. Re-run focused tests, typecheck, Prettier, and `git diff --check`.
6. Commit Tasks 1–2 together as `fix(register): restore availability message and calendar` because they form one user-reported registration regression and one Trello story.

## Task 3: Explain login lockouts consistently

**Files:**

- Create: `app/components/auth/use-login-lockout.ts`
- Create: `app/components/auth/use-login-lockout.test.tsx`
- Modify: `app/login/page.test.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/admin-login/page.test.tsx`
- Modify: `app/admin-login/page.tsx`

1. Add fake-time/component tests proving that the third failed attempt immediately shows `Please wait before trying again`, visible remaining seconds, and a `Try again in N seconds` disabled button; cover reload restoration, expiry cleanup, and preserved form values for both routes.
2. Run the focused auth tests and confirm they fail for missing feedback/countdown.
3. Extract only attempts, persisted lockout end, second-resolution countdown, reset, and failure recording to a shared client hook. Keep current storage keys/policy and generic server messages.
4. Render the lockout Alert ahead of the generic error, focus it once when lockout begins/restores, update the visible countdown without repeated focus announcements, and restore `Log In` at zero.
5. Re-run focused tests, typecheck, Prettier, and `git diff --check`.
6. Commit as `fix(auth): explain temporary login lockouts`.

## Task 4: Seed stable local Pro and admin accounts

**Files:**

- Create: `supabase/seed.sql`
- Create: `scripts/verify-local-seed.ts`
- Modify: `README.md`

1. Add a verifier that authenticates the documented Pro/admin credentials against local Supabase Auth and asserts the expected `public.users` username, role, and subscription status. Confirm it fails while the seed is absent.
2. Create fixed confirmed `auth.users` and email `auth.identities` records with bcrypt password hashes and safe metadata. Let the existing trigger create public profiles, then set the Pro entitlement and admin role. Keep the SQL idempotent and local-only.
3. Document the two credentials and the local-only safety boundary in README.
4. Run `bunx supabase db reset --local`, then run the verifier and direct SQL assertions. Never target a linked/remote project.
5. Run Prettier where applicable and `git diff --check`. Force-add `supabase/seed.sql` because the repository globally ignores SQL files.
6. Commit as `fix(dev): seed local pro and admin accounts`.

## Task 5: Record repository workflow and extend E2E coverage

**Files:**

- Modify: `AGENTS.md`
- Modify: `e2e/account-entry.spec.ts`

1. Add a concise instruction requiring one verified Trello Bug story for each bug fix, exactly one priority, `Done 🎉` only after verification, and commit/PR links.
2. Extend Playwright coverage for registration availability copy, opening/selecting the shadcn calendar by keyboard, and visible login lockout countdown/expiry. Use route/action stubs where repeated real authentication failures would be unreliable or trigger external limits.
3. Run the focused E2E spec and axe coverage, then format and check the diff.
4. Commit as `test(account): cover restored registration and lockout UX`.

## Task 6: Integrate, verify, and document delivery

1. Review every delegated diff for Next.js placement, shadcn ownership, semantic accessibility, date/time boundary correctness, auth information disclosure, seed safety, formatting, and obsolete duplication.
2. Run focused tests, full `bun test app lib utils --preload ./test/setup.ts`, `bun run typecheck`, `bun run lint`, `bun run build`, full `bun run e2e`, axe checks, and a final clean local Supabase reset plus seed verifier.
3. Inspect the working tree and commit only explicit remaining files; do not use `git add -A`.
4. Push `codex/frontend-modernization-05-account-forms` and update PR #7 with the decisions, user-visible changes, verification evidence, accessibility notes, local-seed boundary, risks, and screenshots.
5. Through `$trello-api`, create or update exactly one plain-language Bug card in `Done 🎉` for each of the three regressions. Assign Medium/Medium/Low priorities respectively and include the exact fixing commit plus PR URL.
6. Read the board/cards back and verify uniqueness, list, exactly one priority, Bug label, description, commit link, and PR link.
