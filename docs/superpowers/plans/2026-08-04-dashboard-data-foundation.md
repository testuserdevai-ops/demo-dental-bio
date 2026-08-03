# Dashboard Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish correct owned primitives, canonical typed Supabase clients, secure server-seeded dashboard scope, and the smallest TanStack Query v5 provider before any Phase 6 content consumer migrates.

**Architecture:** The dashboard layout resolves actor/effective-user/dentistry on the server and passes only a read-only `DashboardScope` plus presentation shell data to client consumers. A route-content Query provider owns interactive remote content after server seeding; auth identity remains server/context-owned. The local database generates the only `Database` type, and a minimal migration protects user authority fields before effective-admin resolution becomes the shared mutation boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, TanStack React Query 5, Supabase JS/SSR 2.x, PostgreSQL 17/RLS, Bun test, Testing Library, Playwright.

## Global Constraints

- Work only in `/Users/ramezweissa/.codex/worktrees/phase6-dashboard-data/dentalbio` on `codex/frontend-modernization-06-dashboard-data`.
- Shared providers, Query infrastructure, Supabase factories/types, authorization helpers, design primitives, migrations, and documentation are lead-owned; do not delegate concurrent edits to them.
- Never use production credentials or data. Use the running local Supabase project only.
- Do not edit historical migrations. Create imperative migrations with the installed CLI, verify they are tracked despite global `*.sql` ignore, reset locally, and regenerate types.
- Preserve public output, auth/RLS behavior, admin effective-user behavior, uploads, ordering, and Phase 4 analytics IDs/positions.
- Query owns interactive dashboard server state only; auth, SSR public data, RHF buffers, overlays, URLs, and global client state remain outside Query.
- Dashboard/editor controls are excluded from public-profile conversion analytics; record the exclusion and do not add silent production tracking.
- Address only critical accessibility contracts required by this phase; defer non-critical remediation to Phase 8.

---

### Task 1: Fix disabled composed buttons and existing-only Field references

**Files:**

- Modify: `app/components/ui/button.tsx`
- Modify: `app/components/ui/field.tsx`
- Modify: `app/components/ui/button-field.test.tsx`

**Interfaces:**

- Consumes: existing `ButtonProps`, `Field`, `FieldDescription`, `FieldError`, and `useFieldControlProps` contracts.
- Produces: disabled/pending `Button asChild` content with no active navigation/click/keyboard/tab path; controls whose `aria-describedby` contains only rendered IDs.

- [ ] **Step 1: Add failing composed-button semantic tests**

