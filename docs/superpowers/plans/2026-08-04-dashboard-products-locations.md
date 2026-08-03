# Shop Products and Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the dashboard's individual shop products and locations onto authorized aggregates, Query/RHF, owner-scoped product uploads, atomic entity/link/order operations, and conflict-safe authoritative location saves.

**Architecture:** Shop and location pages seed one aggregate each. Product Actions derive the owner and use atomic rank/media-cleanup functions. Location Actions derive dentistry and use transaction functions for create+link/delete and revision-checked updates. TanStack mutation scope serializes same-location client saves, while a database revision rejects stale writes from concurrent tabs; the UI reconciles only the authoritative result.

**Tech Stack:** Next.js Actions, TanStack Query mutation scope, RHF/Zod, Supabase/Postgres/Storage, Google Maps bounded client island, Bun/Playwright.

## Global Constraints

- Stack on the reviewed blogs/videos PR; shared infrastructure and migrations/generated types are lead-owned.
- Dashboard shop currently edits `products.user_id` individual rows through `/api/individual-products`; grouped `/api/products` has no active dashboard form consumer and is not silently claimed migrated unless repository search proves otherwise.
- Inputs never contain owner/dentistry/plan/role/rank or arbitrary image URL. Server derives subscription/location limits.
- Preserve map behavior, product/location public output, immutable IDs, and one-based visible positions.
- The location race is verified with out-of-order responses and stale DB revision, never sleeps or button-only assertions.

---

### Task 1: Add failing product/location RLS, Storage, transaction, and revision tests

**Files:**

- Create: `supabase/tests/phase6_products_locations.test.sql`
- Create through CLI: `supabase/migrations/20260803214926_phase6_products_locations.sql`
- Regenerate: `lib/supabase/database.types.ts`

**Interfaces:**

```sql
create function public.create_individual_product(p_user_id uuid, p_name text, p_url text, p_platform text, p_image_url text, p_price double precision, p_currency text, p_enabled boolean) returns setof public.products;
create function public.update_individual_product(p_user_id uuid, p_product_id bigint, p_name text, p_url text, p_platform text, p_image_url text, p_price double precision, p_currency text, p_enabled boolean) returns setof public.products;
create function public.delete_individual_product(p_user_id uuid, p_product_id bigint) returns void;
create function public.reorder_individual_products(p_user_id uuid, p_product_ids bigint[]) returns void;
create function public.create_dentistry_location(p_dentistry_id uuid, p_business_name text, p_full_address text, p_country text, p_city text, p_area text, p_latitude numeric, p_longitude numeric) returns setof public.locations;
create function public.update_dentistry_location(p_dentistry_id uuid, p_location_id uuid, p_expected_updated_at timestamptz, p_business_name text, p_full_address text, p_country text, p_city text, p_area text, p_latitude numeric, p_longitude numeric) returns setof public.locations;
create function public.delete_dentistry_location(p_dentistry_id uuid, p_location_id uuid) returns void;
```

- [ ] **Step 1: Write failing owner/admin/cross-user tests**

Cover `products`, `locations`, `dentistry_locations`, and `dentistries.location_title`; anonymous denial; owner success; User A against B denial; secured admin target; protected relation/rank/user changes; unknown IDs return failure, never success.

- [ ] **Step 2: Write product ordering/media tests**

Concurrent creates get distinct ranks; exact reorder rejects duplicate/omitted/foreign IDs with unchanged state; update/delete atomically queues old product image cleanup; product Storage new writes require `<effectiveUserId>/products/<uuid>.<ext>` with owner/admin upsert permissions and public reads preserved.

- [ ] **Step 3: Write location atomicity/limit/revision tests**

Create+link rollback leaves no orphan on injected failure; delete removes join+entity atomically; free/pro location limit is checked inside locked transaction; first revision update succeeds and returns new `updated_at`; second write using the stale timestamp raises controlled conflict and cannot overwrite.

