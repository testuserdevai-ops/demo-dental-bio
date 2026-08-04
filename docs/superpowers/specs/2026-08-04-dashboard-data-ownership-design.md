# Phase 6 Dashboard Data Ownership Design

Status: approved for implementation under the objective's no-pause approval instruction
Date: 2026-08-04
Foundation branch: `codex/frontend-modernization-06-dashboard-data`
Base: Phase 5 commit `db0dd0e3`
Tracking: [Trello card 110](https://trello.com/c/repWidpH/110-modernize-dashboard-data-ownership-and-content-forms-phase-6)

## 1. Outcome and boundaries

Phase 6 gives ordinary dashboard content one owner at every layer:

- the dashboard layout resolves authenticated actor and effective tenant scope;
- Server Components own the first authorized read;
- TanStack React Query v5 owns mounted remote content after hydration;
- React Hook Form owns field buffers, touched state, focus, and submission state;
- local React state owns only transient dialogs, upload drafts, and reorder drafts;
- typed Server Actions own same-application writes and reauthorize every invocation;
- typed GET Route Handlers exist only where a mounted Query needs a refetch boundary;
- Postgres transactions own coupled entity/link/rank changes;
- browser Supabase remains only for auth lifecycle and explicitly authorized Storage uploads.

The phase migrates, in order: treatments/services; links/link groups; bio/profile/socials; galleries/reviews; blogs/videos; products/locations; referral and any remaining ordinary content forms. Settings/custom domain, verification/Veriff, subscription/billing, and admin forms remain specialized Phase 8 work.

Phase 6 does not enable public caching, public analytics ingestion, an analytics dashboard, broad dependency cleanup, subscription aggregation, or full service-role/admin repository isolation. Dashboard editor controls remain excluded from owner-profile conversion analytics. Phase 4 public descriptor IDs, stable entity IDs, and one-based visible positions must not change.

## 2. Evidence and starting state

- Phase 4 is merged into `develop` at `4b01d551`. Phase 6 starts from the latest Phase 5 branch commit as explicitly allowed.
- The repository already pins Next.js 16.2.12, React 19.2.8, TanStack Query 5.101.4, RHF 7.84.0, Zod 4, Supabase JS 2.112.0, `@supabase/ssr` 0.12.4, and Sonner 2.0.7.
- TanStack Query is installed but not mounted. `DashboardUserContext` still performs a duplicate `POST /api/user` load and exposes a broad `any`-shaped mutable user object.
- Treatments are the Phase 2 RHF/shadcn proof slice, but still mix local mirrored arrays, browser Supabase CRUD, and `/api/treatments`.
- Links and locations still write through browser Supabase. Other managers use broad CRUD Route Handlers and mirrored local collections.
- No canonical generated Supabase `Database` type exists. Browser/server factories and authorization helpers accept unparameterized `SupabaseClient` or `any`; `types.d.ts` hand-maintains selected shapes.
- Existing content RLS write policies are effectively permissive (`USING (true)` / `WITH CHECK (true)`). Storage write policies generally authorize only a bucket, and `profile-pics` has public writes. Browser removal alone is not a sufficient authorization boundary.
- The generic reorder endpoint issues independent writes and can partially commit. Treatment, link, and location create/delete sequences can leave orphaned entities or joins. `getMaxRank`-style allocation races under concurrency.
- The clean Phase 5 tip currently runs 223 unit/component tests successfully and has two pre-existing `use-login-lockout.test.tsx` failures caused by assigning to a readonly DOM `focus` property under the installed Happy DOM runtime. This is baseline evidence, not a Phase 6 regression; Phase 6 exit still requires a green full suite.
- Phase 2 bundle evidence is the comparison baseline: shared 209 kB, `/dashboard` 393 kB, `/dashboard/treatments` 322 kB, treatment route JS 42.6 kB, middleware 126 kB. Phase 5 recorded a successful build and 42 Playwright tests but did not publish a newer route-size table.

## 3. Delivery approach

### Selected: sequential stacked vertical PRs

The foundation branch owns shared primitives, generated types, Supabase factories, identity, Query policy, and migration matrices. Later branches stack explicitly and contain at most two related content families. A consumer branch never edits shared infrastructure concurrently with another agent. Each PR has focused tests, a granular commit history, an updated Trello checklist, and an explicit dependency/base.

### Rejected: one Phase 6 mega-PR

This would make authorization, data-shape, atomicity, and UI parity findings inseparable and would violate the objective's reviewability requirement.

### Rejected: horizontal transport-first or form-first migration

Changing every endpoint before its UI, or every form before its data owner, would create dual owners and long-lived parity gaps. Each feature must move from server read through form, action, invalidation, persistence, preview refresh, tests, and legacy removal in one slice.

## 4. Architecture and file ownership

Shared-by-necessity infrastructure:

```text
lib/
  dashboard/
    identity.ts             # server-only actor/effective-scope resolution
    identity.test.ts
    types.ts                # serializable DashboardScope/ShellViewModel only
  query/
    client.ts               # QueryClient factory and documented defaults
    errors.ts               # typed Query/Action failure bridge
  supabase/
    database.types.ts       # generated canonical contract
    browser.ts              # typed browser factory
    server.ts               # typed server factory, server-only
    admin.ts                # typed existing privileged factory, server-only
app/
  contexts/
    DashboardScopeContext.tsx  # read-only server-seeded identity scope
  dashboard/
    _components/
      DashboardQueryProvider.tsx
```

Feature-private code stays with its route:

```text
app/dashboard/<feature>/
  _components/              # minimal client islands and RHF forms
  _lib/
    keys.ts                 # stable normalized authorized query keys
    schemas.ts              # Zod input contracts and z.infer types
    queries.ts              # server-only reads/repositories
    actions.ts              # Server Actions for same-app mutations
    hooks.ts                # client Query hooks and narrow invalidation
    api.ts                  # client GET fetcher only when Query must refetch
```

Existing `app/api/<feature>/route.ts` GET handlers may remain as genuine Query refetch boundaries. Same-app POST/PUT/DELETE handlers are removed after their Server Action consumer has parity, unless repository search proves a second HTTP consumer. Shared server repositories are called by both the page query and GET handler; Server Actions are never used for reads because Next.js documents Actions as mutation boundaries and queues them.

No top-level `features` or `modules` directory is introduced. Server-only modules import `server-only`. Barrels never mix client and server exports.

## 5. Server-seeded identity and authorization

`resolveDashboardScope(targetUserId?: string | null)` runs only on the server:

1. Create the typed cookie-bound Supabase server client.
2. Call `auth.getUser()` for a fresh server-confirmed identity. Do not authorize from `getSession()` or client context.
3. Load the actor's `public.users` row by immutable `id = auth.uid()` and read the server-owned role.
4. If no target is supplied, effective user is the actor.
5. If a target is supplied, validate it as a UUID, require the actor's server-owned admin role, and prove that the target exists.
6. Load the effective user's single dentistry and construct the minimal serializable scope.

The client seed is deliberately small:

```ts
type DashboardScope = {
  effectiveUserId: string;
  dentistryId: string;
  username: string;
};
```

Actor ID, role, email, session/token values, `isAdmin`, metadata, and billing authority are not serialized into mutation payloads or Query keys. Presentation-only shell data such as subscription label, verification status, and branding preference is a separate server-derived `DashboardShellViewModel` passed to the components that render it. It is never an authorization source.

Every Server Action and GET handler resolves scope again. Submitted `userId`, `dentistryId`, `isAdmin`, email, role, metadata, and query-string target IDs are hints at most and never authority. Non-admin cross-user calls return a controlled forbidden result; pages may redirect, but mutation and HTTP boundaries do not hide authorization failures with redirects.

`DashboardUserContext` and the duplicate `/api/user` read are removed only after Sidebar, RightPanel, RightPanelClient, MobileNavbar, Settings, and VerifyStatus receive equivalent server-derived props or narrow owned state. Settings and verification forms remain Phase 8, but their read dependencies must no longer require the old mutable context. Branding changes use an authoritative action followed by `router.refresh()` rather than `setUser` mutation.

## 6. Query ownership and defaults

`DashboardQueryProvider` wraps only the route-content subtree that contains interactive dashboard feature islands. Sidebar, navigation, auth state, public SSR output, and provider integrations remain outside Query.

One browser `QueryClient` is created per mounted provider with these defaults:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: retryOneTransientFailureOnly,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: false,
      throwOnError: false,
    },
  },
});
```

The query retry predicate retries once only for a network failure or controlled 5xx response. It never retries validation, authentication, authorization, not-found, conflict, or other 4xx failures. Supabase JS now retries transient PostgREST GET/HEAD failures internally, so Query does not add three more retries. Mutations never retry globally because writes may not be idempotent. A feature may opt into a retry only after its idempotency/transaction contract is tested.

There is no global mutation-error toast. Expected Action failures are mapped back into RHF fields or one focusable form Alert; unexpected transport failures use a safe feature Alert. Sonner is used for confirmed success only. Navigation and preview refresh never wait on analytics.

### Query key contract

Keys contain only stable, normalized, serializable resource identity:

```ts
const treatmentKeys = {
  all: ["dashboard", "treatments"] as const,
  list: (scopeId: string, kind: "treatment" | "service") =>
    [...treatmentKeys.all, scopeId, kind] as const,
};
```

`scopeId` is the server-authorized immutable effective-user or dentistry ID chosen consistently per feature. Keys never contain email, token, role, client objects, mutable `URLSearchParams`, free-form URLs, or whole form values. Mutations update or invalidate only the affected list/detail key. Global invalidation is prohibited.

### Initial data versus hydration

- Use `initialData` plus `initialDataUpdatedAt` for a page with one small aggregate per manager. This is the default for treatments, links, profile/socials, gallery/review, blogs/videos, products/locations, and referral.
- Use `dehydrate`/`HydrationBoundary` only when a page proves it has multiple independently keyed queries that sibling client islands must share immediately and the serialized state is smaller/clearer than explicit props.
- A Server Component read failure is handled at the route boundary; failed queries are not dehydrated into a misleading success state.
- Initial data is not copied into `useState`. Reorder drafts may derive a temporary array, but the Query cache remains the remote owner and rollback restores the prior cache snapshot.

These decisions follow current official guidance from [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend), [TanStack SSR/hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr), and [TanStack useQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

## 7. Form, mutation, and feedback flow

Every migrated form uses one Zod schema on both sides and a `z.infer` value type:

1. RHF validates for immediate feedback and owns the draft.
2. The submit handler calls `mutation.mutateAsync(values)`; it does not pass a DOM event or protected identity.
3. The Server Action resolves effective scope, parses the same schema again, and calls a typed repository/transaction.
4. Expected validation/auth/business failures return the shared `ActionResult` with controlled codes, `fieldErrors`, and `formError`.
5. The client maps server errors through the existing ActionResult adapter, focuses the first invalid field in render order, and preserves all values.
6. Success updates or invalidates the narrow feature key, awaits the authoritative result/refetch when required, refreshes the public preview through its separate existing channel, closes a dialog if applicable, and then shows Sonner success feedback.

Forms never clear on failure. Dialog callbacks return `Promise<ActionResult<...>>`, not `void`, so pending, close, and retry behavior follow the actual mutation. Broad `updated_data` payloads are replaced with explicit Zod DTOs; IDs, owner IDs, parent IDs, rank, role, billing, verification, and arbitrary extra keys are rejected.

The known location race is reproduced with two controlled saves whose responses finish out of order. The implementation awaits one authoritative mutation and Query reconciliation; no sleep, button-enabled assertion, or stale callback may declare success. A stale response cannot overwrite the latest cache or form state.

## 8. Primitive contracts before adoption

### Disabled `Button asChild`

An enabled `Button asChild` preserves its child anchor/link semantics. When disabled or pending, it must not retain a navigable `href`, invoke the child's click handler, respond to Enter/Space as an action, or remain in sequential tab order. It exposes `aria-disabled`, pending state, and disabled styling. Focused tests cover native buttons, plain anchors, and composed links.

### Existing-only Field references

Controls inside `Field` include only description/error IDs rendered in that Field instance. A valid field without a description has no invented `aria-describedby`; an invalid field references an error only when `FieldError` exists; custom external IDs are merged without duplicates. The implementation derives registered/rendered subcomponent presence without forcing consumers to create empty description/error nodes. Semantic tests cover every presence combination and dynamic error appearance.

Only critical accessibility behavior is in Phase 6: semantic buttons/links, existing-only relationships, keyboard reorder controls, focus preservation, error focus, announcements, cancellation/rollback, and reduced-motion behavior. Non-critical visual/a11y polish remains Phase 8 and must not cause an unbounded remediation loop.

## 9. Supabase types, RLS, Storage, and atomicity

### Canonical types and factories

The project uses imperative migrations (`schema_paths = []`). Generate `lib/supabase/database.types.ts` from a clean verified local database with:

```bash
bunx supabase gen types typescript --local
```

The generated file is the sole `Database` contract for browser, server, admin, Action/Route, and test clients. Factory return types are inferred from `createBrowserClient<Database>` / `createServerClient<Database>` / `createClient<Database>`. Existing domain view models are explicit `Pick`/mapped shapes derived from generated rows, not hand-maintained table clones. No `any` is introduced through query/action contexts.

After every schema migration: reset the clean local database, regenerate the file, review the diff, run advisors where supported, and verify the migration file is tracked despite global `*.sql` ignore rules. Historical migrations are never edited.

### Minimal proven RLS hardening

Public reads required by current public profiles remain behaviorally intact in Phase 6. Write policies are replaced only for tables migrated by each slice:

- direct owner rows check `auth.uid() = user_id` for ordinary users;
- dentistry-owned child rows use an ownership `EXISTS` predicate through `dentistries.user_id`;
- grouped children validate ownership through their parent group;
- `UPDATE` policies have both `USING` and `WITH CHECK`;
- `TO authenticated` is combined with ownership and is never treated as authorization by itself;
- user profile update privileges exclude authority, billing, Stripe, verification, session, and domain-verification columns;
- the effective-user admin path is checked server-side and again inside any privileged transaction function.

The migration is tested as anonymous, owner, cross-user, and admin. The verified
foundation tightens the design where retained specialized routes still need to
write protected authority: owners and authenticated admin clients remain denied
those columns, while billing, Veriff, and domain routes use a closed server-only
service-role adapter with exact-field methods. Billing transitions use tightly
controlled service-role-only RPCs; cancellation recovery and customer-deletion
tombstones live in the non-exposed `private` schema. Migrations
`20260804005957` through `20260804045730` deliver that additive compatibility
boundary without changing historical migrations. It does not authorize
ordinary service-role bypass or claim the deferred Phase 8 form/repository
redesign is complete.

The database webhook producers depend on four securely provisioned Supabase
Vault entries that migrations intentionally do not create:
`user_changed_webhook_url` is the fully qualified deployed
`/api/webhooks/user-changed` URL and `user_changed_webhook_secret` must exactly
match the deployed application's `WEBHOOK_SECRET`;
`verification_changed_webhook_url` is the fully qualified deployed
`/api/webhooks/verification-changed` URL and
`verification_changed_webhook_secret` must exactly match the application's
`CRON_SECRET_KEY`. Missing, blank, whitespace-only, or unreadable user-change
configuration queues no request and therefore sends no plan-change or account
email; synchronous downgrade-brand enforcement still completes. Missing
verification-change configuration queues no request and sends no verification
email. Skipped notifications and `401` deliveries are not replayed
automatically. Never commit or log a secret.

Deployment must pause plan-changing and verification-changing writes before
deploying or changing either application secret. First wait for
`net.http_request_queue` to become empty and verify every previously recorded
request ID completed successfully, including deliveries from the legacy
hardcoded verification producer and the already-installed user-change producer.
Only then, within the same paused-write window, deploy both handlers and app
secrets, securely provision all four exact Vault names out of band, and verify
only the names with the query below. Apply the producer migrations, then prove
controlled non-production plan and verification changes reach their handlers
before resuming writes. When the migrations already exist, provision and verify
Vault before writes resume.

```sql
select name
from vault.secrets
where name in (
  'user_changed_webhook_secret',
  'user_changed_webhook_url',
  'verification_changed_webhook_secret',
  'verification_changed_webhook_url'
)
order by name;
```

The query must return exactly four rows and must never select secret values.

Rotation must drain asynchronous delivery before changing a secret. With the
relevant writes paused, wait for `net.http_request_queue` to become empty and
verify every previously recorded request ID for both producers completed
successfully. Only then update the application secret and its matching Vault
secret within the paused-write window. Prove a controlled event succeeds for
each rotated producer before resuming writes. A missed or `401` delivery needs
explicit operational recovery.

`pg_net` is one-shot for these producers. It does not automatically retry or
replay an HTTP `5xx`, any other non-2xx response, a timeout or transport
failure, missing/blank configuration, or a downstream provider/email failure.
A `500` from either user-change or verification-change route exposes the
provider/email failure for operational replay; it is not a retry signal and
does not make `pg_net` retry. Operators must monitor restricted `net` response
records, correlate the exact failed event and affected user ID without copying
payload secrets or PII into logs, repair the configuration or provider, and
explicitly replay through an approved idempotent procedure before affected
writes resume or the incident closes. The foundation implements no durable
outbox or automatic delivery-retry mechanism.

The immutable baseline migration still contains a pre-existing literal
verification-webhook credential; Phase 6 does not modify that historical
migration. A later additive Vault migration replaces the runtime producer when
deployed, but the baseline credential remains exposed and must be rotated or
revoked out of band before deployment or production use. The security owner
must separately decide whether repository-history rewrite and a coordinated
full reclone are required; Phase 6 performs neither. Approved secret scanning
must use redacted output and is expected to report the known immutable
baseline/history finding without printing its value. This task performs no
provider-side rotation.

### Storage

New object keys use an immutable authorized owner scope. Gallery, review, blog, and product media use `<effective-user-id>/<feature>/<uuid>.<extension>`. Profile pictures preserve the existing `<dentistry-id>/<uuid>.<extension>` folder contract because current public profile and shell readers resolve that immutable dentistry folder; policy authorization joins the folder dentistry to its owner. Insert/select/update/delete policies require the correct bucket and owner scope; admin cross-user upload is allowed only after validating the actor's secured admin role. Upsert policies include INSERT, SELECT, and UPDATE as required by [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

Legacy objects remain readable. Before changing a write policy, each bucket's existing key and `owner_id` behavior is inventoried locally. Legacy update/delete is allowed only when `owner_id = auth.uid()` or a validated admin rule proves ownership; no service role bypass is added for ordinary failures. Database state is committed before object cleanup. Because Storage deletion cannot share a Postgres transaction, failed cleanup is recorded for explicit retry rather than deleting the old object before the database mutation succeeds.

### Transaction functions

Coupled operations use reviewed database functions when PostgREST cannot provide one atomic boundary:

- treatment/service create+link, unlink+delete, and exact-set reorder;
- link create+link, unlink+delete, group/link exact-set reorder;
- location create+link and unlink+delete;
- ordered creates and reorders for groups, blogs, videos, galleries, reviews, products, and locations when multiple rows/rank allocation are involved.

Functions validate `auth.uid()`, effective target, parent ownership, exact ID set, duplicates, one-based rank range, and affected-row counts. Prefer `SECURITY INVOKER` when RLS can express all writes. A necessary `SECURITY DEFINER` function has a fixed `search_path`, no dynamic identifiers, explicit in-body authorization, revoked default `PUBLIC`/`anon` execute, and only the minimum authenticated grant. No function uses service role to convert an authorization failure into success.

Concurrent creates cannot produce duplicate ranks. Reorder either commits the complete exact set or changes nothing. Stable entity IDs are preserved; analytics-visible positions remain one-based after filtering/sorting.

## 10. Complete form and data migration matrix

| Owner                  | Current surfaces                                                                                                       | Phase 6 target                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Treatments/services    | `treatments/AddTreatment.tsx`, `TreatmentManager.tsx`, `ManageTreatments.tsx`, `ManageServices.tsx`, `/api/treatments` | RHF proof UI retained and completed with typed queries/actions, atomic create/delete/reorder, Query cache, keyboard reorder, no browser CRUD.                    |
| Links/groups           | `links/components/{AddLinkForm,AddLinkGroupForm,LinkGroup,LinkItem,LinksPageClient,ManageLinkGroups}.tsx`              | RHF/Zod forms, feature aggregate Query, explicit DTO actions, atomic entity/join/rank operations.                                                                |
| Bio/profile/socials    | dashboard `page.tsx`, `components/{ProfileEditor,SocialLinksEditor}.tsx`, `ProfilePictureUploader.tsx`                 | Split server-only profile query/actions and small RHF client editors; formal owner-path Storage boundary for profile image; preserve public preview/output.      |
| Galleries              | `gallery/AddNewGallery.tsx`, `ManageGalleries.tsx`, add/edit gallery modal components                                  | RHF/Zod modal promises, typed gallery/general-gallery keys/actions, owner-path uploads, atomic rank changes and rollback.                                        |
| Reviews                | `review/{AddNewReview,ManageReviews}.tsx`, `review/components/AddReviewModal.tsx`, external review page form           | One reviews aggregate including external page, RHF/Zod, typed actions, owner-path image upload, exact reorder.                                                   |
| Blogs/groups           | `blog/{AddNewBlog,ManageBlogs,ManageBlogGroups}.tsx`, blog group forms, shared Add/EditBlogModal                       | RHF/Zod, typed actions/queries, owner-path blog images, atomic ordered operations, explicit slug/title/content DTO.                                              |
| Videos/groups          | `video/{AddNewVideo,ManageVideos,ManageVideoGroups}.tsx`, shared AddVideoModal and Group components                    | RHF/Zod, typed actions/queries, exact group/video reorder, no raw `fetch` form contract.                                                                         |
| Products/shop          | `shop/components/{AddIndividualProduct,AddIndividualProductModal,ManageIndividualProducts}.tsx` and cards              | RHF/Zod, typed actions/queries, owner-path product images, exact ordered operations.                                                                             |
| Locations              | `location/{AddLocation,ManageLocations,LocationListManager}.tsx`, `components/AddressItem.tsx`, map autocomplete       | One server-authorized data owner, RHF/Zod address/title contracts, atomic create/link/delete, authoritative race-safe save, map kept as a bounded client island. |
| Referral               | `referral/InviteEmailForm.tsx` and referral page reads                                                                 | RHF/Zod typed invitation action, server-derived referral identity/link, preserved values and provider-safe errors; no caller-authorized email/name/link.         |
| Shell non-data forms   | RightPanel's decorative `<form>` wrapper and equivalent semantic wrappers                                              | Remove or replace mechanically with semantic link/button; no Query state and no analytics event.                                                                 |
| Settings/custom domain | `settings/SettingsForm.tsx`, `UsernameInput.tsx`, completed recovery form, `domain/DomainClient.tsx`                   | Explicit Phase 8 defer. Only remove dependence on DashboardUserContext; do not redesign these forms.                                                             |
| Verification/Veriff    | verification components and Veriff session actions                                                                     | Explicit Phase 8 defer. Only provide equivalent server-seeded shell read data.                                                                                   |
| Subscription/billing   | SubscriptionClient, billing, payment, plan, history components                                                         | Explicit Phase 8 defer; retain Stripe-specific HTTP boundaries.                                                                                                  |
| Admin                  | `app/admin/**` forms and controls                                                                                      | Explicit Phase 8 defer; no ordinary dashboard migration claims.                                                                                                  |

For every row completed in Phase 6, the migration matrix records: server first-read owner, Query key, mutation boundary, Zod schema, atomicity rule, upload rule, narrow invalidation, public-preview behavior, future Phase 7 public tags, tests, analytics exclusion, and legacy code removed.

## 11. Phase 7 public-cache invalidation matrix

Phase 6 does not call public cache APIs. It records future precise tags for every successful mutation:

| Mutation family                            | Future profile tag           | Future entity tags                                                             |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------ |
| Profile, dentistry, socials, profile image | `public-profile:<profileId>` | `profile:<profileId>`, `socials:<profileId>`                                   |
| Treatments/services                        | `public-profile:<profileId>` | `treatments:<profileId>`, `treatment:<entityId>`                               |
| Links/groups                               | `public-profile:<profileId>` | `links:<profileId>`, `link-group:<groupId>`, `link:<entityId>`                 |
| Galleries                                  | `public-profile:<profileId>` | `galleries:<profileId>`, `gallery:<entityId>`                                  |
| Reviews/external page                      | `public-profile:<profileId>` | `reviews:<profileId>`, `review:<entityId>`, `external-review-page:<profileId>` |
| Blogs/groups                               | `public-profile:<profileId>` | `blogs:<profileId>`, `blog-group:<groupId>`, `blog:<entityId>`                 |
| Videos/groups                              | `public-profile:<profileId>` | `videos:<profileId>`, `video-group:<groupId>`, `video:<entityId>`              |
| Products                                   | `public-profile:<profileId>` | `products:<profileId>`, `product:<entityId>`                                   |
| Locations                                  | `public-profile:<profileId>` | `locations:<profileId>`, `location:<entityId>`                                 |

`profileId` and entity IDs are immutable database identifiers, not username, email, URL, or mutable position. Phase 7 may map these to username/domain-aware cache keys after its public read model is designed.

## 12. Testing, review, and verification

Each slice follows TDD and stops for a focused review checkpoint:

- primitive semantics and dynamic ID relationships;
- schema valid/invalid/extra-field cases;
- server action malformed, anonymous, owner, cross-user, and admin cases;
- query key stability, `initialData`, narrow invalidation, no mirrored remote array;
- preserved values, first-error focus, focusable form Alert, success reset/close;
- mutation failure rollback, stale/concurrent response behavior, exact reorder set;
- transaction failure injection and no orphan/partial rows;
- Storage owner/cross-user/admin upsert and cleanup retry behavior;
- keyboard reorder, focus restoration, announcement, cancel, and reduced motion;
- feature Playwright success/failure/reload and only critical axe regression checks.

The existing dashboard fixture's `/api/user` readiness wait is replaced when server-seeded identity lands. Static checks prove direct dashboard Supabase CRUD is gone except auth and documented Storage modules. Public-profile Playwright assertions prove output, immutable IDs, and one-based analytics positions remain unchanged.

Before each PR: touched-file Prettier, `git diff --check`, focused unit/action/component tests, non-incremental typecheck, lint without warning growth, relevant Playwright, and critical axe coverage. Before Phase 6 completion: complete unit suite, typecheck, lint, production build, all Playwright, all axe coverage, clean local Supabase reset, generated-type diff review, advisors where supported, anonymous/owner/cross-user/admin database tests, and dashboard route/bundle measurements against Phase 2/5 evidence.

The lead reviews all delegated work. Shared providers, query infrastructure, Supabase factories/types, authorization helpers, design primitives, migrations, and documentation remain lead-owned. Agents receive non-overlapping feature/test files and coordinate through the append-only cooperation notes.

## 13. PR stack and decision record

1. **Foundation** — exact branch `codex/frontend-modernization-06-dashboard-data`: primitive contracts, generated types, typed factories, effective identity, Query provider/defaults, shell parity, full inventory/matrices.
2. **Treatments + links** — stacked branch with slice-specific RLS/transaction migrations, Query/RHF/actions, reorder, negative and E2E tests.
3. **Profile/socials + galleries/reviews** — profile contracts, upload ownership, media failure recovery, Query/actions/forms.
4. **Blogs + videos** — group/content schemas, typed actions/queries, media ownership, atomic ordering.
5. **Products + locations** — product uploads/order and the authoritative location race fix with atomic location linking.
6. **Referral + completion** — invitation form, residual ordinary-form inventory closure, full verification, performance evidence, documentation, final Trello read-back.

Decisions approved without a user wait, per objective:

- sequential stacked PRs rather than a mega-PR;
- server-seeded read-only scope context, not Query-owned auth identity;
- `initialData` by default, hydration only for proven multi-query pages;
- GET Route Handlers only for genuine Query refetch; Server Actions for same-app writes;
- 30-second Query freshness, one transient read retry, no mutation retry or global error toast;
- minimal required RLS/Storage hardening is in scope because current policies are proven permissive;
- transaction functions only for coupled/ranked operations, with restricted privilege and negative tests;
- critical accessibility contracts only; non-critical remediation remains Phase 8;
- public caching is documented through future tags but not enabled.

## 14. Verified foundation-checkpoint deviation

The approved foundation verification requires a green full unit suite before
the focused Playwright command. On 2026-08-04, after a clean local database
reset and a passing 18-test pgTAP suite, the original run returned 257 pass, 13
fail, and 4 module-load errors. The isolated-suite correction then produced 281
pass and 0 fail, including both former Happy DOM readonly-`focus` cases.
An intermediate rerun then exposed primitive-test lint errors, build-time mail
configuration, and calendar-dialog contrast failures. After the reviewed
corrections and authority hardening, the fresh gate at implementation HEAD
`819f150` aligns and replays 29 migrations through `20260804045730` and passes
194/194 pgTAP assertions. Generated database types match exactly at 1,646
lines and SHA-256
`d90c727f5eed4bc0b486e55d2e8e948e31080c994786d224df511e0061322ca5`.
Bun passes 429/429 tests with 1,464 expectations across 76 files;
non-incremental TypeScript passes; ESLint reports zero errors and 85 warnings
against the Phase 5 baseline of 87; tracked-file Prettier and
`git diff --check` pass. The safe `env -i` local-only production build
generates 87/87 entries, and configured Chromium navigation plus axe passes
21/21 across all configured axe checks. Final `pg_net` queue/history counts are
0/0. The only database-lint findings are the unchanged pre-Phase6
`increment_click_counter` and `fn_audit_write`; the 72 advisor `WARN` results
contain no Phase 6 private/authority match. The Sentry plugin emits its generic
telemetry notice despite disabled Next telemetry, but no token is configured and
no release, source-map upload, telemetry event, production, or provider call
occurs. Historical migrations have zero Phase 6 commits/diff, and temporary
corrective commits are absent from the final branch. Production analytics
emission and public-cache invalidation remain disabled.
