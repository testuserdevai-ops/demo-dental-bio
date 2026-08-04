# Blogs, Blog Groups, Videos, and Video Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move blog/video groups and content onto typed server aggregates, Query-owned lists, RHF/Zod forms, owner-scoped blog uploads, and atomic group/content ordering.

**Architecture:** Blog and video pages each seed one aggregate query. Target-bound Actions reauthorize, parse explicit DTOs, and call restricted transaction functions for ordered create/delete/reorder. Blog image uploads use effective-user-prefixed Storage paths; DB update/delete queues old media cleanup in the transaction. Existing public blog/video routes and Phase 4 analytics descriptors remain unchanged.

**Tech Stack:** Next.js Actions/GET handlers, TanStack Query, RHF/Zod, Supabase/Postgres/Storage, Sonner, Bun/Playwright.

## Global Constraints

- Stack on the reviewed profile/media PR. Do not edit shared foundation concurrently.
- Preserve public slugs, content, enabled state, immutable IDs, visible one-based positions, and click/analytics behavior.
- Server derives owner/group authority; inputs never mass-assign `updated_data`, owner, rank, or group relationship.
- Browser Supabase appears only in the blog upload module; video has no Storage boundary.
- Remove same-app mutation methods from old routes after repository search proves no second consumer; keep GET only where Query refetch uses it.

---

### Task 1: Add failing database/RLS/Storage/atomic tests and migration

**Files:**

- Create: `supabase/tests/phase6_blogs_videos.test.sql`
- Create through CLI: `supabase/migrations/20260803214925_phase6_blogs_videos.sql`
- Regenerate: `lib/supabase/database.types.ts`

**Interfaces:**

```sql
create function public.create_blog_group(p_user_id uuid, p_name text) returns setof public.blog_groups;
create function public.delete_blog_group(p_user_id uuid, p_group_id bigint) returns void;
create function public.reorder_blog_groups(p_user_id uuid, p_group_ids bigint[]) returns void;
create function public.create_blog(p_user_id uuid, p_group_id bigint, p_title text, p_content text, p_meta_title text, p_meta_description text, p_slug text, p_image_url text, p_enabled boolean) returns setof public.blogs;
create function public.delete_blog(p_user_id uuid, p_blog_id bigint) returns void;
create function public.reorder_blogs(p_user_id uuid, p_group_id bigint, p_blog_ids bigint[]) returns void;
create function public.create_video_group(p_user_id uuid, p_name text) returns setof public.groups;
create function public.delete_video_group(p_user_id uuid, p_group_id bigint) returns void;
create function public.reorder_video_groups(p_user_id uuid, p_group_ids bigint[]) returns void;
create function public.create_video(p_user_id uuid, p_group_id bigint, p_title text, p_url text, p_enabled boolean) returns setof public.videos;
create function public.delete_video(p_user_id uuid, p_video_id bigint) returns void;
create function public.reorder_videos(p_user_id uuid, p_group_id bigint, p_video_ids bigint[]) returns void;
```

- [ ] **Step 1: Write failing SQL tests**

Cover anonymous/owner/cross-user/admin; grouped child ownership; exact-set duplicate/omitted/foreign reorder; rollback/no orphan; concurrent rank allocation; global slug conflict returns controlled failure; direct owner/rank/group reassignment denied; blog-image owner/admin/legacy policies; DB update/delete creates cleanup job atomically.

- [ ] **Step 2: Run tests and confirm failures**

Run: `/Users/ramezweissa/.bun/bin/bunx supabase test db`

- [ ] **Step 3: Implement the CLI-generated migration**

Verify: `test -f supabase/migrations/20260803214925_phase6_blogs_videos.sql`

Replace in-scope permissive writes with direct/group owner predicates. Add locked rank/exact-set functions with fixed search path, explicit caller/target checks, revoked `PUBLIC`/`anon` execute, authenticated grant, and media cleanup job insertion for old blog images. Storage new writes require `<effectiveUserId>/blogs/<uuid>.<ext>`; preserve public reads and owner/admin legacy handling.