```tsx
it("removes every action path from disabled asChild links", () => {
  const onClick = mock(() => undefined);
  render(
    <Button asChild disabled>
      <a href="/dashboard" onClick={onClick}>
        Open dashboard
      </a>
    </Button>,
  );
  const link = screen.getByText("Open dashboard");
  expect(link.getAttribute("href")).toBeNull();
  expect(link.getAttribute("aria-disabled")).toBe("true");
  expect(link.getAttribute("tabindex")).toBe("-1");
  fireEvent.click(link);
  fireEvent.keyDown(link, { key: "Enter" });
  expect(onClick).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add failing Field presence-combination tests**

```tsx
it("describes a control only with nodes that exist", () => {
  const view = render(
    <Field id="title">
      <FieldLabel>Title</FieldLabel>
      <Input />
    </Field>,
  );
  expect(
    screen.getByLabelText("Title").getAttribute("aria-describedby"),
  ).toBeNull();
  view.rerender(
    <Field id="title" invalid>
      <FieldLabel>Title</FieldLabel>
      <Input />
      <FieldError id="actual-error">Required</FieldError>
    </Field>,
  );
  expect(screen.getByLabelText("Title").getAttribute("aria-describedby")).toBe(
    "actual-error",
  );
});
```

Also test description-only, error-only, both, dynamic error removal, custom IDs, external `aria-describedby`, and duplicate-token elimination.

- [ ] **Step 3: Run the focused test and confirm semantic failures**

Run: `/Users/ramezweissa/.bun/bin/bun test app/components/ui/button-field.test.tsx --preload ./test/setup.ts`
Expected: FAIL because the anchor retains `href`/actionability and Field invents absent IDs.

- [ ] **Step 4: Implement a non-actionable disabled composition path**

Add a private helper that renders the composed child's visual content on a non-actionable element while merging Button classes and consumer ARIA safely:

```tsx
function DisabledButtonChild({
  child,
  className,
  isPending,
}: {
  child: React.ReactElement<{ className?: string; children?: React.ReactNode }>;
  className: string;
  isPending: boolean;
}) {
  return (
    <span
      className={cn(className, child.props.className)}
      aria-disabled="true"
      aria-busy={isPending || undefined}
      tabIndex={-1}
      data-disabled=""
    >
      {child.props.children}
    </span>
  );
}
```

Use it only for `asChild && (disabled || isPending)`. Enabled composition remains the Radix `Slot`, and native buttons keep the actual `disabled` attribute.

- [ ] **Step 5: Make Field context IDs conditional on rendered children**

Implement a fragment-aware child scan that returns each rendered subcomponent's actual `id` or the stable fallback, and merge described-by tokens through a `Set`:

```ts
const describedBy = Array.from(
  new Set(
    [
      ...(props["aria-describedby"]?.split(/\s+/) ?? []),
      field.descriptionId,
      field.invalid ? field.errorId : undefined,
    ].filter((value): value is string => Boolean(value)),
  ),
).join(" ");
```

The `FieldContextValue` uses optional `descriptionId`/`errorId`; it never exposes a fallback for a subcomponent not present in the rendered children.

- [ ] **Step 6: Run focused tests and formatting**

Run:

```bash
/Users/ramezweissa/.bun/bin/bun test app/components/ui/button-field.test.tsx --preload ./test/setup.ts
/Users/ramezweissa/.bun/bin/bunx prettier --write app/components/ui/button.tsx app/components/ui/field.tsx app/components/ui/button-field.test.tsx
git diff --check
```

Expected: all primitive tests pass; no formatting or whitespace errors.

- [ ] **Step 7: Commit the primitive contract**

```bash
git add app/components/ui/button.tsx app/components/ui/field.tsx app/components/ui/button-field.test.tsx
git commit -m "fix(ui): enforce composed button and field semantics"
```

### Task 2: Generate the canonical Database contract and type every Supabase factory

**Files:**

- Create: `lib/supabase/database.types.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/factories.test.ts`
- Modify consumers of: `utils/supabase/client.ts`, `utils/supabase/server.ts`, `utils/supabase/supabaseAdmin.ts`
- Modify: `tsconfig.json` only if generated types expose a real include-path gap.

**Interfaces:**

- Produces `createBrowserSupabaseClient(): SupabaseClient<Database>`, `createServerSupabaseClient(extraHeaders?): Promise<SupabaseClient<Database>>`, and `supabaseAdmin: SupabaseClient<Database>`.
- Existing utility paths become temporary typed compatibility re-exports; no second client implementation remains.

- [ ] **Step 1: Verify local schema history before generation**

Run:

```bash
/Users/ramezweissa/.bun/bin/bunx supabase migration list --local
/Users/ramezweissa/.bun/bin/bunx supabase db reset
git status --short
```

Expected: reset succeeds using local services and every tracked migration applies in order; no historical SQL file changes.

- [ ] **Step 2: Generate the type file mechanically from local schema**

Run:

```bash
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
rg -n "export type Database|dentistry_treatments|registration_completions" lib/supabase/database.types.ts
```

Expected: one `Database` export includes legacy and Phase 5 tables/functions.

- [ ] **Step 3: Add compile-time factory tests that fail on untyped clients**

```ts
type Tables = Database["public"]["Tables"];
expectTypeOf<Tables["users"]["Row"]["id"]>().toEqualTypeOf<string>();
expectTypeOf<ReturnType<typeof createBrowserSupabaseClient>>().toMatchTypeOf<
  SupabaseClient<Database>
