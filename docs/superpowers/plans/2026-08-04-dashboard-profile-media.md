# Profile, Socials, Galleries, and Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate bio/profile/social editors, profile-picture upload, galleries, reviews, and external review links onto server-authorized aggregates, Query, RHF/Zod, owner-scoped Storage, and atomic ordering.

**Architecture:** The dashboard root, gallery page, and review page each server-seed one feature aggregate. RHF forms call target-bound Server Actions and Query owns mounted records. Profile pictures retain the established immutable dentistry folder required by public readers; other media uses effective-user-prefixed object paths stored as full URLs. Database mutations queue superseded media cleanup in the same transaction so cleanup can retry without risking authoritative content.

**Tech Stack:** Next.js App Router/Actions, TanStack Query v5, RHF/Zod, typed Supabase, Storage RLS, PostgreSQL transaction functions, Sonner, Bun/Playwright.

## Global Constraints

- Stack on the reviewed treatments/links PR. Shared infrastructure remains lead-owned.
- Preserve the current public profile output and profile-picture dentistry-folder lookup.
- Feature DTOs never contain user ID, dentistry ID, role, rank, arbitrary image URL, or free-form update objects. The effective-user ID is only a bound target hint and is reauthorized.
- Browser Supabase is allowed only in documented upload modules after an authorized path is issued/derived; all table writes use Actions.
- Do not add public caching or dashboard conversion analytics.
- Keep critical focus, error, dialog, upload, and reorder semantics; defer unrelated a11y polish.

---

### Task 1: Add failing RLS, Storage, atomic-order, and cleanup-retry tests

**Files:**

- Create: `supabase/tests/phase6_profile_gallery_review.test.sql`

**Interfaces:**

- Expected functions: `create/update/delete/reorder_dental_gallery`, `create/update/delete/reorder_general_gallery`, `create/update/delete/reorder_review`, and `save_external_review_page`.
- Expected cleanup table: `private.media_cleanup_jobs(user_id uuid, bucket text, object_path text, attempts integer, created_at timestamptz)` accessible only through restricted functions.

- [ ] **Step 1: Write owner/cross-user/admin table policy tests**

Cover `dentistries`, `socials`, `galleries`, `general_galleries`, `reviews`, and `external_review_pages`: preserve public SELECT where current public pages rely on it; deny anonymous writes; allow owner; deny User A against User B; allow secured admin target; reject owner/parent/rank field changes.

- [ ] **Step 2: Write Storage policy tests**

Assert `profile-pics/<dentistryId>/...` writes require ownership of that dentistry or secured admin. Assert gallery/review new writes require `<effectiveUserId>/gallery|review/...`. User A cannot insert/select-for-upsert/update/delete User B paths; upsert has INSERT+SELECT+UPDATE; legacy objects remain publicly readable and writable only by recorded `owner_id` or admin.

- [ ] **Step 3: Write atomic reorder/media cleanup tests**

Exact ID sets only; duplicate/foreign/omitted IDs fail unchanged; ranks commit one-based; concurrent creates get distinct ranks; injected failure rolls back. Update/delete with a superseded media path inserts one cleanup job in the same transaction; retry increments attempts and successful completion removes the job.

- [ ] **Step 4: Run local DB tests and confirm baseline failures**

Run: `/Users/ramezweissa/.bun/bin/bunx supabase test db`
Expected: FAIL because scoped policies/functions/jobs do not exist.

### Task 2: Implement slice RLS, Storage, transaction, and cleanup migration

**Files:**

- Create through CLI: `supabase/migrations/20260803214924_phase6_profile_gallery_review.sql`
- Regenerate: `lib/supabase/database.types.ts`

- [ ] **Step 1: Verify the migration generated through the installed CLI**

Run: `test -f supabase/migrations/20260803214924_phase6_profile_gallery_review.sql`

- [ ] **Step 2: Replace only in-scope permissive write policies**