- [ ] **Step 4: Reset/test/lint/regenerate and commit**

```bash
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bunx supabase db lint --level warning
/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts
git add -f supabase/migrations/*phase6_blogs_videos.sql supabase/tests/phase6_blogs_videos.test.sql lib/supabase/database.types.ts
git commit -m "feat(data): secure blog and video ordering"
```

### Task 2: Define blog aggregate schemas, keys, queries, Actions, and upload

**Files:**

- Create: `app/dashboard/blog/_lib/schemas.ts`
- Create: `app/dashboard/blog/_lib/schemas.test.ts`
- Create: `app/dashboard/blog/_lib/keys.ts`
- Create: `app/dashboard/blog/_lib/keys.test.ts`
- Create: `app/dashboard/blog/_lib/queries.ts`
- Create: `app/dashboard/blog/_lib/queries.test.ts`
- Create: `app/dashboard/blog/_lib/api.ts`
- Create: `app/dashboard/blog/_lib/actions.ts`
- Create: `app/dashboard/blog/_lib/actions.test.ts`
- Create: `app/dashboard/blog/_lib/hooks.ts`
- Create: `app/dashboard/blog/_lib/hooks.test.tsx`
- Create: `app/dashboard/blog/_lib/upload.ts`
- Create: `app/dashboard/blog/_lib/upload.test.ts`

**Interfaces:**

```ts
export type BlogAggregate = {
  groups: Array<BlogGroupViewModel & { blogs: BlogViewModel[] }>;
};
export const blogKeys = {
  aggregate: (scopeId: string) => ["dashboard", "blogs", scopeId] as const,
};
export async function getBlogAggregate(
  scope: DashboardScope,
): Promise<BlogAggregate>;
export async function createBlog(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<BlogViewModel>>;
export async function uploadBlogImage(
  file: File,
): Promise<ActionResult<{ objectPath: string; publicUrl: string }>>;
```

The remaining exports are `updateBlog`, `deleteBlog`, `createBlogGroup`, `updateBlogGroup`, `deleteBlogGroup`, `reorderBlogs`, and `reorderBlogGroups`; each accepts `(targetHint: string, input: unknown)` and returns `Promise<ActionResult<...>>`.

- [ ] **Step 1: Write strict schema/key/query tests**

Validate group/title/content/meta/slug/image path/enabled inputs; normalize or generate slug using the existing policy; reject IDs not required for entity selection, owner/group reassignment, rank, image URL, and extra fields. Assert sorted one-based aggregate and one stable key.

- [ ] **Step 2: Write Action/hook tests**

Cover reauthorization, subscription gate, owner/admin, missing group/blog, slug conflict, RPC/cleanup failure, `initialData`, no mirrored array, narrow key update/invalidation, and reorder rollback.

- [ ] **Step 3: Write upload tests and implement boundary**

Only controlled MIME/size uploads to `<effectiveUserId>/blogs/<uuid>.<ext>`; forged path/URL rejected; cross-user denied; admin target allowed; failed upload never calls create/update; cleanup jobs retry after committed DB mutation.