>();
```

Also assert server/admin factories cannot be imported through a client-marked test fixture.

- [ ] **Step 4: Run the factory test and confirm missing exports**

Run: `/Users/ramezweissa/.bun/bin/bun test lib/supabase/factories.test.ts --preload ./test/setup.ts`
Expected: FAIL because the typed factories do not exist.

- [ ] **Step 5: Implement typed factories and compatibility re-exports**

```ts
// lib/supabase/browser.ts
"use client";
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(url, publishableOrAnonKey);
}

// lib/supabase/server.ts
import "server-only";
export async function createServerSupabaseClient(
  extraHeaders?: Record<string, string>,
) {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, publishableOrAnonKey, {
    cookies: cookieAdapter(cookieStore),
    global: { headers: extraHeaders },
  });
}
```

Move the existing admin initialization unchanged behind `import "server-only"` and `Database`. The old utility files re-export these names so migration can be incremental without duplicate instances.

- [ ] **Step 6: Replace unparameterized shared `SupabaseClient` annotations**

Change shared helpers touched by foundation to `SupabaseClient<Database>` or a narrower injected interface. Do not mechanically rewrite feature components yet. Run:

```bash
rg -n "SupabaseClient(?!<)|supabase: any|\[key: string\]: any" lib utils app/contexts --pcre2
/Users/ramezweissa/.bun/bin/bun run typecheck
```

Expected: no unparameterized client/`any` remains in shared foundation paths; typecheck passes or exposes only feature-local follow-up errors fixed in the same step.

- [ ] **Step 7: Run tests, inspect generated diff, and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test lib/supabase utils/supabase --preload ./test/setup.ts
git diff --check
git add -f lib/supabase/database.types.ts
git add lib/supabase utils/supabase
git commit -m "feat(data): add canonical typed Supabase clients"
```

### Task 3: Protect dashboard authority columns and test actor/admin policy

**Files:**

- Create through CLI: `supabase/migrations/20260803214923_protect_dashboard_user_authority.sql`
- Create: `supabase/tests/phase6_dashboard_identity_rls.test.sql`
- Regenerate: `lib/supabase/database.types.ts`

**Interfaces:**

- Produces `public.is_dashboard_admin()` as a restricted boolean helper used by policies.
- Ordinary authenticated users may update only approved profile/domain presentation columns on their own row; protected authority/billing/session/verification/blocking columns are not writable.
- Authorized admins retain effective-target presentation updates without making role mutable.

- [ ] **Step 1: Verify the CLI-generated migration and inspect test syntax instead of guessing**

```bash
test -f supabase/migrations/20260803214923_protect_dashboard_user_authority.sql
/Users/ramezweissa/.bun/bin/bunx supabase test db --help
/Users/ramezweissa/.bun/bin/bunx supabase db lint --help
```

- [ ] **Step 2: Write failing pgTAP authorization tests**

The SQL test establishes local actor/admin JWT claims and asserts:

```sql
select throws_ok(
  $$ update public.users set role = 'admin' where id = :'owner_id' $$,
  '42501'
);
select lives_ok(
  $$ update public.users set first_name = 'Owner' where id = :'owner_id' $$
);
select is((select public.is_dashboard_admin()), false);
```

Add anonymous denial, cross-user ordinary denial, admin target presentation update success, and protected subscription/verification/session/blocking column denial.

- [ ] **Step 3: Run the SQL test and verify it exposes the permissive baseline**

Run: `/Users/ramezweissa/.bun/bin/bunx supabase test db`
Expected: FAIL because current policies/privileges permit role and cross-user updates.

- [ ] **Step 4: Implement minimal policy in the CLI-generated imperative migration**

Verify: `test -f supabase/migrations/20260803214923_protect_dashboard_user_authority.sql`

Migration requirements:

```sql
create or replace function public.is_dashboard_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (
  select 1 from public.users
  where id = (select auth.uid()) and role = 'admin'
) $$;
revoke all on function public.is_dashboard_admin() from public, anon;
grant execute on function public.is_dashboard_admin() to authenticated;
```

Drop the permissive `users` UPDATE policy. Add an authenticated policy permitting `id = auth.uid()` or secured admin helper, with both `USING` and `WITH CHECK`. Revoke table-level UPDATE from `anon, authenticated`, then grant only the exact presentation/domain columns used by existing owner/admin flows. Never grant role, subscription, Stripe, verification, session, registration authority, or blocking columns.

- [ ] **Step 5: Reset, test anonymous/owner/cross-user/admin, and lint**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
git check-ignore -v supabase/migrations/*protect_dashboard_user_authority.sql || true
git add -f supabase/migrations/*protect_dashboard_user_authority.sql supabase/tests/phase6_dashboard_identity_rls.test.sql
```

Expected: SQL tests pass, lint introduces no unresolved security finding, and the new ignored SQL file is force-added.

- [ ] **Step 6: Regenerate types and commit**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
git add -f lib/supabase/database.types.ts
git commit -m "fix(auth): protect dashboard authority fields"
```

### Task 4: Implement and test server-only effective dashboard scope

**Files:**

- Create: `lib/dashboard/types.ts`
- Create: `lib/dashboard/identity.ts`
- Create: `lib/dashboard/identity.test.ts`
- Replace after parity: `utils/user/getEffectiveUserId.ts`, `utils/user/getAuthorizedUser.ts`

**Interfaces:**

```ts
export type DashboardScope = {
  effectiveUserId: string;
  dentistryId: string;
  username: string;
};

export type ResolvedDashboardIdentity = {
  scope: DashboardScope;
  shell: DashboardShellViewModel;
};

export async function resolveDashboardIdentity(
  targetUserId?: string | null,
  dependencies?: DashboardIdentityDependencies,
): Promise<ResolvedDashboardIdentity>;
```

- [ ] **Step 1: Write failing identity resolver tests**

Cover: missing/invalid auth; actor row by immutable ID; ordinary self; malformed target UUID; ordinary cross-user forbidden; secured admin existing target; admin missing target; missing dentistry; smallest serializable scope; no email/role/session/isAdmin in scope.

- [ ] **Step 2: Run the focused test and confirm missing implementation**

Run: `/Users/ramezweissa/.bun/bin/bun test lib/dashboard/identity.test.ts --preload ./test/setup.ts`
Expected: FAIL because resolver/types are absent.

- [ ] **Step 3: Implement injected server-only resolver**

```ts
import "server-only";

export async function resolveDashboardIdentity(
  targetUserId: string | null = null,
  deps = productionDependencies,
) {
  const actor = await deps.getAuthenticatedUser();
  if (!actor) throw new DashboardAuthError("UNAUTHENTICATED");
  const actorRow = await deps.getUserById(actor.id);
  const effectiveUserId = await authorizeTarget(actorRow, targetUserId, deps);
  const [effectiveUser, dentistry] = await Promise.all([
    deps.getUserById(effectiveUserId),
    deps.getDentistryByUserId(effectiveUserId),
  ]);
  return toResolvedDashboardIdentity(effectiveUser, dentistry);
}
```

Pages translate errors to redirects; Actions/handlers translate them to controlled `ActionResult`/HTTP status. The resolver never accepts a browser Supabase client.

- [ ] **Step 4: Migrate shared callers and remove `any` redirects from authorization helpers**

Use the new resolver in dashboard layout/page-level shared calls. Retain compatibility wrappers only while a non-dashboard caller remains; repository search must identify each remaining consumer before deletion.

- [ ] **Step 5: Run tests/typecheck and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test lib/dashboard utils/user --preload ./test/setup.ts
/Users/ramezweissa/.bun/bin/bun run typecheck
git add lib/dashboard utils/user app/dashboard
git commit -m "feat(auth): resolve dashboard scope on the server"
```

### Task 5: Add the smallest Query provider and stable failure policy

**Files:**

- Create: `lib/query/client.ts`
- Create: `lib/query/errors.ts`
- Create: `lib/query/client.test.ts`
- Create: `app/dashboard/_components/DashboardQueryProvider.tsx`
- Create: `app/dashboard/_components/DashboardQueryProvider.test.tsx`
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**

```ts
export function createDashboardQueryClient(): QueryClient;
export function shouldRetryDashboardQuery(failureCount: number, error: unknown): boolean;
export class DashboardQueryError extends Error {
  constructor(public readonly status: number, message: string, public readonly result?: ActionResult<never>);
}
```

- [ ] **Step 1: Write failing defaults/retry tests**

Assert 30-second stale time, 10-minute GC, focus refetch false, reconnect true, one transient network/5xx retry, zero 4xx retry, and mutation retry/throwOnError false.

- [ ] **Step 2: Write failing provider-lifetime test**

Render/rerender the provider and assert the same QueryClient/cache survives child rerenders but a new mount receives a new client. Assert the provider does not accept auth/user props.

- [ ] **Step 3: Run focused tests and confirm missing modules**

```bash
/Users/ramezweissa/.bun/bin/bun test lib/query app/dashboard/_components/DashboardQueryProvider.test.tsx --preload ./test/setup.ts
```

- [ ] **Step 4: Implement client factory and provider**

```tsx
"use client";
export function DashboardQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = React.useState(createDashboardQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wrap only `DashboardClientLayout`/route content in `app/dashboard/layout.tsx`; do not wrap Sidebar, MobileNavbar, RightPanel, or auth/session owners unless a proven migrated Query consumer requires it.

- [ ] **Step 5: Run focused tests/typecheck and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test lib/query app/dashboard/_components/DashboardQueryProvider.test.tsx --preload ./test/setup.ts
/Users/ramezweissa/.bun/bin/bun run typecheck
git add lib/query app/dashboard/_components app/dashboard/layout.tsx
git commit -m "feat(query): scope dashboard server-state provider"
```

### Task 6: Replace DashboardUserContext and duplicate `/api/user` ownership

**Files:**

- Create: `app/contexts/DashboardScopeContext.tsx`
- Create: `app/contexts/DashboardScopeContext.test.tsx`
- Modify: `app/dashboard/layout.tsx`
- Modify: `app/dashboard/components/Sidebar.tsx`
- Modify: `app/dashboard/components/RightPanel.tsx`
- Modify: `app/dashboard/components/RightPanelClient.tsx`
- Modify: `app/dashboard/components/MobileNavbar.tsx`
- Modify: `app/dashboard/settings/SettingsForm.tsx`
- Modify: `app/dashboard/verification/components/VerifyStatus.tsx`
- Modify: `app/dashboard/client-layout.tsx`
- Modify: `e2e/fixtures/dashboard.ts`
- Delete after parity: `app/contexts/DashboardUserContext.tsx`
- Remove POST read only after no consumer: `app/api/user/route.ts`

**Interfaces:**

- `DashboardScopeProvider` receives the immutable server seed and exposes `useDashboardScope(): DashboardScope` without a setter/loading flag.
- Shell consumers receive `DashboardShellViewModel` as minimal props from the server layout.
- Settings/brand mutation reauthorizes, awaits success, then calls `router.refresh()`; VerifyStatus receives server-derived presentation status.

- [ ] **Step 1: Write failing read-only scope and shell parity tests**

Test context value contains exactly three scope fields and cannot mutate. Add component tests for Sidebar, RightPanel, MobileNavbar, Settings, and VerifyStatus using server-derived props without `/api/user` fetch/loading.

- [ ] **Step 2: Add a failing static duplicate-load test**

```ts
expect(await sourceFilesContaining('fetch("/api/user"')).toEqual([]);
expect(await sourceFilesContaining("useDashboardUser")).toEqual([]);
```

The test excludes the specialized admin verification write caller until Phase 8 and asserts the dashboard fixture no longer waits on `POST /api/user`.

- [ ] **Step 3: Run tests and confirm current context/fetch failures**

Run focused context/shell tests. Expected: FAIL while `DashboardUserProvider` and mutable consumers remain.

- [ ] **Step 4: Resolve identity in layout and pass minimal values**

Make `app/dashboard/layout.tsx` async, parse the optional target hint at the server boundary, call `resolveDashboardIdentity`, render shell components with minimal props, and wrap only route content with `DashboardScopeProvider` and `DashboardQueryProvider`.

- [ ] **Step 5: Remove client authorization effect and mutable context**

Delete the client-layout Supabase/effective-user effect. Keep `DashboardClientLayout` only if it still owns a genuine client layout concern; otherwise replace it with direct children. Migrate every listed consumer, then delete `DashboardUserContext`.

- [ ] **Step 6: Narrow `/api/user` to demonstrated specialized writes**

Repository-search all methods. Remove the duplicate POST read. Preserve only separately authorized PUT/DELETE/Admin Verification consumers with explicit DTOs or split them into a specialized route so no generic user endpoint remains a mixed read/write owner.

- [ ] **Step 7: Update E2E readiness and run shell parity**

Replace the fixture's POST waiter with a server-rendered dashboard landmark/profile assertion. Run:

```bash
/Users/ramezweissa/.bun/bin/bun test app/contexts app/dashboard/components app/dashboard/settings app/dashboard/verification --preload ./test/setup.ts
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/navigation.spec.ts --project=chromium
```

- [ ] **Step 8: Commit identity ownership migration**

```bash
git add app/contexts app/dashboard app/api/user e2e/fixtures/dashboard.ts
git commit -m "refactor(dashboard): seed one authorized identity owner"
```

### Task 7: Publish foundation matrices, verify, and open the first stacked checkpoint

**Files:**

- Modify: `docs/frontend-modernization.md`
- Create: `docs/dashboard-form-data-migration-matrix.md`
- Create: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/testing/dashboard-e2e-coverage.md`
- Modify: `docs/superpowers/specs/2026-08-04-dashboard-data-ownership-design.md` only for verified deviations.

**Interfaces:**

- Form/data matrix columns: surface, phase owner, first-read owner, Query key, schema, mutation boundary, atomicity, upload rule, invalidation, preview, Phase 7 tags, analytics exclusion, tests, legacy removal.
- Cache matrix contains precise immutable profile/entity tag templates but no runtime invalidation code.

- [ ] **Step 1: Write the complete inventory rows before claiming foundation exit**

Populate every Phase 6 family and every explicit Phase 8 specialized defer from the approved design. Mark only foundation rows complete; feature rows remain planned with exact stacked PR number.

- [ ] **Step 2: Record official-guidance and baseline decisions**

Document Query defaults, initialData/hydration policy, Supabase changelog findings, generated-type command, RLS migration/test results, 223-pass/2-fail starting unit evidence, and Phase 2 route-size comparison values.

- [ ] **Step 3: Run foundation verification from fresh state**

```bash
/Users/ramezweissa/.bun/bin/bunx prettier --check app/components/ui lib/supabase lib/dashboard lib/query app/contexts app/dashboard docs
git diff --check
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/navigation.spec.ts e2e/accessibility.spec.ts --project=chromium
```

Expected: all new tests pass; full suite has no failures, lint has zero errors/no warning growth, build succeeds, focused Playwright/critical axe pass. If the two baseline readonly-focus tests still fail, invoke systematic-debugging, fix the test compatibility separately, and create/update exactly one Trello Bug story after verification.

- [ ] **Step 4: Request code review and update Trello**

Use `superpowers:requesting-code-review`, resolve findings, push the branch, open the foundation PR, add its URL/status to card 110, and check the two foundation checklist items only after read-back verification.

- [ ] **Step 5: Commit documentation evidence**

```bash
git add docs
git commit -m "docs: record dashboard data foundation verification"
```