Use direct `user_id`, dentistry-owner `EXISTS`, and protected admin predicates with `TO authenticated`, `USING`, and `WITH CHECK`. Preserve required public reads. Keep profile presentation column privileges aligned with Foundation's protected-user policy.

- [ ] **Step 3: Add owner-scoped Storage policies**

Policies inspect `storage.foldername(name)` and validate dentistry ownership for `profile-pics`, or effective-user prefix for `gallery-images`/`review-images`. Admin paths call only the protected admin helper. Replace bucket-only/public write policies; retain public object reads used by profiles.

- [ ] **Step 4: Add media cleanup queue and transaction functions**

Create `private.media_cleanup_jobs` with no Data API exposure. Each media update/delete function inserts the old bucket/path before committing the DB change. Restricted functions list current actor jobs, mark attempts, and complete a job; paths must match the effective target and controlled bucket. Add exact-set reorder and locked rank allocation functions for all three ordered families.

- [ ] **Step 5: Restrict, reset, test, lint, and regenerate**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
git add -f supabase/migrations/*phase6_profile_gallery_review.sql supabase/tests/phase6_profile_gallery_review.test.sql lib/supabase/database.types.ts
git commit -m "feat(data): secure profile media and content ownership"
```

### Task 3: Define profile/social aggregate contracts and Actions

**Files:**

- Create: `app/dashboard/_lib/profile/schemas.ts`
- Create: `app/dashboard/_lib/profile/schemas.test.ts`
- Create: `app/dashboard/_lib/profile/keys.ts`
- Create: `app/dashboard/_lib/profile/keys.test.ts`
- Create: `app/dashboard/_lib/profile/queries.ts`
- Create: `app/dashboard/_lib/profile/queries.test.ts`
- Create: `app/dashboard/_lib/profile/api.ts`
- Create: `app/dashboard/_lib/profile/hooks.ts`
- Create: `app/dashboard/_lib/profile/hooks.test.tsx`
- Create: `app/dashboard/_lib/profile/actions.ts`
- Create: `app/dashboard/_lib/profile/actions.test.ts`

**Interfaces:**

```ts
export type ProfileViewModel = {
  user: {
    title: string;
    position: string;
    gdcNo: string;
    qualification: string;
  };
  dentistry: {
    aboutTitle: string;
    aboutText: string;
    phone: string;
    contactEmail: string;
    website: string;
    bookingLink: string;
    bookingEnabled: boolean;
  };
  socials: {
    twitter: string;
    instagram: string;
    facebook: string;
    tiktok: string;
    other: string;
  };
  profilePicture: { objectPath: string | null; publicUrl: string | null };
};
export const profileKeys = {
  detail: (scopeId: string) => ["dashboard", "profile", scopeId] as const,
};
export async function getProfileViewModel(
  scope: DashboardScope,
): Promise<ProfileViewModel>;
export async function saveProfile(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<ProfileViewModel>>;
export async function saveSocialLinks(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<ProfileViewModel["socials"]>>;
```

- [ ] **Step 1: Write strict schema and key tests**

Validate current field limits/normalizers, social URL/handle behavior, safe website/booking/contact values, and reject all authority/extra fields. Assert one immutable key.

- [ ] **Step 2: Write query/Action authorization tests**

Cover anonymous, owner, forged target, admin target, missing dentistry/social row, malformed input, allowed-column-only updates, and controlled ActionResult mapping.

- [ ] **Step 3: Implement server-only aggregate, GET fetcher, Actions, and hooks**

The GET boundary and every Action resolve scope again. Actions update explicit columns only. Hooks use `initialData`/timestamp, mutateAsync, narrow key update/invalidation, and separate preview refresh.

- [ ] **Step 4: Run and commit profile contracts**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/_lib/profile --preload ./test/setup.ts
git add app/dashboard/_lib/profile
git commit -m "feat(profile): add typed dashboard profile boundary"
```

### Task 4: Migrate profile/social RHF forms and formalize profile-picture upload

**Files:**

- Create: `app/dashboard/_components/ProfileEditorForm.tsx`
- Create: `app/dashboard/_components/ProfileEditorForm.test.tsx`
- Create: `app/dashboard/_components/SocialLinksEditorForm.tsx`
- Create: `app/dashboard/_components/SocialLinksEditorForm.test.tsx`
- Create: `app/dashboard/_components/ProfilePictureEditor.tsx`
- Create: `app/dashboard/_components/ProfilePictureEditor.test.tsx`
- Create: `app/dashboard/_lib/profile/uploads.ts`
- Create: `app/dashboard/_lib/profile/uploads.test.ts`
- Modify: `app/dashboard/page.tsx`
- Delete after parity: `app/dashboard/components/ProfileEditor.tsx`
- Delete after parity: `app/dashboard/components/SocialLinksEditor.tsx`
- Delete after parity: `app/dashboard/ProfilePictureUploader.tsx`

**Interfaces:**

```ts
export async function uploadProfilePicture(
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>>;
export async function deleteProfilePicture(): Promise<ActionResult<void>>;
```

- [ ] **Step 1: Write failing RHF behavior tests**

Server field failure preserves all drafts and focuses first invalid field; form failure focuses one Alert; success alone updates the profile key, refreshes preview, resets/closes where current UX does, and shows Sonner.

- [ ] **Step 2: Write failing upload lifecycle tests**

Reject unsupported type/size before upload; derive `<dentistryId>/profile-pic-<uuid>.webp` from server-seeded scope rather than client input; upload new object before removing old; cleanup failure leaves new/latest image authoritative and retryable by listing older files next time; cancel performs no write.

- [ ] **Step 3: Implement forms and documented Storage-only module**

Keep crop/filter state local. The upload module is the only browser Supabase import. After successful upload, Query updates the profile picture and cleanup removes older dentistry-folder objects. Public readers continue listing the same dentistry folder.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/_components app/dashboard/_lib/profile --preload ./test/setup.ts
rg -n 'createBrowserSupabaseClient|\.storage' app/dashboard/_lib/profile app/dashboard/_components/ProfilePictureEditor.tsx
! rg -n '\.from\(' app/dashboard/_components app/dashboard/_lib/profile --glob '*.{ts,tsx}'
git add app/dashboard/page.tsx app/dashboard/_components app/dashboard/_lib/profile
git commit -m "refactor(profile): use RHF query and owned uploads"
```

### Task 5: Build gallery aggregate, Actions, upload module, and Query hooks

**Files:**

- Create: `app/dashboard/gallery/_lib/schemas.ts`
- Create: `app/dashboard/gallery/_lib/schemas.test.ts`
- Create: `app/dashboard/gallery/_lib/keys.ts`
- Create: `app/dashboard/gallery/_lib/keys.test.ts`
- Create: `app/dashboard/gallery/_lib/queries.ts`
- Create: `app/dashboard/gallery/_lib/queries.test.ts`
- Create: `app/dashboard/gallery/_lib/api.ts`
- Create: `app/dashboard/gallery/_lib/actions.ts`
- Create: `app/dashboard/gallery/_lib/actions.test.ts`
- Create: `app/dashboard/gallery/_lib/hooks.ts`
- Create: `app/dashboard/gallery/_lib/hooks.test.tsx`
- Create: `app/dashboard/gallery/_lib/uploads.ts`
- Create: `app/dashboard/gallery/_lib/uploads.test.ts`
- Modify: `app/dashboard/gallery/page.tsx`

**Interfaces:**

```ts
export type GalleryAggregate = {
  dental: DentalGalleryViewModel[];
  general: GeneralGalleryViewModel[];
};
export const galleryKeys = {
  aggregate: (scopeId: string) => ["dashboard", "galleries", scopeId] as const,
};
export async function createDentalGallery(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<DentalGalleryViewModel>>;
export async function reorderDentalGalleries(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>>;
```

The remaining exports are `updateDentalGallery`, `deleteDentalGallery`, `createGeneralGallery`, `updateGeneralGallery`, `deleteGeneralGallery`, and `reorderGeneralGalleries`; each accepts `(targetHint: string, input: unknown)` and returns `Promise<ActionResult<...>>`. Inputs accept verified owner-prefixed object paths, not URLs or owners.

- [ ] **Step 1: Write schema/key/query/Action tests**

Reject extra identity/rank/URL fields, unsupported image metadata, duplicate reorder IDs, forged path, cross-user/admin failures, transaction errors, and missing rows. Assert one aggregate key and narrow rollback/invalidation.

- [ ] **Step 2: Implement aggregate, GET-only refetch, Actions, and hooks**

Resolve scope at every boundary. Create/update call transaction functions; cleanup job processing happens after authoritative mutation and safely retries failures.

- [ ] **Step 3: Implement gallery upload module tests/code**

Use `<effectiveUserId>/gallery/<uuid>.<ext>`, controlled MIME/size, browser Storage only, owner/admin path tests, and return an opaque object path/public URL pair.

- [ ] **Step 4: Run and commit data boundary**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/gallery/_lib --preload ./test/setup.ts
git add app/dashboard/gallery/_lib app/dashboard/gallery/page.tsx
git commit -m "feat(gallery): add owned aggregate and uploads"
```

### Task 6: Migrate gallery dialogs/managers and keyboard ordering

**Files:**

- Create: `app/dashboard/gallery/_components/GalleryManager.tsx`
- Create: `app/dashboard/gallery/_components/GalleryManager.test.tsx`
- Create: `app/dashboard/gallery/_components/DentalGalleryDialog.tsx`
- Create: `app/dashboard/gallery/_components/DentalGalleryDialog.test.tsx`
- Create: `app/dashboard/gallery/_components/GeneralGalleryDialog.tsx`
- Create: `app/dashboard/gallery/_components/GeneralGalleryDialog.test.tsx`
- Modify/delete after parity: existing `AddNewGallery.tsx`, `ManageGalleries.tsx`, and add/edit modal components.

- [ ] **Step 1: Write failing dialog/preserved-draft tests**

Async submit callbacks close only on `ok: true`; upload/action failure retains fields/files/dialog; success updates one aggregate key and refreshes preview; delete confirmation has cancel/focus return.

- [ ] **Step 2: Write failing reorder tests**

Keyboard move controls announce/focus one-based position, submit exact IDs, rollback on failure, support cancel, and disable motion under reduced-motion preference.

- [ ] **Step 3: Implement RHF managers and remove mirrored arrays/legacy callbacks**

Query owns records; local state owns dialog/upload/reorder drafts only. Await upload then authoritative Action; never close on a `void` callback.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/gallery --preload ./test/setup.ts
! rg -n 'apiClient\.(post|put|delete)|\.from\(' app/dashboard/gallery --glob '*.{ts,tsx}'
git add app/dashboard/gallery
git commit -m "refactor(gallery): migrate forms and atomic ordering"
```

### Task 7: Build and migrate reviews/external page end to end

**Files:**

- Create: `app/dashboard/review/_lib/schemas.ts`
- Create: `app/dashboard/review/_lib/schemas.test.ts`
- Create: `app/dashboard/review/_lib/keys.ts`
- Create: `app/dashboard/review/_lib/keys.test.ts`
- Create: `app/dashboard/review/_lib/queries.ts`
- Create: `app/dashboard/review/_lib/queries.test.ts`
- Create: `app/dashboard/review/_lib/api.ts`
- Create: `app/dashboard/review/_lib/actions.ts`
- Create: `app/dashboard/review/_lib/actions.test.ts`
- Create: `app/dashboard/review/_lib/hooks.ts`
- Create: `app/dashboard/review/_lib/hooks.test.tsx`
- Create: `app/dashboard/review/_lib/uploads.ts`
- Create: `app/dashboard/review/_lib/uploads.test.ts`
- Create: `app/dashboard/review/_components/ReviewManager.tsx`
- Create: `app/dashboard/review/_components/ReviewManager.test.tsx`
- Create: `app/dashboard/review/_components/ReviewDialog.tsx`
- Create: `app/dashboard/review/_components/ReviewDialog.test.tsx`
- Create: `app/dashboard/review/_components/ExternalReviewPageForm.tsx`
- Create: `app/dashboard/review/_components/ExternalReviewPageForm.test.tsx`
- Modify: `app/dashboard/review/page.tsx`
- Delete/retire after parity: `AddNewReview.tsx`, `ManageReviews.tsx`, `components/AddReviewModal.tsx`; retain only presentation-safe card code.

**Interfaces:**

```ts
export type ReviewAggregate = {
  reviews: ReviewViewModel[];
  externalPage: { url: string } | null;
};
export const reviewKeys = {
  aggregate: (scopeId: string) => ["dashboard", "reviews", scopeId] as const,
};
export async function saveExternalReviewPage(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<{ url: string }>>;
```

- [ ] **Step 1: Write failing schema/action/query/upload tests**

Validate reviewer/rating/date/content/platform/external HTTPS URL, reject identity/rank/extra fields, cover owner/cross-user/admin, exact reorder rollback, `<effectiveUserId>/review/<uuid>.<ext>` uploads, cleanup queue, and narrow key handling.

- [ ] **Step 2: Implement server boundary and upload module**

Use server initialData and GET-only refetch. Every mutation uses explicit generated types/functions. External page upsert derives owner; it never accepts user ID.

- [ ] **Step 3: Write/implement RHF UI behavior**

Cover rating keyboard semantics, calendar/error focus, failure preservation, async success-only close/reset, preview refresh, delete focus return, and keyboard reorder rollback.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/review --preload ./test/setup.ts
! rg -n 'apiClient\.(post|put|delete)|\.from\(' app/dashboard/review --glob '*.{ts,tsx}'
git add app/dashboard/review
git commit -m "feat(review): own forms uploads and ordering"
```

### Task 8: Verify profile/media slices and update documentation/Trello

**Files:**

- Modify: `e2e/dashboard/bio.spec.ts`
- Modify: `e2e/dashboard/gallery.spec.ts`
- Modify: `e2e/dashboard/review.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/testing/dashboard-e2e-coverage.md`
- Modify: `docs/frontend-modernization.md`

- [ ] **Step 1: Add success/failure/reload/upload/cross-owner E2E**

Bio/social values, profile replacement/delete, gallery/review create/edit/delete/reorder, external page, controlled failures, and reload persistence. Verify public profile output and immutable IDs/one-based positions do not change.

- [ ] **Step 2: Add critical axe/dialog/upload checks**

Scan migrated routes and opened dialogs; verify error relationships/focus, rating/calendar labels, upload progress/status, keyboard reorder, focus return, and reduced motion. Do not expand into unrelated remediation.

- [ ] **Step 3: Run full stacked-PR verification**

```bash
/Users/ramezweissa/.bun/bin/bunx prettier --check app/dashboard/page.tsx app/dashboard/_components app/dashboard/_lib/profile app/dashboard/gallery app/dashboard/review docs
git diff --check
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/bio.spec.ts e2e/dashboard/gallery.spec.ts e2e/dashboard/review.spec.ts e2e/accessibility.spec.ts --project=chromium
```

- [ ] **Step 4: Review, document, update Trello, and commit evidence**

Use `superpowers:requesting-code-review`, resolve findings, record keys/actions/RPCs/upload rules/future tags/analytics exclusions/results, add PR URL/status to card 110, and check the three relevant checklist items after read-back.

```bash
git add e2e docs
git commit -m "docs: verify profile gallery and review ownership"
```