- [ ] **Step 4: Implement server aggregate/GET-only boundary/Actions/hooks and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/blog/_lib --preload ./test/setup.ts
git add app/dashboard/blog/_lib
git commit -m "feat(blog): add owned aggregate actions and upload"
```

### Task 3: Migrate blog groups/content forms and keyboard ordering

**Files:**

- Create: `app/dashboard/blog/_components/BlogManager.tsx`
- Create: `app/dashboard/blog/_components/BlogManager.test.tsx`
- Create: `app/dashboard/blog/_components/BlogFormDialog.tsx`
- Create: `app/dashboard/blog/_components/BlogFormDialog.test.tsx`
- Create: `app/dashboard/blog/_components/BlogGroupForm.tsx`
- Create: `app/dashboard/blog/_components/BlogGroupForm.test.tsx`
- Modify: `app/dashboard/blog/page.tsx`
- Retire after parity: `AddNewBlog.tsx`, `ManageBlogs.tsx`, `ManageBlogGroups.tsx`, `components/AddNewGroupForm.tsx`, `components/BlogGroup.tsx`, `app/dashboard/components/AddBlogModal.tsx`, `EditBlogModal.tsx`.

- [ ] **Step 1: Write failing RHF/dialog/media tests**

Failure preserves rich text/meta/image draft and focuses field/Alert; dialog closes/reset/Sonner only after Action success; upload failure blocks mutation; preview refresh is separate; no dashboard analytics event.

- [ ] **Step 2: Write failing group/blog reorder tests**

Keyboard moves exact IDs, announces one-based position, preserves focus, cancels/restores, and rolls back/refetches on failure.

- [ ] **Step 3: Implement Query-owned RHF manager and remove old routes/writes**

Remove copied arrays, raw `fetch`, broad `apiClient` mutations, and void callbacks. Keep GET handler only if hook uses it; remove POST/PUT/DELETE from `app/api/blog-groups/route.ts` and `app/api/blogs/route.ts` after search.

- [ ] **Step 4: Run/static-check/commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/blog --preload ./test/setup.ts
! rg -n 'apiClient\.(post|put|delete)|fetch\("/api/blog|\.from\(' app/dashboard/blog --glob '*.{ts,tsx}'
git add app/dashboard/blog app/dashboard/components app/api/blog-groups app/api/blogs
git commit -m "refactor(blog): migrate forms and atomic ordering"
```

### Task 4: Define video aggregate schemas, keys, queries, Actions, and hooks

**Files:**

- Create: `app/dashboard/video/_lib/schemas.ts`
- Create: `app/dashboard/video/_lib/schemas.test.ts`
- Create: `app/dashboard/video/_lib/keys.ts`
- Create: `app/dashboard/video/_lib/keys.test.ts`
- Create: `app/dashboard/video/_lib/queries.ts`
- Create: `app/dashboard/video/_lib/queries.test.ts`
- Create: `app/dashboard/video/_lib/api.ts`
- Create: `app/dashboard/video/_lib/actions.ts`
- Create: `app/dashboard/video/_lib/actions.test.ts`
- Create: `app/dashboard/video/_lib/hooks.ts`
- Create: `app/dashboard/video/_lib/hooks.test.tsx`

**Interfaces:**

```ts
export type VideoAggregate = {
  groups: Array<VideoGroupViewModel & { videos: VideoViewModel[] }>;
};
export const videoKeys = {
  aggregate: (scopeId: string) => ["dashboard", "videos", scopeId] as const,
};
export async function getVideoAggregate(
  scope: DashboardScope,
): Promise<VideoAggregate>;
export async function createVideo(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<VideoViewModel>>;
```

- [ ] **Step 1: Write strict schema/key/query tests**

Validate group/title/supported video HTTPS URL/enabled and entity IDs; reject owner/group/rank/arbitrary payload changes. Assert group `type` is the controlled video type and one-based mapping.

- [ ] **Step 2: Write Action/hook authorization, initialData, and rollback tests**

Mirror blog cases without Storage. Test group relationship cannot be reassigned and generic group types cannot cross-contaminate Query results.

