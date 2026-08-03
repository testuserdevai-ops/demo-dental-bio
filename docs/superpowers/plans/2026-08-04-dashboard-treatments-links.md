# Treatments, Services, Links, and Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate treatments/services and links/groups end to end onto authorized server reads, TanStack Query, RHF/Zod, typed Actions, and atomic one-based ordering with no browser database CRUD.

**Architecture:** Each page Server Component resolves dashboard scope and seeds one aggregate query. Client managers render Query-owned records and RHF-owned drafts. Bound Server Actions accept the effective-user ID only as a reauthorized target hint; feature DTOs contain no user/dentistry/role/rank authority. Restricted transaction functions own entity+join lifecycle and exact-set ordering.

**Tech Stack:** Next.js 16 Server Actions/Route Handlers, TanStack Query v5, RHF 7, Zod 4, generated Supabase Database types, PostgreSQL RLS/functions, Bun/Testing Library/Playwright.

## Global Constraints

- Stack this PR on the reviewed foundation PR; do not recreate or concurrently edit shared identity, Query, Supabase, primitive, or ActionResult infrastructure.
- Lead owns migrations/generated types. Feature agents own only the explicitly assigned treatment or link route files/tests.
- Keep public SELECT behavior and public profile analytics IDs/one-based positions unchanged.
- Every write reauthorizes server-side; submitted target/entity IDs are never authority.
- No direct browser Supabase table writes remain in these features. No same-app mutation has both an Action and Route Handler.
- Transaction functions use fixed search paths, explicit `auth.uid()` checks, exact-set validation, revoked default execute, and no service-role bypass.

---

### Task 1: Add failing database authorization and atomicity tests

**Files:**

- Create: `supabase/tests/phase6_treatments_links.test.sql`

**Interfaces:**

- Defines expected RPC names before migration: `create/update/delete/reorder_dentistry_treatment`, `create/update/delete/reorder_link_group`, and `create/update/delete/reorder_dentistry_link`.

- [ ] **Step 1: Inspect duplicate legacy ownership before adding constraints**

Run local read-only SQL that groups `dentistry_treatments.treatment_id` and `dentistry_links.link_id` with `having count(*) > 1`. Record zero rows as evidence; if duplicates exist, stop and design an explicit data migration rather than choosing an owner.

- [ ] **Step 2: Write anonymous/owner/cross-user/admin pgTAP cases**

Use local seeded user JWT claims. Assert anonymous execute denial, owner success, User A against User B denial, authorized admin target success, unknown target denial, and no direct authenticated mutation of standalone `treatments`/`links`.

- [ ] **Step 3: Write exact-set and rollback cases**

For both families assert duplicate, omitted, foreign, and missing IDs fail; existing ranks stay unchanged; an injected second-write failure leaves no orphan entity/join; two concurrent creates allocate distinct ranks; committed ranks are contiguous and one-based.

- [ ] **Step 4: Run tests and confirm permissive/non-atomic baseline failures**

Run: `/Users/ramezweissa/.bun/bin/bunx supabase test db`
Expected: new cases fail because RPCs do not exist and current write policies/order updates are permissive/non-atomic.

### Task 2: Add the treatment/link ownership and transaction migration

**Files:**

- Create through CLI: `supabase/migrations/20260803214924_phase6_treatments_links.sql`
- Regenerate: `lib/supabase/database.types.ts`

**Interfaces:**

```sql
create function public.create_dentistry_treatment(p_dentistry_id uuid, p_title text, p_description text, p_is_service boolean) returns setof public.treatments;
create function public.update_dentistry_treatment(p_dentistry_id uuid, p_treatment_id uuid, p_title text, p_description text) returns setof public.treatments;
create function public.delete_dentistry_treatment(p_dentistry_id uuid, p_treatment_id uuid) returns void;
create function public.reorder_dentistry_treatments(p_dentistry_id uuid, p_treatment_ids uuid[]) returns void;
create function public.create_link_group(p_dentistry_id uuid, p_heading text) returns setof public.link_groups;
create function public.update_link_group(p_dentistry_id uuid, p_group_id uuid, p_heading text) returns setof public.link_groups;
create function public.delete_link_group(p_dentistry_id uuid, p_group_id uuid) returns void;
create function public.reorder_link_groups(p_dentistry_id uuid, p_group_ids uuid[]) returns void;
create function public.create_dentistry_link(p_dentistry_id uuid, p_group_id uuid, p_title text, p_url text) returns setof public.links;
create function public.update_dentistry_link(p_dentistry_id uuid, p_group_id uuid, p_link_id uuid, p_title text, p_url text, p_is_active boolean) returns setof public.links;
create function public.delete_dentistry_link(p_dentistry_id uuid, p_group_id uuid, p_link_id uuid) returns void;
create function public.reorder_dentistry_links(p_dentistry_id uuid, p_group_id uuid, p_link_ids uuid[]) returns void;
```