- [ ] **Step 4: Run SQL tests and confirm baseline failures**

Run: `/Users/ramezweissa/.bun/bin/bunx supabase test db`

- [ ] **Step 5: Implement the CLI-generated migration**

Verify: `test -f supabase/migrations/20260803214926_phase6_products_locations.sql`

Add `locations.updated_at timestamptz not null default now()` without rewriting history. Replace in-scope permissive writes, add scoped Storage policies, implement fixed-path restricted functions, lock rank/limit scopes, compare-and-set revision, exact affected-row checks, cleanup jobs, revoke default execute, and grant authenticated only.

- [ ] **Step 6: Reset/test/lint/regenerate/commit**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
git add -f supabase/migrations/*phase6_products_locations.sql supabase/tests/phase6_products_locations.test.sql lib/supabase/database.types.ts
git commit -m "feat(data): secure products and version locations"
```

### Task 2: Define product aggregate, schemas, Actions, Query hooks, and upload

**Files:**

- Create: `app/dashboard/shop/_lib/schemas.ts`
- Create: `app/dashboard/shop/_lib/schemas.test.ts`
- Create: `app/dashboard/shop/_lib/keys.ts`
- Create: `app/dashboard/shop/_lib/keys.test.ts`
- Create: `app/dashboard/shop/_lib/queries.ts`
- Create: `app/dashboard/shop/_lib/queries.test.ts`
- Create: `app/dashboard/shop/_lib/api.ts`
- Create: `app/dashboard/shop/_lib/actions.ts`
- Create: `app/dashboard/shop/_lib/actions.test.ts`
- Create: `app/dashboard/shop/_lib/hooks.ts`
- Create: `app/dashboard/shop/_lib/hooks.test.tsx`
- Create: `app/dashboard/shop/_lib/upload.ts`
- Create: `app/dashboard/shop/_lib/upload.test.ts`

**Interfaces:**

```ts
export type ProductViewModel = {
  id: number;
  name: string;
  url: string;
  platform: string;
  imageUrl: string;
  price: number;
  currency: string;
  enabled: boolean;
  rank: number;
};
export type ProductAggregate = {
  enabledForPlan: boolean;
  products: ProductViewModel[];
};
export const productKeys = {
  aggregate: (scopeId: string) => ["dashboard", "products", scopeId] as const,
};
export async function getProductAggregate(
  scope: DashboardScope,
): Promise<ProductAggregate>;
export async function createProduct(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<ProductViewModel>>;
export async function uploadProductImage(
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>>;
```

- [ ] **Step 1: Write strict DTO/key/query tests**

Validate name/HTTPS URL/platform/price/nonnegative/currency/enabled/verified image path; reject owner/group/rank/image URL/extra fields. Assert only `products.user_id = effectiveUserId` dashboard rows, sorted one-based, and one stable key.

- [ ] **Step 2: Write Action/hook tests**

Cover auth/target/admin/subscription/missing product/RPC/cleanup failures; initialData; narrow update/invalidation; exact reorder rollback; no mirrored remote array.

- [ ] **Step 3: Write upload tests and implement owner path**

Controlled MIME/size, `<effectiveUserId>/products/<uuid>.<ext>`, forged/cross-user denial, admin target, upload failure blocks Action, cleanup queue retries.

- [ ] **Step 4: Implement boundary and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/shop/_lib --preload ./test/setup.ts
git add app/dashboard/shop/_lib
git commit -m "feat(shop): add owned product aggregate and uploads"
```

### Task 3: Migrate product forms/manager and keyboard ordering

**Files:**

- Create: `app/dashboard/shop/_components/ProductManager.tsx`
- Create: `app/dashboard/shop/_components/ProductManager.test.tsx`
- Create: `app/dashboard/shop/_components/ProductFormDialog.tsx`
- Create: `app/dashboard/shop/_components/ProductFormDialog.test.tsx`
- Modify: `app/dashboard/shop/page.tsx`
- Retire after parity: `components/AddIndividualProduct.tsx`, `AddIndividualProductModal.tsx`, `ManageIndividualProducts.tsx`; consolidate duplicate cards without unrelated styling work.
- Modify/remove same-app writes: `app/api/individual-products/route.ts`

- [ ] **Step 1: Write failing RHF/dialog/upload tests**

Field/Alert focus and preservation; success-only close/reset/Sonner; upload pending/failure; delete cancel/focus; enabled toggle rollback; plan lock preserved; no analytics event.

- [ ] **Step 2: Write failing exact keyboard reorder tests**

Move controls announce/focus one-based position, pass IDs only, cancel, rollback/refetch, and reduced-motion behavior.

- [ ] **Step 3: Implement Query-owned UI and remove legacy mutations**

Keep one card presentation. Remove copied fetched arrays, `apiClient` writes, Uppy generic boundary, and broad Route Handler mutations. Keep GET only if Query refetch uses it.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/shop --preload ./test/setup.ts
! rg -n 'apiClient\.(post|put|delete)|\.from\(' app/dashboard/shop --glob '*.{ts,tsx}'
git add app/dashboard/shop app/api/individual-products
git commit -m "refactor(shop): migrate product forms and ordering"
```

### Task 4: Define location aggregate, schemas, Actions, and conflict-safe hooks

**Files:**

- Create: `app/dashboard/location/_lib/schemas.ts`
- Create: `app/dashboard/location/_lib/schemas.test.ts`
- Create: `app/dashboard/location/_lib/keys.ts`
- Create: `app/dashboard/location/_lib/keys.test.ts`
- Create: `app/dashboard/location/_lib/queries.ts`
- Create: `app/dashboard/location/_lib/queries.test.ts`
- Create: `app/dashboard/location/_lib/api.ts`
- Create: `app/dashboard/location/_lib/actions.ts`
- Create: `app/dashboard/location/_lib/actions.test.ts`
- Create: `app/dashboard/location/_lib/hooks.ts`
- Create: `app/dashboard/location/_lib/hooks.test.tsx`

**Interfaces:**

```ts
export type LocationViewModel = {
  id: string;
  businessName: string;
  fullAddress: string;
  country: string;
  city: string;
  area: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};
export type LocationAggregate = {
  title: string;
  canAddLocation: boolean;
  locations: LocationViewModel[];
};
export const locationKeys = {
  aggregate: (scopeId: string) => ["dashboard", "locations", scopeId] as const,
};
export async function saveLocationTitle(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<{ title: string }>>;
export async function updateLocation(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<LocationViewModel>>;
```

Create/delete variants derive dentistry; update DTO contains entity ID, expected `updatedAt`, and address fields only.

- [ ] **Step 1: Write strict schema/key/query tests**

Validate bounded address/business/country/city/area, finite in-range latitude/longitude, entity UUID, ISO expected revision; reject dentistry/user/plan/role/extra fields. Query maps authoritative timestamp and plan-derived capability.

- [ ] **Step 2: Write Action authorization/conflict tests**

Anonymous/owner/cross-user/admin, plan limit, unknown location, forged dentistry, RPC rollback, stale timestamp -> stable `CONFLICT`, and latest row returned on success.

- [ ] **Step 3: Write the mandatory out-of-order hook test**

Start saves A then B. Use mutation `scope: { id: locationId }` so B cannot execute until A settles, or deliberately resolve mocked transport B then A and assert request sequence tokens make A incapable of updating cache/form/Sonner after B. Also assert server `CONFLICT` refetches the aggregate and preserves the current draft.

- [ ] **Step 4: Implement aggregate/GET/Actions/hooks and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/location/_lib --preload ./test/setup.ts
git add app/dashboard/location/_lib
git commit -m "feat(location): add authoritative versioned mutations"
```

### Task 5: Migrate location title/address forms and bounded map island

**Files:**

- Create: `app/dashboard/location/_components/LocationManager.tsx`
- Create: `app/dashboard/location/_components/LocationManager.test.tsx`
- Create: `app/dashboard/location/_components/LocationTitleForm.tsx`
- Create: `app/dashboard/location/_components/LocationTitleForm.test.tsx`
- Create: `app/dashboard/location/_components/LocationAddressForm.tsx`
- Create: `app/dashboard/location/_components/LocationAddressForm.test.tsx`
- Modify: `app/dashboard/location/page.tsx`
- Modify: `app/dashboard/location/GoogleMapAutocomplete.tsx`
- Retire after parity: `AddLocation.tsx`, `ManageLocations.tsx`, `LocationListManager.tsx`, `app/dashboard/components/AddressItem.tsx`
- Modify/remove same-app writes: `app/api/location/route.ts`

- [ ] **Step 1: Write failing RHF/map/preserved-value tests**

Map outputs only an address draft through `value/onChange`; no Supabase/identity. Title/address failure preserves fields/focus; success awaits authoritative row before reset/preview/Sonner; delete confirmation focus; plan limit unchanged.

- [ ] **Step 2: Write mandatory component race test**

Release response B before A and assert only B's business/address/timestamp appears; A's late success/error cannot close/reset/announce/overwrite. Assert reload query receives B.

- [ ] **Step 3: Implement minimal client island and remove three competing owners**

One aggregate Query owns locations/title. RHF owns each draft. Actions replace inline Server Action, browser Supabase, and legacy API write. Remove sleeps and fire-and-forget saves.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/location --preload ./test/setup.ts
! rg -n 'createClient\(|apiClient\.(post|put|delete)|\.from\(' app/dashboard/location --glob '*.{ts,tsx}'
git add app/dashboard/location app/dashboard/components/AddressItem.tsx app/api/location
git commit -m "fix(location): await authoritative conflict-safe saves"
```

This verified product defect requires exactly one plain-language Trello Bug story with High/Medium/Low priority, fixing commit/PR links, Done only after verification, and final read-back per `AGENTS.md`.

### Task 6: E2E race/parity, performance, docs, review, and Trello

**Files:**

- Modify: `e2e/dashboard/shop.spec.ts`
- Modify: `e2e/dashboard/location.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/testing/dashboard-e2e-coverage.md`
- Modify: `docs/frontend-modernization.md`

- [ ] **Step 1: Add product/location E2E**

Product create/edit/upload/toggle/delete/order/reload/failure/cross-owner. Location title/create/edit/delete/reload/limit/failure plus controlled two-save out-of-order release: UI and DB reload retain B, not A.

- [ ] **Step 2: Add critical axe/map/dialog checks**

Labels/errors/focus, map input naming, upload progress, delete/reorder controls, announcements, reduced motion; no unrelated remediation loop.

- [ ] **Step 3: Measure build output**

Run production build and record `/dashboard`, `/dashboard/shop`, `/dashboard/location`, shared, and middleware figures against Phase 2/5 evidence without inventing a budget.

- [ ] **Step 4: Run PR verification**

```bash
/Users/ramezweissa/.bun/bin/bunx prettier --check app/dashboard/shop app/dashboard/location app/api/individual-products app/api/location docs
git diff --check
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/shop.spec.ts e2e/dashboard/location.spec.ts e2e/accessibility.spec.ts --project=chromium
```

- [ ] **Step 5: Review and update both Trello cards**

Use `superpowers:requesting-code-review`, resolve findings, add Phase 6 stacked PR status and check products/locations after read-back. Create/update the one location-race Bug card, attach commit/PR links, move it to Done only after all verification, and verify title/list/labels/description/references.

```bash
git add e2e docs
git commit -m "docs: verify product and location ownership"
```