- [ ] **Step 3: Implement aggregate, GET-only refetch, Actions, hooks, and commit**

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/video/_lib --preload ./test/setup.ts
git add app/dashboard/video/_lib
git commit -m "feat(video): add owned aggregate actions"
```

### Task 5: Migrate video forms/groups and remove generic raw mutations

**Files:**

- Create: `app/dashboard/video/_components/VideoManager.tsx`
- Create: `app/dashboard/video/_components/VideoManager.test.tsx`
- Create: `app/dashboard/video/_components/VideoFormDialog.tsx`
- Create: `app/dashboard/video/_components/VideoFormDialog.test.tsx`
- Create: `app/dashboard/video/_components/VideoGroupForm.tsx`
- Create: `app/dashboard/video/_components/VideoGroupForm.test.tsx`
- Modify: `app/dashboard/video/page.tsx`
- Retire after parity: `AddNewVideo.tsx`, `ManageVideos.tsx`, `ManageVideoGroups.tsx`, `app/dashboard/components/AddVideoModal.tsx`, and video-only uses under `app/components/Group`.

- [ ] **Step 1: Write failing RHF/pending/error/reorder tests**

Cover value preservation/focus, async success-only close/reset, URL errors, group/video delete confirmation, keyboard exact ordering, rollback, preview refresh, and no analytics emission.

- [ ] **Step 2: Implement minimal Query/RHF client islands**

Move group UI route-private unless it remains genuinely domain-neutral. Remove raw `fetch("/api/groups")`, broad API writes, and local fetched-array ownership.

- [ ] **Step 3: Remove same-app mutation methods and static-check**

Search all consumers before reducing `app/api/groups/route.ts` and `app/api/videos/route.ts` to GET-only boundaries.

```bash
/Users/ramezweissa/.bun/bin/bun test app/dashboard/video --preload ./test/setup.ts
! rg -n 'apiClient\.(post|put|delete)|fetch\("/api/groups|\.from\(' app/dashboard/video --glob '*.{ts,tsx}'
```

- [ ] **Step 4: Commit video UI slice**

```bash
git add app/dashboard/video app/dashboard/components app/components/Group app/api/groups app/api/videos
git commit -m "refactor(video): migrate forms and atomic ordering"
```

### Task 6: E2E, critical axe, public parity, docs, and review

**Files:**

- Modify: `e2e/dashboard/blog.spec.ts`
- Modify: `e2e/dashboard/video.spec.ts`
- Modify: `e2e/accessibility.spec.ts`
- Modify: `docs/dashboard-form-data-migration-matrix.md`
- Modify: `docs/dashboard-public-cache-invalidation-matrix.md`
- Modify: `docs/testing/dashboard-e2e-coverage.md`
- Modify: `docs/frontend-modernization.md`

- [ ] **Step 1: Add feature E2E**

Server-seeded first paint, create/edit/delete/order/reload, controlled failure preservation, upload success/failure/cleanup recovery, keyboard focus/announcement, and cross-user denial. Verify public blog/video output, slugs, IDs, enabled filtering, positions, click counters, and analytics descriptors remain unchanged.

- [ ] **Step 2: Add only critical route/dialog axe checks**

Scan blog/video managers and open dialogs without filtering. Fix only regressions caused by the slice.

- [ ] **Step 3: Run PR verification**

```bash
/Users/ramezweissa/.bun/bin/bunx prettier --check app/dashboard/blog app/dashboard/video app/api/blog-groups app/api/blogs app/api/groups app/api/videos docs
git diff --check
/Users/ramezweissa/.bun/bin/bunx supabase db reset
/Users/ramezweissa/.bun/bin/bunx supabase test db
/Users/ramezweissa/.bun/bin/bun run test
/Users/ramezweissa/.bun/bin/bun run typecheck
/Users/ramezweissa/.bun/bin/bun run lint
/Users/ramezweissa/.bun/bin/bun run build
/Users/ramezweissa/.bun/bin/bunx playwright test e2e/dashboard/blog.spec.ts e2e/dashboard/video.spec.ts e2e/accessibility.spec.ts --project=chromium
```

- [ ] **Step 4: Request review, update Trello, and commit evidence**

Use `superpowers:requesting-code-review`, resolve findings, record exact keys/Actions/functions/upload cleanup/future tags/analytics exclusion/results, add PR URL/status to card 110, and check blogs/videos after read-back.

```bash
git add e2e docs
git commit -m "docs: verify blog and video ownership"
```