- [ ] **Step 1: Verify the migration generated with the CLI**

Run: `test -f supabase/migrations/20260803214924_phase6_treatments_links.sql`

- [ ] **Step 2: Add ownership constraints and write policies**

Add unique entity-to-owner join constraints only after the preflight duplicate assertion. Preserve public reads. Replace write policies for `dentistries`, `dentistry_treatments`, `link_groups`, and `dentistry_links` with owner/admin predicates. Revoke standalone entity writes from `anon, authenticated`; only restricted functions mutate `treatments` and `links`.

- [ ] **Step 3: Implement locked atomic functions**

Each function validates caller and target, locks the scoped dentistry/ordered rows, allocates `coalesce(max(rank),0)+1` under the same lock, validates exact array set/count/distinctness, uses `unnest(... with ordinality)` for one SQL rank update, checks affected-row count, and returns/commits as one transaction. Group delete deletes joins and now-unreferenced link entities in the same function.

- [ ] **Step 4: Restrict function execution**

For every function:

```sql
security definer
set search_path = '';
revoke all on function public.function_name(signature) from public, anon;
grant execute on function public.function_name(signature) to authenticated;
```

Use the protected `public.is_dashboard_admin()` helper for admin targeting and compare ordinary ownership through `dentistries.user_id = auth.uid()`.

- [ ] **Step 5: Reset, run SQL tests/lint, regenerate types, and force-add SQL**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
git add -f supabase/migrations/*phase6_treatments_links.sql supabase/tests/phase6_treatments_links.test.sql lib/supabase/database.types.ts
git commit -m "feat(data): make treatment and link writes atomic"
```

### Task 3: Define treatment aggregate, schemas, keys, and server reads

**Files:**

- Create: `app/dashboard/treatments/_lib/schemas.ts`
- Create: `app/dashboard/treatments/_lib/schemas.test.ts`
- Create: `app/dashboard/treatments/_lib/keys.ts`
- Create: `app/dashboard/treatments/_lib/keys.test.ts`
- Create: `app/dashboard/treatments/_lib/queries.ts`
- Create: `app/dashboard/treatments/_lib/queries.test.ts`
- Create: `app/dashboard/treatments/_lib/api.ts`
- Modify: `app/api/treatments/route.ts`

**Interfaces:**

```ts
export type TreatmentItemViewModel = {
  id: string;
  title: string;
  description: string;
  kind: "treatment" | "service";
  rank: number;
};
export type TreatmentAggregate = {
  treatments: TreatmentItemViewModel[];
  services: TreatmentItemViewModel[];
};
export const treatmentKeys = {
  aggregate: (scopeId: string) => ["dashboard", "treatments", scopeId] as const,
};
export async function getTreatmentAggregate(
  scope: DashboardScope,
): Promise<TreatmentAggregate>;
```

- [ ] **Step 1: Write failing strict schema/key tests**

Create/update accept only title/description/kind/entity ID; reorder accepts a nonempty unique UUID list. Unknown `userId`, `dentistryId`, `rank`, `isAdmin`, owner, and extra fields fail. Keys contain only the controlled prefix and immutable scope ID.

- [ ] **Step 2: Implement schemas and key factory**

Reuse `TREATMENT_DESCRIPTION_MAX_LENGTH`; infer every input type with `z.infer`. Do not duplicate hand-written table shapes.

- [ ] **Step 3: Write failing authorized aggregate tests**

Assert server query consumes a resolved scope, filters by dentistry, maps null joins safely, sorts one-based ranks, splits kind, and never creates a browser client.

- [ ] **Step 4: Implement server-only query and GET refetch boundary**

The page calls `getTreatmentAggregate` directly. GET `/api/treatments?targetUserId=<hint>` resolves scope again and returns the same aggregate. Remove POST/PUT from the handler once Actions land; no duplicated mutation service remains.

- [ ] **Step 5: Run and commit contracts/read boundary**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/treatments/_lib app/api/treatments --preload ./test/setup.ts
git add app/dashboard/treatments/_lib app/api/treatments
git commit -m "feat(treatments): add typed aggregate data boundary"
```

### Task 4: Implement treatment Actions and narrow Query hooks

**Files:**

- Create: `app/dashboard/treatments/actions.ts`
- Create: `app/dashboard/treatments/actions.test.ts`
- Create: `app/dashboard/treatments/_lib/hooks.ts`
- Create: `app/dashboard/treatments/_lib/hooks.test.tsx`

**Interfaces:**

```ts
export async function createTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<TreatmentItemViewModel>>;
export async function updateTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<TreatmentItemViewModel>>;
export async function deleteTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>>;
export async function reorderTreatments(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>>;
export function useTreatmentAggregate(seed: {
  scopeId: string;
  data: TreatmentAggregate;
  updatedAt: number;
}): UseQueryResult<TreatmentAggregate>;
```

- [ ] **Step 1: Write failing Action authorization/mapping tests**

Cover malformed input before DB, anonymous, ordinary forged target, admin existing target, missing entity, RPC failure, field/form errors, and success mapping. Assert action derives dentistry from the reauthorized scope and never reads dentistry from input.

- [ ] **Step 2: Implement strict reauthorized Actions**

Each Action calls `resolveDashboardIdentity(targetHint)`, parses its schema, invokes exactly one generated typed RPC, and returns shared `ActionResult`. No `revalidatePath`/public cache call is introduced.

- [ ] **Step 3: Write failing Query hook tests**

Assert `initialData`/timestamp seed, one aggregate key, create/update/delete invalidates only that key, reorder snapshots cache and restores/refetches on error, mutation retry false, and no remote array is copied to local state.

- [ ] **Step 4: Implement hooks and run focused tests**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/treatments/actions.test.ts app/dashboard/treatments/_lib/hooks.test.tsx --preload ./test/setup.ts
```

- [ ] **Step 5: Commit treatment mutation boundary**

```bash
git add app/dashboard/treatments/actions.ts app/dashboard/treatments/actions.test.ts app/dashboard/treatments/_lib/hooks*
git commit -m "feat(treatments): add authorized query mutations"
```

### Task 5: Migrate treatment UI, reorder keyboard behavior, and remove browser CRUD

**Files:**

- Modify: `app/dashboard/treatments/page.tsx`
- Modify: `app/dashboard/treatments/TreatmentsClientWrapper.tsx`
- Modify: `app/dashboard/treatments/AddTreatment.tsx`
- Modify: `app/dashboard/treatments/TreatmentManager.tsx`
- Modify: `app/dashboard/treatments/AddTreatment.test.tsx`
- Modify: `app/dashboard/treatments/TreatmentManager.test.tsx`

**Interfaces:**

- Page seeds one aggregate and bound Actions with `scope.effectiveUserId` as reauthorized target hint.
- RHF remains draft owner; manager derives records from Query and local reorder draft only while ordering.

- [ ] **Step 1: Replace old transport expectations with failing Action/Query tests**

Tests assert preserved fields/error focus, reset only on success, no `apiClient`/browser `.from`, narrow invalidation, delete confirmation, failed reorder rollback, and authoritative preview refresh after success.

- [ ] **Step 2: Add failing keyboard reorder test**

Move-up/down native buttons change the draft, announce the new one-based position through a polite live region, preserve focus on the moved item, support cancel, and submit ordered IDs only.

- [ ] **Step 3: Implement Query/RHF managers**

Remove `fetchItems`, mirrored `initialItems`, browser delete, per-row update loop, and `newItem` synchronization. Keep local dialog/reorder draft state only. Await mutation result/refetch before announcing success.

- [ ] **Step 4: Run tests/static browser-CRUD guard and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/treatments --preload ./test/setup.ts
! rg -n 'createClient\(|\.from\(' app/dashboard/treatments --glob '*.{ts,tsx}'
git add app/dashboard/treatments
git commit -m "refactor(treatments): use query owned forms and order"
```

### Task 6: Define and implement link/group aggregate contracts and Actions

**Files:**

- Create: `app/dashboard/links/_lib/schemas.ts`
- Create: `app/dashboard/links/_lib/schemas.test.ts`
- Create: `app/dashboard/links/_lib/keys.ts`
- Create: `app/dashboard/links/_lib/keys.test.ts`
- Create: `app/dashboard/links/_lib/queries.ts`
- Create: `app/dashboard/links/_lib/queries.test.ts`
- Create: `app/dashboard/links/_lib/api.ts`
- Create: `app/dashboard/links/_lib/hooks.ts`
- Create: `app/dashboard/links/_lib/hooks.test.tsx`
- Create: `app/dashboard/links/actions.ts`
- Create: `app/dashboard/links/actions.test.ts`
- Modify: `app/dashboard/links/page.tsx`

**Interfaces:**

```ts
export type LinkViewModel = {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  rank: number;
};
export type LinkGroupViewModel = {
  id: string;
  heading: string;
  rank: number;
  links: LinkViewModel[];
};
export type LinkAggregate = { groups: LinkGroupViewModel[] };
export const linkKeys = {
  aggregate: (scopeId: string) => ["dashboard", "links", scopeId] as const,
};
export async function createLinkGroup(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<LinkGroupViewModel>>;
export async function createLink(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<LinkViewModel>>;
```

The remaining Action exports are `updateLinkGroup`, `deleteLinkGroup`, `reorderLinkGroups`, `updateLink`, `deleteLink`, and `reorderLinks`; each accepts `(targetHint: string, input: unknown)` and returns `Promise<ActionResult<...>>`. DTOs include only controlled heading/title/url/isActive/entity IDs; no dentistry/user/rank fields.

- [ ] **Step 1: Write strict schema/key/query tests**

Reject blank/oversized headings, unsafe/non-HTTP(S) URLs, unknown fields, duplicate reorder IDs, forged scope fields, and orphan joins. Map/sort a single server aggregate with one-based ranks.

- [ ] **Step 2: Implement schemas, keys, server query, and GET-only boundary**

Normalize URLs on the server. The client GET query accepts only a reauthorized target hint. Do not retain separate POST/PUT/DELETE Route Handlers.

- [ ] **Step 3: Write/implement Action and hook tests**

Mirror treatment authorization, RPC, initialData, narrow invalidation, and rollback tests. Group deletion calls the atomic function that removes child joins/entities and compacts group order.

- [ ] **Step 4: Run and commit feature boundary**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/links/_lib app/dashboard/links/actions.test.ts --preload ./test/setup.ts
git add app/dashboard/links
git commit -m "feat(links): add authorized aggregate actions"
```

### Task 7: Migrate link/group RHF UI and exact keyboard ordering

**Files:**

- Modify: `app/dashboard/links/components/AddLinkForm.tsx`
- Modify: `app/dashboard/links/components/AddLinkGroupForm.tsx`
- Modify: `app/dashboard/links/components/LinkGroup.tsx`
- Modify: `app/dashboard/links/components/LinkItem.tsx`
- Modify: `app/dashboard/links/components/LinksPageClient.tsx`
- Modify: `app/dashboard/links/components/ManageLinkGroups.tsx`
- Create focused tests beside add/group/item/manager components.

- [ ] **Step 1: Write failing RHF/error/action semantics tests**

Cover add/edit preserved values, first invalid field, one focusable form Alert, dialog/delete cancel, success-only reset/close/Sonner, toggle failure rollback, and real labelled buttons for every icon action.

- [ ] **Step 2: Write failing group/link keyboard reorder tests**

Test exact ordered IDs, move announcement, focus retention, cancel restoration, mutation failure rollback, and narrow group/aggregate invalidation.

- [ ] **Step 3: Implement RHF/Query UI and delete direct clients**

Replace controlled field state and every `.from("links"|"link_groups"|"dentistry_links")` call. Query owns the aggregate; local arrays exist only during an active reorder draft.

- [ ] **Step 4: Run focused tests and static guard**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/links --preload ./test/setup.ts
! rg -n 'createClient\(|\.from\(' app/dashboard/links --glob '*.{ts,tsx}'
```

- [ ] **Step 5: Commit UI slice**

```bash
git add app/dashboard/links app/api
git commit -m "refactor(links): use RHF query and atomic ordering"
```

### Task 8: Verify treatment/link parity and update matrices/Trello

**Files:**

- Modify: `e2e/dashboard/treatments.spec.ts`
- Modify: `e2e/dashboard/links.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `docs/testing/dashboard-e2e-coverage.md`
- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/frontend-modernization.md`

- [ ] **Step 1: Extend E2E for success, controlled failure, reload, and cross-owner denial**

Treatments cover treatment and service create/edit/delete/order. Links cover group/link create/edit/toggle/delete/order. Both verify server-seeded first paint, no duplicate legacy read, failed mutation retains values/order, keyboard reorder, and persisted reload.

- [ ] **Step 2: Add critical dashboard axe/dialog checks**

Scan the migrated routes and opened edit/delete dialogs without filtering violations. Assert existing-only `aria-describedby`, semantic reorder buttons, focus return, and reduced-motion-safe behavior.

- [ ] **Step 3: Record exact migration/cache/analytics rows**

Mark the two slices complete with their aggregate keys, Actions/RPCs, no browser CRUD, one-based ranks, public preview behavior, future immutable tags, dashboard analytics exclusion, and commands/results.

- [ ] **Step 4: Run PR verification**

```bash
/Users/ramezweissa/.bun/bin/bunx prettier --check app/dashboard/treatments app/dashboard/links app/api/treatments docs
git diff --check
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/treatments.spec.ts e2e/dashboard/links.spec.ts e2e/accessibility.spec.ts --project=chromium
```

- [ ] **Step 5: Request review, update Trello, and commit evidence**

Use `superpowers:requesting-code-review`; resolve findings. Add the stacked PR URL/status to card 110 and check treatments/services and links/groups only after verification/read-back.

```bash
git add e2e docs
git commit -m "docs: verify treatment and link data ownership"
```
