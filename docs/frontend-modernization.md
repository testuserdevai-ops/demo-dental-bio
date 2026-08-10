# Dentalbio frontend modernization

Status: Phase 6 dashboard data foundation implemented and locally verified

Audit date: 2026-08-04

Architecture base: Phase 5 commit `db0dd0e3` on branch `codex/frontend-modernization-05-account-forms`

Current phase base: Phase 5 commit `db0dd0e3` on branch `codex/frontend-modernization-05-account-forms`

Current phase branch: `codex/frontend-modernization-06-dashboard-data`

## Purpose and constraints

This document is the decision record and migration map for modernizing the existing frontend without rewriting the product or upgrading the Next.js, React, or Tailwind major versions. It covers the current implementation, the target ownership boundaries, dependency sequencing, representative migrations, baseline verification, risks, and deferred decisions.

The migration must preserve Supabase authentication and row-level security (RLS), custom domains, white-label brands, public profiles and SEO, subscriptions, verification, uploads, admin behavior, and existing metadata. Secret and service-role credentials remain server-only. A service-role client is allowed only in an explicitly authorized privileged repository; it is never a workaround for a normal user request failing RLS.

### Executive findings

- The repository contains 487 tracked files: 242 TSX and 145 TypeScript files. Of the TS/TSX under `app`, 146 are explicit Client Components. The dashboard ships a 393 kB first load and the shared first-load baseline is 209 kB.
- UI behavior is fragmented across at least four button families, four modal shells plus feature-local overlays, three switch components, multiple date/input implementations, seven CSS files, two icon families, and three notification systems.
- Form state and validation are handwritten. Zod exists and is used by newer flows, but React Hook Form and its resolver are absent.
- Server rendering is already used for public, dashboard, and admin initial reads, but those reads frequently coexist with duplicate client-side Supabase requests and local copies of server state.
- There are 63 API route handlers, about 20 inline or module-level Server Actions, and widespread direct Supabase calls from route components and Client Components. No TanStack React Query cache or query-key convention exists.
- The current test command discovers Playwright files and fails, lint is interactive because ESLint is unconfigured, and typecheck fails once a production build has generated the dashboard layout route types. The production build itself succeeds. These are baseline issues, not Phase 1 regressions.
- Two authenticated generic revalidation endpoints accept caller-supplied paths without proving path ownership. Service-role code is not explicitly marked server-only. Both are high-priority security boundary work.
- Phase 8 removes all eight previously tracked `supabase/.temp/*` files from version control while preserving the ignored local files on disk; deployment tooling does not depend on tracked local project metadata.

## Target architecture

### Component-system decision

**Decision: adopt shadcn/ui as Dentalbio's component system.** Components are copied into and owned by this repository under `app/components/ui`; shadcn/ui is not consumed as a competing runtime component package. Use its Radix-backed accessibility and composition patterns, Tailwind styling, CVA variants, and `cn()` class composition. Keep Phosphor as the standardized icon library rather than accepting generated Lucide imports. Existing Headless UI, Flowbite, Bootstrap UI styling, bespoke primitives, and duplicate toast systems are migration sources, not parallel target systems.

Phase 2 will initialize/configure shadcn/ui for the existing Next.js 14, React 18, and Tailwind 3 stack, then add primitives individually. Generated code must be reviewed and adapted to the semantic Dentalbio tokens, white-label requirements, form/error contract, and tests defined below. Do not bulk-add the component catalog.

### Ownership decision table

| Concern                               | Owner                                    | Rules                                                                                                                                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public profile and initial route data | Server Components                        | Read through typed server-only feature query modules. Render public profiles and metadata on the server. Pass only serializable view models to Client Components.                                                                                                                           |
| Same-application mutations            | Server Actions                           | Prefer for form submissions and UI mutations that are invoked only by this Next.js application, do not require a public HTTP contract, and can derive authorization from the server session. Validate with the same Zod schema as the client and revalidate owned tags/paths after success. |
| HTTP integrations                     | API route handlers                       | Keep for webhooks, callbacks, cron, public analytics, uploads/streaming, downloads, externally called endpoints, and stable HTTP resources needed by multiple clients. Authenticate and authorize in the handler; never trust a caller-supplied user or path.                               |
| Interactive dashboard server state    | TanStack React Query v5                  | Own post-hydration lists, detail records, polling, pagination, mutation state, and invalidation for interactive dashboard islands. Seed from Server Component data where useful. Do not use it as a global store or to refetch server-known public-profile data.                            |
| Forms                                 | React Hook Form + Zod                    | Zod is the authoritative input contract. Use `zodResolver`; infer TypeScript types from schemas; map action/route field errors into RHF. Browser validation is a convenience, not the authority.                                                                                            |
| Local UI state                        | `useState` or reducer                    | Use `useState` for small transient state such as an open panel. Use a reducer when several events transition a local workflow (multi-step form, upload queue, editor state). Do not put server records into a reducer.                                                                      |
| Cross-tree client UI state            | React context                            | Limit to stable, low-frequency UI services or server-seeded values needed across a subtree: brand, preview mode, navigation affordances, and the single toast surface. Context must not become a collection cache.                                                                          |
| Shareable navigation state            | URL                                      | Use typed parsers for filters, pagination, tabs, return targets, and authorized admin impersonation. The server is authoritative for security-sensitive values such as `userId`. Do not maintain parallel context/local copies.                                                             |
| Supabase access                       | Server-only feature data modules         | Centralize typed queries by feature. Server Components, Actions, and route handlers call these modules. Browser Supabase is limited to auth lifecycle and explicitly designed direct-to-Storage upload flows. Service role is imported only by audited `server-only` modules.               |
| Next.js cache                         | Server query modules + mutation boundary | Use `unstable_cache`/future stable cache APIs and tags for public/CMS read models; use request memoization for repeated reads in one render. Revalidate exact tags/paths only after an authorized successful mutation. Never expose a generic revalidation endpoint.                        |

### Server Action versus API route

Choose a Server Action when every answer below is yes:

1. The only caller is this Next.js UI.
2. The operation is a user-initiated mutation or form submission.
3. Authentication and effective-user authorization can be derived at the action boundary.
4. The payload is serializable and does not require streaming, a public URL, provider signatures, special response headers, or long-lived polling.
5. The mutation can return the standard action result and perform narrow cache invalidation.

Choose an API route when any of these apply:

- A provider, webhook, cron job, another application, or a public browser event calls it.
- It is a cacheable/readable HTTP resource, file upload/download, stream, callback, or signed endpoint.
- The caller needs HTTP status, headers, idempotency keys, content negotiation, or a stable URL contract.
- React Query needs an HTTP query function and no Server Component can own the read.

Do not maintain both an Action and a route for the same UI mutation unless they share one typed service function and there is a demonstrated second caller.

### React Query versus Server Component data

Use a Server Component query for first paint, metadata, authorization gates, public/SEO content, and data that changes only after navigation or an Action. Use React Query when a mounted dashboard island must refetch, paginate, poll, optimistically update, coordinate mutations, or share server state across sibling Client Components.

The default route pattern is:

1. Server Component authenticates, authorizes, and loads an initial typed view model.
2. It renders static/server-owned content directly and passes initial data into the smallest interactive Client Component.
3. The client island uses one feature query key and invalidates that key after mutation.
4. Server mutation code invalidates the corresponding public/cache tag as a separate concern.

Do not fetch the current dashboard user again after hydration when the layout already resolved it. Do not put query data into context or copy it to local state without an editor-specific reason.

### Target folder structure

```text
app/
  (public)/...                    # route composition and Server Components
  components/
    forms/                        # shared React form/error adapters
    ui/                           # owned, lowercase primitives
      button.tsx
      dialog.tsx
      field.tsx
      input.tsx
      select.tsx
      switch.tsx
  dashboard/...                   # route composition; minimal client boundaries
  api/.../route.ts                # externally addressable HTTP boundaries only
  contexts/                       # application-wide providers
  <route>/_components/            # route-private interactive components
  <route>/_lib/                   # route-private implementation
lib/
  auth/                           # shared account contracts and server policy
  forms/                          # ActionResult and validation mapping
  query/                          # QueryClient/provider/hydration policy
  supabase/                       # canonical browser/server/admin factories
```

Route folders may retain colocated route-only components. A component moves to
`app/components/ui` only when it is an application-owned, domain-free
primitive. Shared browser-neutral contracts and server policy belong in `lib`;
shared React behavior belongs in `app/components`. Do not introduce a one-off
top-level feature taxonomy or create barrels that obscure server/client
boundaries.

### Naming and composition

- Files in `app/components/ui` and shared infrastructure use lowercase kebab-case; React exports use PascalCase.
- Hooks start with `use`; Zod schemas end in `Schema`; serializable read models end in `ViewModel`; Action results use `ActionResult<T>`.
- Server-only files import `server-only` and never export a browser Supabase instance. Client entry points declare `"use client"` at the smallest practical boundary.
- Primitives forward refs, accept native element props, and expose behavior through composition and variants rather than feature-specific booleans.
- Icon-only buttons require an accessible name. Dialog content requires a title, initial focus strategy, Escape handling, focus containment/restoration, and a labelled close control.
- Native `select` is preferred for simple short option lists. Use the owned Radix-backed Select only when richer interaction is required.

### Design tokens and variants

Keep the current brand values initially, but expose them through semantic CSS variables consumed by Tailwind. This prevents a visual rewrite and supports white-label overrides.

Required semantic token groups:

- Surfaces: `background`, `foreground`, `card`, `popover`, `muted` and their foreground pairs.
- Actions: `primary`, `secondary`, `accent`, `destructive` and foreground pairs.
- Controls: `border`, `input`, `ring`, `disabled`, `placeholder`.
- Status: `success`, `warning`, `info`, `destructive` and foreground pairs.
- Shape and motion: `radius-sm/md/lg/full`, focus-ring width, transition duration, overlay, and elevation.
- Brand: a small explicit layer for brand gradient/accent values resolved by the server-side domain configuration.

Do not convert colors to OKLCH or add dark mode during the foundation phase; first preserve current computed colors and verify contrast. Remove the global `input { outline: none !important; }` rule as soon as primitives provide a consistent `focus-visible` ring.

Use CVA for finite visual variants and `cn()` backed by `clsx` plus `tailwind-merge` for class composition. Initial variant contracts:

- `Button`: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; sizes `sm`, `default`, `lg`, `icon`; explicit pending/disabled behavior.
- `Alert`: `default`, `success`, `warning`, `destructive`.
- `Badge`: `default`, `secondary`, `success`, `warning`, `destructive`, `outline`.
- `Input`/`Textarea`/`Select`: default and invalid state through `aria-invalid`, not a separate visual API.
- `Dialog` and `AlertDialog`: semantic behavior first; size is a content class, not separate modal implementations.

Components are copied and owned in this repository; shadcn is not a runtime component framework. Add only the Radix packages required by adopted primitives. Phosphor remains the icon library even if copied examples use another icon set.

### Form and error contract

Each migrated form has one Zod schema shared by client parsing and its server boundary. RHF owns field values, touched/dirty state, and pending UI. The server parses again and derives protected fields such as user ID from the authenticated session.

```ts
type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: string;
      formError?: string;
      fieldErrors?: Record<string, string[]>;
    };
```

Rules:

- `fieldErrors` keys are schema paths and values are message arrays from Zod flattening; the UI displays the first message but preserves the full contract.
- A field renders label, optional description, control, and error with stable IDs. Invalid controls set `aria-invalid` and reference error/description IDs with `aria-describedby`. Error text uses `role="alert"` only when introduced after interaction.
- `formError` renders once in a form-level Alert and receives focus after a failed submission when no invalid field can receive focus.
- Expected validation/auth/business failures return `ActionResult`; unexpected failures are logged server-side and return a safe message. Never toast a field validation error.
- Success may close a dialog and show a Sonner toast. Destructive confirmation remains an AlertDialog, not a toast or blocking notification context.
- Mutations do not clear values until success. Existing treatment description behavior is the reference for reset-on-success/preserve-on-failure.

### Query-key and invalidation convention

Every feature defines a key factory and includes the authorization/tenant scope that changes the result:

```ts
export const treatmentKeys = {
  all: ["treatments"] as const,
  lists: () => [...treatmentKeys.all, "list"] as const,
  list: (scope: string, filters: TreatmentFilters) =>
    [...treatmentKeys.lists(), scope, filters] as const,
  details: () => [...treatmentKeys.all, "detail"] as const,
  detail: (scope: string, id: string) =>
    [...treatmentKeys.details(), scope, id] as const,
};
```

Keys contain stable, serializable, normalized values; never include tokens, emails, Supabase clients, non-normalized `URLSearchParams`, or mutable objects. `scope` is the authorized effective-user/tenant identifier supplied by the server. Mutations invalidate the narrowest list/detail keys. Global `queryClient.invalidateQueries()` is prohibited.

Server cache tags use `<feature>:<scope>` and `<feature>:<scope>:<id>`, for example `public-profile-data:alice` and `treatments:user-uuid`. Public-profile data cached by username must be brand-neutral; host/domain configuration is applied outside that cache. If a cached view contains brand-specific values, normalized brand/domain becomes part of both the cache key and tag.

On Next 14.2, derive headers, cookies, effective user, username, and brand at the route boundary and pass primitive arguments into `unstable_cache`; do not call `headers()` or `cookies()` inside its callback. Dynamic per-scope tags require constructing the cached function with that scope in its key/tag closure or falling back to an exact `revalidatePath`. Route paths are revalidated only when route output—not merely a client query—depends on the mutation.

## Inventory and migration matrix

Disposition meanings: **Keep** is already directionally correct; **Adapt** preserves useful code behind the target contract; **Replace** moves behavior to a target primitive/owner; **Remove after migration** deletes a duplicate only after all consumers move and verification passes.

### Forms, fields, and validation

| Current implementation        | Inventory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Disposition                               | Target / risk                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod validation                | `lib/validation.ts`, `lib/treatmentDescription.ts`, `utils/functions/socialMediaProfiles.ts`, `utils/registrationUrl.ts`                                                                                                                                                                                                                                                                                                                                                                                                   | **Keep / Adapt**                          | Put capability schemas under `lib/<capability>`; use Zod as the authoritative contract. Preserve tested normalization and treatment reset behavior.                                            |
| Dashboard field primitives    | `app/dashboard/components/LabeledInput.tsx`, `LimitedTextArea.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **Adapt**                                 | Seed owned Field/Input/Textarea primitives. Preserve helper/error IDs, character count, `aria-describedby`, and tests.                                                                         |
| Registration controls         | `app/register/CustomButton.tsx`, `CustomDayPicker.css`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **Adapt**                                 | The unused CustomInput was removed after a repository-wide consumer scan; retain the approved date/calendar behavior in its dedicated field.                                                   |
| Specialized controls          | `app/components/DatePicker/DatePicker.tsx`, `OtpInput.tsx`, `TextEditor/RichTextEditor.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                | **Adapt**                                 | Keep bounded adapters; audit keyboard/paste/focus for OTP, and expose normal value/error APIs.                                                                                                 |
| Account/map controls          | `app/dashboard/settings/UsernameInput.tsx`, `app/dashboard/location/GoogleMapAutocomplete.tsx`, `MapLoader.tsx`                                                                                                                                                                                                                                                                                                                                                                                                            | **Adapt**                                 | Compose the account field from owned Field/Input; keep Maps loading, selection and failure behavior feature-bound and lazy.                                                                    |
| Upload controls               | `app/dashboard/ProfilePictureUploader.tsx`, `utils/supabase/useUppyWithSupabase.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Adapt**                                 | Share preview/status/error behavior. Browser Supabase remains allowed only for the explicit Storage upload path. The unused `ImageUploader` was removed after a repository-wide consumer scan. |
| Auth/account forms            | `app/login/page.tsx`, `app/admin-login/page.tsx`, `app/register/page.tsx`, `app/register/email-success/page.tsx`, `app/forgot-password/page.tsx`, `app/dashboard/settings/ForgotPasswordForm.tsx`, `SettingsForm.tsx`, `app/components/home-page/ClaimForm.tsx`                                                                                                                                                                                                                                                            | **Adapt**                                 | Migrate to RHF/Zod and standard ActionResult. Preserve server auth actions and registration brand routing.                                                                                     |
| Profile/referral/domain forms | `app/dashboard/components/ProfileEditor.tsx`, `SocialLinksEditor.tsx`, `RightPanelClient.tsx`, `AddressItem.tsx`, `app/dashboard/referral/InviteEmailForm.tsx`, `app/dashboard/domain/DomainClient.tsx`                                                                                                                                                                                                                                                                                                                    | **Adapt**                                 | Compose owned fields; remove parallel pending/error implementations.                                                                                                                           |
| Content forms                 | `app/components/Group/{AddNewGroupForm,Group}.tsx`; `app/dashboard/blog/components/{AddNewGroupForm,BlogGroup}.tsx`; `app/dashboard/components/{AddBlogModal,EditBlogModal,AddVideoModal}.tsx`; gallery add/edit modal files; links `AddLinkForm.tsx`, `AddLinkGroupForm.tsx`, `LinkGroup.tsx`; location `AddLocation.tsx`, `LocationListManager.tsx`; review `ManageReviews.tsx`, `AddReviewModal.tsx`; shop `AddIndividualProductModal.tsx`; treatments `AddTreatment.tsx`, `ManageServices.tsx`, `ManageTreatments.tsx` | **Replace shells / Adapt feature fields** | Approximately 40 form-bearing files hand-roll values and errors. Migrate one feature slice at a time; do not create a generic domain form.                                                     |
| Form framework                | No `react-hook-form`, `@hookform/resolvers`, or `useForm` usage                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **Add in Phase 2**                        | One approved framework; no competing form state library.                                                                                                                                       |

### Buttons, selection, and overlays

| Current implementation          | Inventory                                                                                                                                                                                                                                                                                                     | Disposition                               | Target / risk                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rounded buttons                 | `app/components/Button/FullRoundedButton.tsx`, `RoundedButton.tsx`                                                                                                                                                                                                                                            | **Adapt**                                 | Seed one CVA Button and preserve current appearance as variants.                                                                                                                     |
| Feature submit buttons          | `app/dashboard/components/SaveButton.tsx`, `app/register/CustomButton.tsx`, login/admin-login/email-success `SubmitButton.tsx`                                                                                                                                                                                | **Replace / Remove after migration**      | Duplicate pending/disabled/spinner behavior.                                                                                                                                         |
| Icon button                     | `app/dashboard/components/IconButton.tsx`                                                                                                                                                                                                                                                                     | **Adapt**                                 | Require accessible name, visible focus, tooltip only as supplemental text.                                                                                                           |
| Feature utility actions         | `app/components/Button/GotoDashboard.tsx`, `app/dashboard/components/CopyButton.tsx`, `SocialProfileVisitButton.tsx`, `app/dashboard/referral/ReferralButton.tsx`, `app/dashboard/verification/components/VerifyButton.tsx`                                                                                   | **Adapt behavior / Replace presentation** | Preserve navigation/copy/visit/verify behavior while composing owned Button/IconButton and pending states.                                                                           |
| Switches                        | `app/dashboard/components/Switch.tsx`, `app/components/Switcher.tsx`, `TooltipSwitcher.tsx`                                                                                                                                                                                                                   | **Replace / Remove after migration**      | One Radix-backed Switch. Current default ID can collide; require generated/consumer ID and associated label.                                                                         |
| Dropdown/select                 | Native selects embedded in feature forms                                                                                                                                                                                                                                                                      | **Adapt**                                 | The unused bespoke Dropdown was removed after a repository-wide consumer scan; use owned Radix Select or native select for remaining feature controls.                               |
| Confirmation dialog             | Owned `app/components/ui/alert-dialog` consumers                                                                                                                                                                                                                                                              | **Keep**                                  | The bespoke `ConfirmMessage` wrapper was removed after its final BaseCard, Sidebar, and PricingTable consumers gained safe-focus, pending, failure-preservation, and keyboard tests. |
| Generic/treatment/legacy modals | `app/components/Modal/Modal.tsx`, `app/dashboard/treatments/Modal.tsx`, `app/dashboard/components/Modal.tsx`                                                                                                                                                                                                  | **Replace / Remove after migration**      | Missing or incomplete semantics/focus behavior; Bootstrap data API has no durable owner.                                                                                             |
| Blog/video overlays             | `app/dashboard/components/AddBlogModal.tsx`, `EditBlogModal.tsx`, `AddVideoModal.tsx`                                                                                                                                                                                                                         | **Replace shells**                        | Keep feature content, compose owned Dialog.                                                                                                                                          |
| Gallery overlays                | `app/dashboard/gallery/components/{AddDentalGalleryModal,AddGalleryModal,AddGeneralGalleryModal,EditGalleryModal,EditGeneralGalleryModal}.tsx`                                                                                                                                                                | **Replace shells**                        | Consolidate focus/backdrop/Escape/close behavior.                                                                                                                                    |
| Other overlays                  | `app/dashboard/review/components/AddReviewModal.tsx`, `app/dashboard/shop/components/AddIndividualProductModal.tsx`, `app/dashboard/links/components/ConfirmDeletePopup.tsx`, `app/dashboard/settings/DeleteBio.tsx`, `app/admin/components/upgradePlanModal.tsx`, `app/[username]/components/ShareModal.tsx` | **Replace shells / Adapt content**        | Use Dialog or AlertDialog according to whether a decision is destructive.                                                                                                            |
| Promotional overlay             | `app/components/PromoBanner.tsx` uses the owned Dialog shell                                                                                                                                                                                                                                                  | **Adapted**                               | Preserves delayed scroll claim behavior and ClaimForm content with named close, Escape, containment, focus restoration, and reduced-motion-safe primitive behavior.                  |
| Cards/collection items          | `app/components/Card/BaseCard.tsx`; dashboard `BlogCard`, `VideoCard`, `ReviewCard`, `ProductCard`, `InvidualProductCard`; gallery `GalleryCard.tsx`                                                                                                                                                          | **Adapt base / Replace duplicate shells** | Make Card domain-free; feature collection items own actions. GalleryCard duplicates card/action/switch/confirmation behavior and should converge after parity.                       |
| Navigation/layout shells        | `app/components/Navbar.tsx`, `Footer.tsx`; dashboard `Sidebar`, `SidebarItem`, `SidebarItems`, `MobileNavbar`, `RightPanel`, `RightPanelClient`; public profile `Navbar`, `Header`, `Footer`, `Collapse`                                                                                                      | **Adapt**                                 | Preserve responsive route structure; migrate clickable icons and mobile drawer/collapse behavior to named, focus-managed controls.                                                   |
| Drag/reorder                    | `app/components/Group/DraggableGroup.tsx`, blog `DraggableBlogGroup.tsx`, gallery `DraggableGeneralGalleryCard.tsx`, and reorder behavior in links/review/shop/treatments/video managers                                                                                                                      | **Keep behavior / Adapt access**          | Retain persistence and `react-dnd` initially; add keyboard reorder controls, live status, and ordering tests before considering dependency replacement.                              |
| Ratings                         | Public `ReviewItem.tsx` composes route-private `ReadOnlyRating.tsx`; dashboard review forms retain their feature-owned interactive integer control. No `react-stars` source imports remain.                                                                                                                   | **Dependency removed / Adapt controls**   | The owned read-only renderer keeps five 20px gold/gray stars, bounded integer display, and an accessible noninteractive rating label.                                                |

### Loading, errors, empty states, and notifications

| Current implementation   | Inventory                                                                                                                                                                                                                           | Disposition      | Target / risk                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Loaders                  | `app/components/Loader/Loader.tsx`, `SkeletonLoader.tsx`                                                                                                                                                                            | **Adapt**        | Owned Spinner/Skeleton with status text, size variants, reduced-motion support.                                                 |
| Route loading UI         | `app/[username]/loading.tsx`; auth/register/upgrade loading files; `app/dashboard/loading.tsx`, `links/loading.tsx`, `location/loading.tsx`, `settings/loading.tsx`, `treatments/loading.tsx`                                       | **Adapt**        | Compose canonical Skeleton/Spinner; preserve route-specific layout stability.                                                   |
| Route errors/not-found   | `app/global-error.tsx`, `app/error/page.tsx`, `app/not-found.tsx`, `app/dashboard/not-found.tsx`                                                                                                                                    | **Keep / Adapt** | Retain route boundaries, move presentation to owned Alert/EmptyState where useful.                                              |
| Inline error             | `app/components/ErrorMessage.tsx` and handwritten feature error blocks                                                                                                                                                              | **Replace**      | Fold into FieldError or form-level Alert.                                                                                       |
| Empty states             | Embedded in `ManageBlogs`, `ManageBlogGroups`, `ManageVideos`, `ManageVideoGroups`, `ManageGalleries`, `ManageReviews`, `ManageIndividualProducts`, `ManageTreatments`, `ManageServices`, `ManageLinkGroups`, `LocationListManager` | **Adapt**        | Extract one domain-free EmptyState; content stays feature-owned.                                                                |
| Toastify                 | No source imports; the root layout renders the owned Sonner `Toaster` once                                                                                                                                                          | **Removed**      | Legacy container, utility, error consumer, dependency, and CSS import were removed after repository-wide consumer verification. |
| React Hot Toast          | No source imports; the unused `react-hot-toast` package was removed after repository-wide import verification                                                                                                                       | **Removed**      | No matching Toaster was found, so removal preserves the current rendered behavior.                                              |
| Blocking message context | No source imports; former admin/security and dashboard notification consumers use Sonner, while decisions remain local AlertDialogs                                                                                                 | **Removed**      | Notification state no longer uses an inaccessible blocking modal.                                                               |

### Icons and CSS systems

| Current implementation     | Inventory                                                                                                                                  | Disposition                        | Target / risk                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Phosphor                   | `@phosphor-icons/react` imports throughout dashboard/public/auth UI                                                                        | **Keep**                           | Standard icon library; use per-icon imports and consistent size/weight.                                                                       |
| Font Awesome               | No source imports, CSS imports, React icon consumers, or font-family consumers remain                                                      | **Removed**                        | The three unused packages and public/dashboard CSS imports were removed after repository-wide consumer verification.                          |
| Inline SVG/icon components | `app/components/XIcon.tsx`, home/pricing/public-profile components, `public/icons/*`                                                       | **Adapt**                          | Keep branded/artwork SVGs; replace generic UI glyphs with Phosphor.                                                                           |
| Tailwind/theme             | `tailwind.config.ts`, `app/globals.css`                                                                                                    | **Keep / Adapt**                   | Primary system; move colors to semantic variables and add `cn`/CVA.                                                                           |
| Dashboard CSS              | `app/dashboard/globals.css`, `app/dashboard/styles.css`                                                                                    | **Adapt / Remove after migration** | Migrate selectors per feature; delete only after route visual parity.                                                                         |
| Public profile CSS         | `app/[username]/bootstrap.min.css`, `link-page.css`, `link-page-responsive.css`                                                            | **Adapt / Remove after migration** | Large Bootstrap/global overlap; preserve public profile visuals before removal.                                                               |
| Registration CSS           | `app/register/CustomDayPicker.css`                                                                                                         | **Replace**                        | Scope calendar styles behind the owned DatePicker.                                                                                            |
| Flowbite                   | No source imports; the unused package and `tailwind.config.ts` side-effect import were removed after verification; `plugins` remains empty | **Removed**                        | It was not registered as a Tailwind plugin, so removal avoids a competing UI system without altering the theme.                               |
| Headless UI                | No source imports; PromoBanner uses the owned Dialog                                                                                       | **Removed**                        | The sole `Transition` consumer migrated after focus, Escape, containment, and scroll-trigger coverage; no competing primitive system remains. |

### Client state, contexts, and URL state

| Current implementation | Inventory                                                                                                                                                     | Disposition                         | Target / risk                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand domain           | `app/contexts/BrandDomainContext.tsx`, `utils/hooks/useDomainConfig.ts`, `utils/domainConfig.ts`                                                              | **Keep / Adapt**                    | Correct server-to-client seam; formalize typed white-label token inputs.                                                                                                                                                                                                                                                                     |
| Navigation/preview     | `NavbarContext.tsx`, `PreviewContext.tsx`                                                                                                                     | **Keep / Adapt**                    | Appropriate low-frequency UI contexts; document provider scope and remove unused values.                                                                                                                                                                                                                                                     |
| Message context        | No source imports                                                                                                                                             | **Removed**                         | Sonner owns transient notifications; dialogs remain local.                                                                                                                                                                                                                                                                                   |
| Dashboard user         | `DashboardUserContext.tsx`, `app/dashboard/client-layout.tsx`                                                                                                 | **Replace or server-seed narrowly** | Duplicates server layout authorization and `/api/user` load, blocks the entire client dashboard, and mixes identity/server state with UI state. Its active Sidebar/RightPanel/MobileNavbar/Settings/VerifyStatus consumers need an equivalent server-seeded identity/query owner; replace the PreviewContext reload pattern before deletion. |
| Local state/reducers   | Widespread `useState`/`useEffect` in collection managers, subscription panels, admin/security tables, forms and overlays; no application reducer/store        | **Adapt**                           | Keep transient UI state; move remote records/pending/errors to Query/RHF. No Redux/Zustand/MobX/XState need is demonstrated.                                                                                                                                                                                                                 |
| URL state              | `userId` parsing in DashboardUserContext, `client-layout`, Sidebar, MobileNavbar, RightPanelClient and verification; search params in registration/auth flows | **Adapt**                           | One typed parser at the route boundary. Derive authorized effective user server-side; pass normalized state down.                                                                                                                                                                                                                            |

### Data access, Server Components, Actions, hooks, and cache

| Current implementation         | Inventory                                                                                                                                                                                      | Disposition                               | Target / risk                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical Supabase factories   | `utils/supabase/server.ts`, `client.ts`, `middleware.ts`; root `middleware.ts`                                                                                                                 | **Keep / Adapt**                          | Retain SSR/browser split and domain/auth middleware. Move under `lib/supabase`, add typed schema, mark server-only modules.                                                                                                                              |
| Duplicate Supabase factories   | `app/lib/supabaseClient.ts`, `app/dashboard/settings/utils/supabaseClient.ts`, `app/forgot-password/utils/supabaseClient.ts`, direct anon client in `app/[username]/blog/[slug]/page.tsx`      | **Replace / Remove after migration**      | One canonical factory per runtime.                                                                                                                                                                                                                       |
| Service-role client            | Canonical `lib/supabase/admin.ts`; consumed only by server-only, operation-specific repositories                                                                                               | **Adapted**                               | The canonical factory is guarded by `server-only`; the legacy generally importable wrapper is removed. Privileged callers use allowlisted repository operations after explicit authorization, never to bypass normal-user RLS.                           |
| User/auth helpers              | `utils/user/{getAuthorizedUser,getEffectiveUserId,getUserIdByEmail}.ts`, `utils/userInfo.ts`, `utils/supabase/checkSession.ts`                                                                 | **Keep / Adapt**                          | Make policies and return types explicit; centralize effective-user authorization.                                                                                                                                                                        |
| API client/hooks               | `services/apiClient.ts`, `utils/hooks/useApiCall.ts`; other hooks `useAdmin`, `useDeviceFingerprint`, `useDomainConfig`, `useIsMobile`, `useModal`                                             | **Adapt**                                 | Transport becomes typed feature API functions; Query owns remote loading/error. Keep domain/device/UI hooks if scoped.                                                                                                                                   |
| Server Component initial reads | dashboard root plus links, treatments, location, review, settings, subscription, verification pages; admin root/layout/paid-users/security pages; public username page/layout/blog page/layout | **Keep direction / Adapt implementation** | Move reads to typed feature query modules and deduplicate layout/page/client fetches.                                                                                                                                                                    |
| Server Actions                 | `app/dashboard/page.tsx` (7 inline actions), links (2), location (4), treatments (2), settings (2); login/admin-login/email-success action modules; server mail modules                        | **Adapt**                                 | Co-locate in feature `actions.ts`, Zod-parse, resolve `targetUserId` through the admin-aware `getEffectiveUserId` policy, await every write, return ActionResult, invalidate exact tags. Profile save currently starts two writes without awaiting them. |
| Public profile reads           | `app/[username]/page.tsx`, `layout.tsx`, blog page/layout; client fallback in `components/WorkLocation.tsx`                                                                                    | **Replace orchestration / Keep SSR**      | Build one typed aggregate/read model, request-memoize duplicate user/profile reads, remove client refetch, preserve server rendering/metadata/custom domains. Blog lookup must be scoped by username.                                                    |
| Contentful cache               | `lib/contentful.ts`                                                                                                                                                                            | **Keep**                                  | Existing one-hour `unstable_cache` is the correct direction; define a tag and failure policy.                                                                                                                                                            |
| Public profile cache           | `unstable_noStore()` in username page and force-dynamic blog route                                                                                                                             | **Adapt after invalidation**              | Introduce scoped aggregate tags only after authorized invalidation exists. Correctness comes before caching.                                                                                                                                             |
| Revalidation routes            | `app/api/revalidate/route.ts`, `app/api/revalidate/[username]/route.ts`                                                                                                                        | **Replace / Remove urgently**             | Authenticated callers can submit arbitrary paths without an ownership check. Mutations should invalidate server-owned feature tags/paths.                                                                                                                |
| Query framework                | No TanStack React Query/provider/query keys                                                                                                                                                    | **Add in Phase 2**                        | Use only for interactive dashboard server state.                                                                                                                                                                                                         |

#### API route inventory (63)

Keep the HTTP boundary but adapt authentication, authorization, Zod validation, and typed services for:

- Provider/system routes: `api/webhooks` and its `user-changed`/`verification-changed` routes; `api/veriff/{callback,create-session,session-status}`; `api/cron/trial-expiration`; `api/marketing/unsubscribe`.
- Billing/integration routes: `api/checkout`, `api/prices`, all 10 `api/subscription*` routes, `api/send`, `api/send/trial-end-check`, `api/upload`.
- Public/auth routes: `api/register`, `register/send-otp`, `register/verify-otp`, `auth/reset-password`, `check-username`, `links/click`, `blogs/click`. `api/invite` is currently public and can send arbitrary email; require authenticated/authorized sending where product behavior permits, or recipient/domain validation plus distributed rate limiting/CAPTCHA/abuse controls.
- Privileged integration routes: authenticated destructive `api/auth/remove-account` and authenticated Premium Pro/admin Vercel domain management at `api/user/domain`. Keep Stripe/service-role/Vercel calls behind explicit policies and audit logs.

Evaluate same-app CRUD for Action migration while retaining a route only where React Query or another caller needs HTTP:

- Content: `api/announcements`, `blog-groups`, `blogs`, `dentistry`, `external-review-pages`, `galleries`, `general-galleries`, `groups`, `individual-products`, `links/click`, `location`, `products`, `reviews`, `treatments`, `update-order`, `videos`.
- User/admin: `api/user`, `user/list`, `user/plan-status`, `api/offer-code`, and nine `api/admin/*` routes for blocked domains/fingerprints/IPs/users, income, marketing send, profile audit log, security logs, and verification. The optional-auth offer-code GET exposes the full set of valid codes to non-admin callers and needs a single-code validation contract rather than enumeration.

No in-repository caller of `/api/revalidate` was found. Remove or disable the two generic revalidation routes in the first security cleanup rather than leaving arbitrary authenticated cache-busting active while later migrations proceed.

#### Direct Supabase call inventory

Direct calls are valid in server-only feature queries/services and in the narrow browser auth/Storage cases. The following UI-owned calls must be moved behind those boundaries:

- Dashboard identity/shell: `ProfilePictureUploader.tsx`, `client-layout.tsx`, `components/Sidebar.tsx`, `Signout.tsx`.
- Collections: blog `ManageBlogs.tsx`/`ManageBlogGroups.tsx`; gallery `ManageGalleries.tsx`; links page and `AddLinkForm`, `AddLinkGroupForm`, `LinkGroup`, `LinkItem`, `LinksPageClient`; location `AddLocation.tsx` and page; review `ManageReviews.tsx` and page; shop `ManageIndividualProducts.tsx`; treatments `ManageServices.tsx`, `ManageTreatments.tsx` and page; video `ManageVideoGroups.tsx`, `ManageVideos.tsx`.
- Account/commerce: settings forms/page, referral page, subscription page, forgot-password page, login/email-success actions, upgrade and upgrade-success pages, `app/components/OtpInput.tsx`, `app/components/home-page/ClaimForm.tsx`, and owned AlertDialog account/plan confirmations.
- Admin UI: `app/admin/components/{OfferCodeManagement,UsersManagement}.tsx`, all blocked-domain/fingerprint/IP/user, profile-audit, security-log/user management components under `app/admin/security/components`, and admin root/layout/paid-users/security server pages. Server reads remain server-owned; Client Components should call typed APIs rather than construct arbitrary queries.
- Public UI: username page/layout/blog page/layout, `app/[username]/components/Footer.tsx`, and `WorkLocation.tsx`. Remove the WorkLocation client fallback after the server prop is guaranteed.

Server-side direct queries in the 63 route handlers and helpers under `utils/{blocked*,trialManagement,securityLogger,slugGenerator,removeFromBucket,user/*}` should be adapted into typed feature repositories rather than mechanically removed.

### Accessibility, bundle, caching, state, and test risks

| Area            | Baseline risk                                                                                                                                                                                                        | Required guardrail                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility   | Global focus outline removal; clickable div/icon patterns; bespoke dropdown without keyboard semantics; most modal shells lack complete focus/Escape/label behavior; duplicate switch IDs; loaders lack status text. | Semantic owned primitives, keyboard tests, `@axe-core/playwright` on representative routes, manual focus/zoom/reduced-motion checks, WCAG 2.2 AA contrast.            |
| Bundle          | Shared first load 209 kB; dashboard 393 kB; Bootstrap CSS and other legacy UI assets remain; maps, Quill, Stripe, Fabric, editors can enter client bundles.                                                          | Keep heavy integrations feature-bound/dynamic, consolidate UI packages, record route sizes each phase, add analyzer only when setting a budget.                       |
| Caching         | Public profile disables caching and repeats user/dentistry/storage reads across layout/page/client; generic path invalidation is unsafe.                                                                             | Typed aggregate, request memoization, scoped tags, authorized mutation invalidation; cache only after correctness.                                                    |
| State ownership | Server props, direct Supabase, context, URL, local arrays, and API results can own the same record simultaneously. Subscription panels fetch independently.                                                          | One owner per state class; Server Component first data, Query for live remote state, RHF for edit buffer, URL for shareable navigation, local state for transient UI. |
| Testability     | Only six unit/component test files and one two-assertion E2E file; no API authorization, cache, primitive accessibility, or CRUD integration coverage. Broad `any` and mixed transports impede mocks.                | Test schema/service boundaries, semantic primitives, unauthorized cases and representative flows. Keep tests close to implementation; isolate Playwright discovery.   |
| Security        | Unscoped revalidation; blog slug not constrained by username; SSR click increment; service-role module not server-only; client-supplied effective IDs; process-local public rate limiting.                           | Derive identity server-side, scope every query, isolate admin client, use provider/edge rate controls for public events, test negative authorization paths.           |

The existing `api/blogs/click` and `api/links/click` routes must verify that the submitted record belongs to a public, enabled resource before calling the broad increment RPC. Their process-local counters and caller-controlled forwarded-IP interpretation are not distributed abuse controls. Move the blog page's direct SSR increment to the hardened endpoint.

## Representative migration flows

1. **Registration and recovery:** claim URL → registration fields/DOB/password → OTP/email success → login/forgot password. Proves RHF/Zod, Server Action errors, OTP/date accessibility, brand routing, and reset/recovery states.
2. **Dashboard profile:** authorized effective user → profile/social editors → save → toast/error → public-profile revalidation. Proves one identity owner, Action contract, fields/switches, and cache tags.
3. **Treatments and links CRUD:** server initial list → add/edit/delete/reorder → confirmation → Query invalidation. Proves Dialog, field primitives, React Query, optimistic behavior, and public revalidation.
4. **Gallery upload:** signed/authorized upload → progress/preview → persisted metadata → error recovery. Proves the allowed browser Storage boundary and accessible progress.
5. **Subscription:** initial server summary → billing/payment/history interactions. Proves query aggregation, Stripe HTTP boundaries, sensitive-data handling, and polling/invalidation choices.
6. **Public profile:** custom-domain resolution → metadata/layout/profile aggregate → share/social/blog click tracking. Proves SSR, cache tags, no browser refetch, responsive parity, and analytics boundaries.
7. **Admin/security:** role gate → paginated data → block/unblock/delete with confirmation. Proves service-role isolation and negative authorization tests.

Each later phase must migrate at least one production flow; adding unused foundations does not complete a phase.

## Dependency and delivery phases

Every phase starts from the latest merged `develop`, uses one `codex/` branch and one PR, and stops after the reviewed PR. Dependency installation, primitives, feature migration, tests, and cleanup remain separate commits where practical.

### Phase 1 — architecture and baseline (this document)

- No library or product-flow changes.
- Deliver the audited matrix, decisions, verification results, phase plan, and deferred decisions.

### Phase 2 — verification and owned foundation

1. Stabilize scripts first: isolate Bun tests from `e2e`, add explicit `typecheck`, configure noninteractive ESLint compatible with Next 14, make Playwright's web server use `bun run start:test`, and remove/disable the uncalled generic revalidation routes in a focused security commit.
2. Add approved core dependencies in one dependency commit: `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query` v5, `class-variance-authority`, direct `clsx`, `tailwind-merge`, `sonner`, and `@axe-core/playwright`. (`clsx` is currently transitive only.)
3. Add only the Radix packages required for the first primitives (Dialog/AlertDialog, Select, Switch, Label, Slot as needed). Do not add a competing icon set; Phosphor is already installed.
4. Add semantic tokens, `cn`, Button, Field/Input/Textarea, Dialog/AlertDialog, Select, Switch, Alert, Spinner/Skeleton, EmptyState, and root Toaster with unit tests and Playwright axe checks.
5. Adopt primitives in one small production slice (recommended: treatment create/edit/confirm) to prove integration before claiming the phase complete.

### Phase 3 — Next.js 16 and React 19 migration

- Upgrade through Next.js 15 to the latest compatible Next.js 16 release in one isolated framework PR, with an independently verified intermediate migration.
- Migrate React 18 to React 19, synchronous request APIs to their async contracts, `next lint` to the ESLint CLI, and obsolete Next configuration without changing product behavior.
- Verify the Supabase SSR/session boundary, custom-domain rewrite, admin guards, Sentry instrumentation, uploads, image behavior, and the production bundler. Keep Cache Components and React Compiler disabled during the compatibility migration.
- Replace remaining deprecated `@supabase/auth-helpers-nextjs` usage with the canonical `@supabase/ssr`/browser client boundary, but defer account-flow redesign to Phase 5.

### Phase 4 — analytics interaction foundation

- Define one versioned, privacy-safe base metadata contract and controlled event/entity registry for every public action: links, CTAs, social, phone/email, booking/directions, treatments/services, blogs, videos, gallery actions, products, sharing, and future enquiries.
- Add composable tracked link/button primitives and an injectable delivery interface so every action shares navigation-safe click behavior while type-specific actions extend the common metadata through discriminated contracts.
- Establish explicit profile, position, section, preview, consent, session/visitor, source/UTM, schema-version, and test contexts. Preview and automated-test exclusion must be explicit and enforceable; it must not depend only on referrer detection.
- Deliver only the common client contract, component adapters, inventory/migration map, validation, and test harness. Do not create production event tables, ingestion endpoints, aggregates, retention jobs, analytics queries, charts, dashboards, plan gates, or claim that the two Trello analytics stories are implemented.
- Treat Trello cards ZKWI5yb5 and EJ9grO95 as downstream requirements. Later tracking and dashboard work must consume this foundation rather than create parallel counters or one-off click handlers.

### Phase 5 — account forms and feedback

- Migrate claim, registration, OTP/email success, login, and recovery to shared Zod + RHF + ActionResult.
- Replace Toastify, React Hot Toast, and MessageContext consumers with Sonner/AlertDialog as appropriate; remove dependencies only when `rg` proves no consumers.
- Add recovery-state component tests and anonymous/authenticated Playwright paths.

### Phase 6 — dashboard data ownership

- Add the Query provider at the smallest dashboard scope and feature key factories.
- Server-seed the authorized dashboard identity; remove the duplicate `/api/user` context load.
- Migrate treatments and links, then gallery/review/blog/video/product/location managers, one vertical slice per commit.
- Replace direct browser Supabase CRUD with typed Actions/APIs; retain only auth and explicit Storage upload use.

#### Ordinary-form completion

The final referral slice derives its URL, sender identity, entitlement, and
brand on the server. Its strict Action accepts only the invitee email, while
RHF owns the draft and clipboard feedback remains local UI state. The public
invite `POST` route was removed after a repository consumer search; its public
referral redirect `GET` remains. The final form/transport inventory classifies
all remaining matches as completed Phase 6 boundaries, intentional auth or
Storage lifecycle, or explicit Phase 8 settings/domain, verification,
subscription/billing, and admin defers. A decorative dashboard refresh form was
replaced with a semantic non-form wrapper. No runtime public caching or
production analytics transport was introduced.

#### Foundation checkpoint record (2026-08-04)

The foundation uses a server-seeded immutable dashboard scope, generated
`Database` types, typed Supabase factories, and a route-content-only Query
provider. Its defaults are 30-second `staleTime`, 10-minute `gcTime`, one
recognized transient read retry, no mutation retry, no focus refetch, and
reconnect/mount refetch. This follows [Next.js Server and Client
Components](https://nextjs.org/docs/app/getting-started/server-and-client-components),
[Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend),
[TanStack Query SSR/hydration](https://tanstack.com/query/latest/docs/framework/react/guides/ssr),
and [TanStack Query `useQuery`](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).
Small manager aggregates use `initialData` with `initialDataUpdatedAt`; a
`HydrationBoundary` is reserved for a proven smaller multi-query shared state.
Neither seed is copied into local state.

The generated contract command is
`bunx supabase gen types typescript --local`; the checked-in
`lib/supabase/database.types.ts` is the sole client/server/admin/test database
contract. At the Phase 8 checkpoint on 2026-08-10, the local and tracked
migration histories align through all 34 migrations, ending at
`20260810022702_phase8_harden_rls_and_function_grants.sql`. Regeneration is
exact after project formatting: the checked-in contract is 2,462 lines with
SHA-256
`4819e4a4edf99633eb7a3570737c1554f7134c010281cf69efef3dcedbb39143`.
The Supabase client retry decision accounts for the
[Supabase JS changelog](https://github.com/supabase/supabase-js/releases):
transient PostgREST GET/HEAD retries are already handled by the client, so Query
does not add a default three-retry layer.

The verified authority boundary is deliberately stricter than the initial
foundation design. Owners and authenticated admin clients cannot directly write
protected `users` authority fields. Retained billing, Veriff, and domain routes
instead use a closed, server-only service-role adapter with exact-field methods;
the billing state machine uses tightly controlled service-role-only RPCs.
Cancellation recovery and Stripe-customer deletion tombstones live in the
non-exposed `private` schema. The additive authority and producer sequence runs
from `20260804005957` through `20260804045730` without changing a historical
migration.
It is a narrow compatibility boundary for retained specialized routes, not a
general service-role escape hatch or a claim that Phase 8 form/repository work
is complete.

Starting evidence was 223 passing unit/component tests with two pre-existing
`use-login-lockout` failures caused by Happy DOM rejecting assignment to the
readonly `focus` property. After the isolated-suite correction, the fresh
foundation gate at `819f150` passes 429/429 tests with 1,464 expectations across
76 files. Non-incremental TypeScript is clean. ESLint reports zero errors and 85
warnings, below the Phase 5 baseline of 87. Tracked-file Prettier and
`git diff --check` are clean. The safe `env -i`, local-only production build
generates 87/87 entries with local Supabase values, non-secret Contentful
placeholders, and provider credentials absent; no application production
integration or upload is invoked. The configured Chromium setup, navigation,
and all axe checks pass 21/21. Final `pg_net` queue and response-history counts
are 0/0. Database lint retains exactly two unchanged pre-Phase6
findings, `increment_click_counter` and `fn_audit_write`; neither was introduced
by this branch. The advisor reports 72 `WARN` results with no match in the new
Phase 6 private/authority surface. The full v2 build at `819f150` emitted the
Sentry bundler plugin's generic unauthenticated telemetry notice even though
Next telemetry was disabled; that notice triggered the build-safety correction.
Delta `19bf5e9` explicitly sets the Sentry bundler's `telemetry: false`, and its
fresh safe `env -i`, local-only build passes 87/87 with no Sentry telemetry
notice, release, or source-map upload. It invokes no application production
integration or upload. Base-to-head verification shows zero Phase 6 changes to
historical migrations, and temporary corrective commits are absent from the
final branch. The recorded future cache templates are in
`docs/dashboard-public-cache-invalidation-matrix.md`; they do not enable
runtime caching. Production analytics emission and public-cache invalidation
remain disabled.

#### Database webhook Vault rollout

The two database producers read four Supabase Vault entries by exact name:

- `user_changed_webhook_url` — the fully qualified deployed
  `/api/webhooks/user-changed` URL;
- `user_changed_webhook_secret` — a secret that exactly matches the deployed
  application's `WEBHOOK_SECRET`;
- `verification_changed_webhook_url` — the fully qualified deployed
  `/api/webhooks/verification-changed` URL;
- `verification_changed_webhook_secret` — a secret that exactly matches the
  deployed application's `CRON_SECRET_KEY`.

The migrations intentionally provision none of these entries. Missing, blank,
whitespace-only, or unreadable user-change configuration fails closed: no HTTP
request is queued, so no plan-change or account email is sent. The synchronous
database branding invariant still applies even when notification delivery is
skipped. Missing verification-change configuration likewise queues no request
and sends no verification email. Skipped notifications and deliveries rejected
with `401` are not replayed automatically. Provision all entries through a
secure out-of-band deployment channel; never commit, print, or log a secret.

Roll out in this order to avoid silent notification loss:

1. Pause plan-changing and verification-changing writes before deploying or
   changing either application secret.
2. Drain the currently installed producers: wait until
   `net.http_request_queue` is empty and verify every previously recorded
   request ID completed successfully. This includes requests from the legacy
   hardcoded verification producer and the already-installed user-change
   producer.
3. Within the same paused-write window, deploy both application routes with
   nonblank `WEBHOOK_SECRET` and `CRON_SECRET_KEY`, coordinate any other approved
   caller that shares the latter, and create or replace all four exact Vault
   names with the deployed URLs and matching application secrets.
4. Verify names only; this query must return exactly four rows and must never
   select secret values:

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

5. Apply the producer migrations, verify controlled non-production plan and
   verification changes each reach the correct deployed handler with a success
   response, and only then resume the relevant writes. If the migrations are
   already applied, provision and verify Vault before writes resume.

Secret rotation must account for asynchronous `pg_net` delivery. Pause the
relevant plan-changing and verification-changing writes, wait until
`net.http_request_queue` is empty, and verify every previously recorded request
ID for both producers completed successfully. Do this before changing either
application secret. Then update the application secret and its matching Vault
secret within the same paused-write window, run a controlled event for each
rotated producer, verify successful delivery, and resume writes. A missed or
failed delivery requires explicit operational recovery.

`pg_net` is one-shot for both producers in this foundation. It does not
automatically retry or replay an HTTP `5xx`, any other non-2xx response, a
timeout or transport failure, missing/blank configuration, or a downstream
provider/email failure. A `500` from either the user-change or
verification-change route makes its provider/email failure visible for
operational replay; it is not a retry signal and does not cause `pg_net` to
retry. Operators must monitor restricted `net` response records, correlate the
exact failed event and affected user ID without copying payload secrets or PII
into logs, repair the configuration or provider, and explicitly replay the
event through an approved idempotent procedure before resuming affected writes
or closing the incident. The foundation has no durable outbox or automatic
delivery-retry mechanism.

#### Pre-existing verification credential response

The immutable baseline migration still contains a pre-existing literal
verification-webhook credential. Phase 6 does not modify that historical
migration. Its later additive Vault migration replaces the runtime producer when
deployed, but it does not make the baseline credential safe. Treat the
credential as exposed and rotate or revoke it through the approved secure
channel before this branch is deployed or used with production.

The known credential remains in the immutable migration and repository history.
The security owner must separately decide whether a history rewrite and
coordinated full reclone are required; Phase 6 performs neither. Run approved
secret scanning in redacted-output mode and expect it to identify this known
baseline/history finding. Never print the value into build, review, or incident
logs.

### Phase 7 — public profile, cache, and server data modules

- Create typed public-profile and feature query modules; deduplicate layout/page reads and remove WorkLocation client refetch.
- Scope blog lookup by username and move the direct SSR click increment to the hardened existing public route.
- Introduce authorized cache tags/invalidation after the generic revalidation routes have already been disabled in the first security cleanup.
- Preserve custom-domain rewrite, metadata, white-label values, public SEO and RLS behavior with integration/E2E coverage.

### Phase 8 — admin, subscription, and cleanup

- Isolate service-role repositories and migrate admin/security negative authorization tests.
- Aggregate subscription query ownership without weakening Stripe/server boundaries.
- Remove obsolete modal/button/switch/input/CSS implementations and unused Headless UI, Flowbite, Font Awesome, duplicate toast/rating packages only after import and bundle verification.
- Set measured route bundle budgets from post-migration evidence and complete keyboard/axe/manual accessibility regression.

## Baseline verification

Environment: Bun 1.3.14; installed Next 14.2.35, React/React DOM 18.3.1, TypeScript 5.5.4, Tailwind 3.4.10. No dependency was installed or changed.

| Check                               | Command                                                                                                          | Result on 2026-08-03                                                                                                                                                                                                                                            | Interpretation                                                                                                                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit/component script               | `bun test --preload ./test/setup.ts`                                                                             | **Failed:** 78 pass; Bun also discovers `e2e/home.spec.ts`, where Playwright rejects `test()` outside its runner.                                                                                                                                               | Existing discovery/config defect. Unit assertions themselves pass.                                                                                                                                                                               |
| Scoped unit/component               | `bun test app lib utils --preload ./test/setup.ts`                                                               | **Passed:** 78 pass, 0 fail, 182 expectations across 6 files.                                                                                                                                                                                                   | Correct temporary scope until script is fixed in Phase 2.                                                                                                                                                                                        |
| TypeScript (configured incremental) | `bunx tsc --noEmit`                                                                                              | **Failed:** stale/generated `.next/types/app/dashboard/layout.ts` rejects the layout `searchParams` prop.                                                                                                                                                       | Generated-state-sensitive baseline; investigate layout contract in Phase 2.                                                                                                                                                                      |
| TypeScript (clean read-only)        | `bunx tsc --noEmit --incremental false`                                                                          | **State-dependent failure:** passed in the delegated pre-build baseline, then failed in the final post-build run on the same dashboard layout `searchParams` contract.                                                                                          | The production build generates the route type that exposes the invalid layout prop. Treat the post-build failure as authoritative and fix the route contract in Phase 2.                                                                         |
| Lint                                | `bun run lint`                                                                                                   | **Failed/non-automatable:** `next lint` opens the interactive first-time ESLint prompt; no config/dependencies exist.                                                                                                                                           | Configure ESLint before CI can enforce lint.                                                                                                                                                                                                     |
| Production build                    | `bun run build`                                                                                                  | **Passed.** 63 API routes emitted; shared first-load JS 209 kB; `/dashboard` 393 kB, `/` 334 kB, `/register` 328 kB; middleware 126 kB. Webpack warned about serializing two large strings (132/139 KiB).                                                       | Record these route sizes as the Phase 1 bundle baseline.                                                                                                                                                                                         |
| Playwright                          | `bun run e2e`                                                                                                    | **Environment-blocked:** both tests fail before navigation because the pinned Playwright Chromium headless shell is not installed in the local cache.                                                                                                           | Existing suite has two home-page smoke assertions, Chromium only. The rendered page uses “Log in,” so the test expecting a “sign in” button also appears stale but did not reach its assertion. Install browsers in CI/bootstrap during Phase 2. |
| Accessibility                       | No axe dependency or automated accessibility script exists. Targeted in-app browser inspection of `/` succeeded. | **Baseline issues:** 3 claim textboxes have placeholder-only names; the home/logo link is unnamed; no `<main>` landmark exists. The page does have one H1, one nav, one footer, `lang="en"`, no duplicate IDs, no images missing `alt`, and no unnamed buttons. | Phase 2 adds axe and keyboard coverage. Code inspection also found global focus-outline removal, incomplete overlays/dropdown/switch behavior, and loaders without status semantics.                                                             |
| Coverage/visual/CI                  | No coverage reporter, threshold, visual regression, Lighthouse/bundle budget, or tracked CI workflow found.      | **Unavailable.**                                                                                                                                                                                                                                                | Add only evidence-driven tooling; do not introduce all tools at once.                                                                                                                                                                            |

Existing test files are `lib/treatmentDescription.test.ts`, `utils/registrationUrl.test.ts`, `utils/functions/socialMediaProfiles.test.ts`, `app/dashboard/components/LimitedTextArea.test.tsx`, `SocialProfileVisitButton.test.tsx`, `app/[username]/components/share.test.ts`, and `e2e/home.spec.ts`.

## Phase 2 verification record

Verified on 2026-08-03 with Bun 1.3.14, the exact Playwright 1.62.1 Chromium build, Next 14.2.35, React 18.3.1, and Tailwind 3.4.x.

| Check              | Command                                                                                    | Phase 2 result                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and component | `bun run test`                                                                             | **Passed:** 93 tests, 0 failures, 233 expectations across 11 files. The script explicitly excludes Playwright discovery while including `app`, `components`, `lib`, and `utils`.                                                                                                      |
| TypeScript         | `bun run typecheck`                                                                        | **Passed** after a production build. The invalid dashboard layout `searchParams` contract is removed rather than hidden through generated-type exclusions.                                                                                                                            |
| Lint               | `bun run lint`                                                                             | **Passed** noninteractively. Existing hook, image, and accessibility warnings remain visible; there are no lint errors.                                                                                                                                                               |
| Production build   | `bun run build`                                                                            | **Passed.** The existing webpack large-string and Browserslist notices remain non-failing.                                                                                                                                                                                            |
| Playwright         | `PLAYWRIGHT_BASE_URL=http://localhost:3000 bun run e2e`                                    | **Passed:** 3 Chromium tests, including both home smoke checks and the unfiltered `/login` axe scan.                                                                                                                                                                                  |
| Accessibility      | `PLAYWRIGHT_BASE_URL=http://localhost:3000 bunx playwright test e2e/accessibility.spec.ts` | **Passed:** standard `AxeBuilder.analyze()` returned no violations on `/login`; no rules or nodes are disabled or excluded. Component tests also cover Dialog focus containment/Escape/restoration, AlertDialog cancellation, Switch Space activation, and Select keyboard selection. |

## Phase 3 starting baseline

Re-verified from the merged Phase 2 `develop` commit `6dcec66` on 2026-08-03 before changing dependencies. The local runtime is Node 20.16.0 and Bun 1.3.14. Installed framework packages are Next 14.2.35, React/React DOM 18.3.1, React types 18.3.x, ESLint 8.57.1, and `eslint-config-next` 14.2.35. The browser checks used the local Supabase endpoint and did not exercise Stripe or any production service.

| Check              | Command                                                 | Phase 3 starting result                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit and component | `bun run test`                                          | **Passed:** 93 tests, 0 failures, 233 expectations across 11 files.                                                                                                                                                      |
| TypeScript         | `bun run typecheck`                                     | **Passed** after the production build, with generated route types present.                                                                                                                                               |
| Lint               | `bun run lint`                                          | **Passed** with the existing warning set and no errors. This is still the Next 14 `next lint` baseline that Phase 3 must replace with the ESLint CLI.                                                                    |
| Production build   | `bun run build`                                         | **Passed:** 91 static pages generated; shared first-load JS 209 kB; `/` 334 kB; `/dashboard` 393 kB; `/dashboard/treatments` 322 kB; middleware 126 kB. Webpack emitted the existing 132/139 KiB serialization warnings. |
| Playwright         | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3016 bun run e2e` | **Passed:** 3 Chromium tests across 3 workers.                                                                                                                                                                           |
| Accessibility      | Included in the full Playwright command above           | **Passed:** the unfiltered AxeBuilder scan of `/login` returned no violations.                                                                                                                                           |

Current official upgrade constraints verified before implementation:

- Next.js 15 makes `cookies()`, `headers()`, `draftMode()`, route `params`, and page `searchParams` asynchronous; Next.js 16 removes the synchronous compatibility path.
- Next.js 16 requires Node 20.9 or newer. The local Node 20.16 runtime satisfies this minimum, but the repository does not yet pin or prove its deployment runtime.
- React 19 replaces the deprecated `useFormState` pattern with `useActionState`; the application has one production consumer to migrate without changing its action contract.
- Next.js 16 removes `next lint`, defaults development and production builds to Turbopack, moves `serverComponentsExternalPackages` to top-level `serverExternalPackages`, and deprecates `middleware` in favor of the Node-runtime `proxy` convention.
- Supabase's current Next.js SSR guidance uses separate `@supabase/ssr` browser/server clients and a request-boundary Proxy that refreshes cookies. Server authorization must continue to validate identity with `getUser()`/`getClaims()` rather than trusting `getSession()`.
- Sentry's current JavaScript SDK release line exercises Next.js 16 in its own integration suite. DentalBio must still prove its exact `withSentryConfig`, tunnel, instrumentation, source-map, and Turbopack behavior locally before choosing the production builder.

### Next.js 15 and React 19 checkpoint

Verified on 2026-08-03 with pinned Next 15.5.22, React/React DOM 19.2.8, React types 19.2.x, `eslint-config-next` 15.5.22, Framer Motion 12.43.0, Node 20.16.0, and Bun 1.3.14.

| Check                        | Command                                                 | Intermediate result                                                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit and component           | `bun run test`                                          | **Passed:** 93 tests, 0 failures, 233 expectations across 11 files.                                                                                                                                                                                                            |
| TypeScript                   | `bun run typecheck`                                     | **Passed** after the production build with the Next 15 generated route contracts present.                                                                                                                                                                                      |
| Lint                         | `bun run lint`                                          | **Passed** with the unchanged warning set and Next 15's expected `next lint` deprecation notice.                                                                                                                                                                               |
| Production build             | `bun run build`                                         | **Passed:** 89 static pages generated; no invalid Next config warning. Shared first-load JS is 229 kB; `/` 358 kB; `/dashboard` 413 kB; `/dashboard/treatments` 342 kB; middleware 132 kB.                                                                                     |
| Production start             | `bun run start -- -p 3016`                              | **Passed:** server reached ready state without an unhandled Google Maps rejection after moving script initialization out of module scope and into client effects. The host still emits an unrelated duplicate GLib/libvips Objective-C class warning when image tooling loads. |
| Playwright and accessibility | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3016 bun run e2e` | **Passed:** all 3 Chromium tests, including the unfiltered `/login` axe scan.                                                                                                                                                                                                  |

The intermediate build initially exposed a production-start-only failure: Next 15 preloaded the dashboard location entry on the server, where module-scope Google Maps initialization rejected. The compatibility fix defers both loader calls to browser effects and preserves the existing client map path. Framer Motion was also pinned to 12.43.0 because the installed v11 type surface was incompatible with React 19; no motion component behavior was rewritten.

### Next.js 16 final checkpoint

Verified on 2026-08-03 with pinned Next 16.2.12, React/React DOM 19.2.8, React types 19.2.x, Sentry 10.69.0, `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.112.0, ESLint 9.39.5, `eslint-config-next` 16.2.12, Prettier 3.9.6, Node 20.16.0, and Bun 1.3.14. Direct migration dependencies are exact in `package.json`, and `bun.lock` is committed. The repository deployment contract now declares Node `>=20.9.0`, matching the Next.js 16 minimum.

| Check                                       | Command                                                                              | Final Phase 3 result                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit and component                          | `bun run test`                                                                       | **Passed:** 105 tests, 0 failures, 266 expectations across 14 files. The final suite includes recovery callback routing and browser logout success/error behavior.                                                                                                                                                                                                                                                    |
| Proxy and auth parity                       | `bun test proxy.test.ts utils/supabase/middleware.test.ts --preload ./test/setup.ts` | **Passed:** 15 tests and 42 expectations. Coverage includes platform/custom/unknown hosts, nested rewrites and query strings, `/api`, `/_next`, Sentry `/monitoring`, anonymous dashboard/admin guards, non-admin redirects, session refresh, and refreshed cookie/cache-header preservation across redirects.                                                                                                        |
| TypeScript                                  | `bun run typecheck`                                                                  | **Passed** with Next 16 generated production and development route types present. Next's required automatic JSX runtime setting is committed.                                                                                                                                                                                                                                                                         |
| Lint                                        | `bun run lint`                                                                       | **Passed:** ESLint CLI with flat configuration, 0 errors and 89 pre-existing warnings. ESLint 9.39.5 is used because ESLint 10.8.0 crashes in the React plugin shipped with the matching Next config. The React compiler-oriented `immutability`, `refs`, and `set-state-in-effect` rules remain disabled because compiler adoption and the required behavioral refactors are outside Phase 3.                        |
| Formatting                                  | `bunx prettier --check app/components/ui`                                            | **Passed.** The owned shadcn-style primitives are readable under pinned Prettier; `format` and `format:check` scripts plus generated/history ignores are committed.                                                                                                                                                                                                                                                   |
| Production build                            | `bun run build`                                                                      | **Passed with the default Turbopack builder:** compilation, Sentry `runAfterProductionCompile`, TypeScript, and all 88 static-generation entries completed. No Webpack fallback is configured. The build contains 503 source-map artifacts.                                                                                                                                                                           |
| Production start and safe integration smoke | `bun run start -- -p 3100` plus Bun `fetch` checks                                   | **Passed:** ready in 240 ms with no Google Maps, canvas, image, proxy, or Sentry startup error. `/`, `/login`, and `/forgot-password` returned 200; anonymous `/dashboard` and `/admin` returned 307 to `/login`; `/icon.png` returned an image; unknown custom domains fell through; `/monitoring` remained reachable; unsupported GETs to upload and checkout returned 405 without invoking mutations or providers. |
| Playwright and accessibility                | `bun run e2e`                                                                        | **Passed:** all 3 Chromium tests across 3 workers, including the unfiltered `/login` axe scan with no automated violations.                                                                                                                                                                                                                                                                                           |

Compatibility decisions and evidence:

- Every discovered `cookies()`, `headers()`, route `params`, and page `searchParams` consumer uses the asynchronous contract. The sole production `useFormState` consumer now uses React 19 `useActionState` without changing the Server Action result shape.
- Login and recovery pages render in the production browser checks; callback tests prove code exchange/default and in-app redirects; logout tests prove success navigation and error retention without contacting a live auth service.
- `middleware.ts` is now the Next.js 16 `proxy.ts` convention and runs in the Node runtime. The production entrypoint delegates to a typed handler so tests can exercise the same logic without global module mocks. Custom-domain rewrites, infrastructure passthrough, Sentry monitoring, Supabase refresh, and authorization guards retain explicit parity coverage.
- The deprecated `@supabase/auth-helpers-nextjs` package and its consumers are removed. Browser recovery flows use the canonical browser client; server and proxy decisions continue to validate identity with `getUser()`. Supabase SSR response cache headers and refreshed cookies survive both normal responses and redirects.
- Sentry 10.69.0 compiles under Turbopack, its production post-compile hook completes, instrumentation files load without startup errors, source maps are emitted, and the configured `/monitoring` tunnel remains routed through the proxy unchanged.
- Turbopack rejected two malformed legacy Bootstrap switch data URLs that Webpack tolerated. They were replaced with the equivalent valid encoded SVG declarations; switch colors and geometry are unchanged.
- Cache Components, React Compiler, and new caching behavior remain disabled. No Phase 4+ UI, form, data-ownership, or analytics work is included.

Runtime, deployment, and rollback notes:

- Next.js 16 still supports Node 20.9+, but Supabase JS dropped Node 20 support on 2026-06-30. Phase 5 therefore raises the deployment contract to `engines.node >=22.0.0`; `.nvmrc` remains pinned to Node 24.13.1 for local and CI verification.
- Verification used the configured local Supabase endpoint. No production records, credentials, Stripe calls, uploads, emails, verification provider calls, or Sentry events were created.
- Rollback is the Phase 2 `develop` baseline at `6dcec66`: revert the Phase 3 commits as a unit, restore the pinned Next 14/React 18 dependency set and lockfile, and restore `middleware.ts`. No schema, data, or provider migration is required to roll back this phase.

## Phase 5 account forms verification record

Phase 5 standardizes claim, registration, login, admin login, email-success,
password recovery, and password reset on the owned shadcn-style components,
React Hook Form, shared Zod contracts, and `ActionResult`. Route-private workflow
code lives under `app/<route>/_lib`; cross-route auth policy and signed-ticket
code lives under `lib/auth`. No top-level `features` taxonomy was introduced.

Security and retry behavior:

- Registration decisions are carried by a short-lived HMAC ticket. The server
  derives the brand from `Request.url`, ignores forwarded-host spoofing, rejects
  self-referrals, and accepts a pre-verification resend for an immediately
  confirmed passwordless user only when the prior signed ticket and persisted
  profile both match.
- New auth-user defaults are non-authorizing: role is always `user`, billing and
  subscription identifiers are null, and the registered brand is allowlisted
  with a safe `dental.bio` fallback.
- Completion uses database ledgers for password/profile, Stripe, referral, and
  notification steps. Referral entitlement is cumulative and serialized per
  referrer, so distinct operation keys cannot under-grant overlapping rewards.
- Admin routing protects only `/admin` and descendants; `/admin-login` remains
  reachable. Admin authorization uses the immutable user ID, and failed
  non-admin login removes the newly created session.
- Announcement reads tolerate an empty table and image components do not render
  an empty `src`, removing the dashboard errors discovered during this phase.

Database deployment order:

1. `20260803181700_harden_new_user_defaults.sql`
2. `20260803223000_registration_completion_retry_ledger.sql`
3. `20260803224500_referral_entitlement_accumulation.sql`

Apply the migrations before deploying the application. Roll back the app first;
retain the additive ledgers during an application rollback so retry history is
not lost. Remove those tables/functions only in a separately reviewed data
migration after confirming no deployed version uses them. Configure
`REGISTRATION_TICKET_SECRET` as an independent high-entropy secret; the service
role key is only a compatibility fallback. Rotating it invalidates outstanding
45-minute registration tickets and users can safely request a new code.

Stripe/referral providers and Postgres cannot participate in one distributed
transaction. Deterministic idempotency keys, provider metadata, database
ledgers, and leases make retries safe, but an operator may still need to inspect
a provider after a terminal network ambiguity. Likewise, a notification may be
sent before its ledger write; a stale retry can duplicate that best-effort
email. These limitations are explicit and do not affect account authority.

Verification used Node 24.13.1, Bun 1.3.14, local Supabase, and local Mailpit.
The local email ceiling is 100/hour so the serial recovery plus OTP-resend E2E
flow is deterministic; production rate limits are unchanged. Stripe, Resend,
Veriff, Contentful, Sentry, and production Supabase were not contacted. The
production build completes with 86 static-generation entries, and account E2E
coverage proves normal/admin login, non-admin denial, recovery/password change,
claim validation, OTP resend invalidation, and retry-safe registration. Full
verification passed: 209 unit/component tests with 582 assertions,
non-incremental TypeScript, repository-wide Prettier, ESLint with 0 errors and
87 baseline warnings, the production build, and all 42 Playwright tests. The
E2E build disables Sentry through the same external-provider kill switch, so
browser telemetry cannot leave the local test environment.

Phase 8 consolidated legacy feedback without changing mutation authority: the
single root Sonner toaster now covers former Toastify and message-context
notifications, while destructive decisions retain local AlertDialogs. The
Toastify utility, error consumer, blocking message components, provider, CSS,
and dependency were removed after source-consumer verification.

### Phase 2 bundle comparison

| Route or chunk                     | Phase 1 | Phase 2 |    Change |
| ---------------------------------- | ------: | ------: | --------: |
| Shared first-load JS               |  209 kB |  209 kB |      0 kB |
| `/` first load                     |  334 kB |  334 kB |      0 kB |
| `/dashboard` first load            |  393 kB |  393 kB |      0 kB |
| `/dashboard/treatments` first load |  291 kB |  322 kB |    +31 kB |
| `/dashboard/treatments` route JS   | 6.45 kB | 42.6 kB | +36.15 kB |
| Middleware                         |  126 kB |  126 kB |      0 kB |

The treatment increase is material and expected for the first production proof slice: the route now owns React Hook Form with the Zod resolver plus Radix Dialog and AlertDialog behavior and their accessible focus management. These packages remain feature-bound—the shared, home, and dashboard first-load totals do not increase. TanStack Query is installed for the approved sequence but is not mounted or used; treatment data transport remains unchanged until Phase 6.

## Phase exit and review checklist

- Compare this inventory against `rg` searches for old components, direct Supabase clients, icon packages, toast packages, CSS imports, Server Actions, route handlers, and cache calls.
- Preserve `.env`, production data, ignored history, generated `.next`, and local Supabase state; never stage them.
- Run scoped unit tests, non-incremental typecheck, lint baseline, production build, Playwright, and targeted browser/accessibility review.
- Review the documentation diff against the code, commit the inventory and architecture concerns separately, push one branch, open one ready-for-review documentation PR, and stop.

## Explicit deferred decisions

- **Exact Radix package set:** decide from the first Phase 2 primitive slice; do not bulk-install the catalog.
- **Token color space and dark mode:** semantic variable names are decided; OKLCH conversion and dark mode are deferred until brand/custom-domain parity and contrast are measured.
- **Query hydration mechanism:** Server Component seeding is decided; choose `initialData` versus dehydrate/hydrate per feature based on staleness and payload size.
- **Public-profile cache duration/read model:** resolved in Phase 7 as a typed aggregate with request memoization plus a five-minute auth-neutral persistent content cache; exact authorized mutation tags own normal freshness.
- **Headless UI removal timing:** target is owned Radix-backed primitives; remove Headless UI only after its current consumers have parity.
- **Bundle budgets:** record Phase 1 route sizes now; set thresholds after the foundation and one representative migration show realistic deltas.
- **Rate limiting provider:** process-local rate limits are insufficient, but the edge/provider choice is an infrastructure decision outside this documentation phase.
- **Tracked `supabase/.temp` cleanup:** completed in the focused Phase 8 cleanup slice; all eight paths are ignored and untracked, and the local files remain available to the CLI.
- **Generated layout type failure:** determine whether `searchParams` must move out of `app/dashboard/layout.tsx` or be parsed at a page boundary; do not hide the issue with generated-file exclusion.
- **Visual regression tooling:** screenshots are required for visible PRs; adopt a hosted visual service only if manual/Playwright screenshots prove insufficient.

## Phase 7 public-profile rendering and cache decision

The username page and metadata now share a typed `server-only` identity and
public-content aggregate. React request memoization deduplicates identity reads
within one render. The ordinary public content payload is separately persisted
for five minutes with `unstable_cache`, keyed only by immutable profile and
dentistry IDs and tagged with `public-profile:<profileId>` plus the controlled
feature tags. Its Supabase client is anonymous, typed, cookie-free, and subject
to public RLS; authenticated owner/admin identity and preview authorization are
never placed in the persistent payload.

Next.js 16 `use cache` was not selected because it requires enabling Cache
Components, which is outside this phase. Headers, cookies, host branding,
custom-domain resolution, and analytics render context remain at the route
boundary. Every successful authorized Phase 6 content mutation calls
`updateTag` for the exact aggregate, feature, and entity tags; validation,
authorization, and database failures do not invalidate. The five-minute TTL is
a recovery bound, not the normal freshness mechanism.

The username route retains dynamic request-bound host and preview handling.
The blog article deliberately retains `force-dynamic`, removes the conflicting
static-params path, and uses an ownership-scoped server query for page and
metadata. Blog rendering no longer increments its legacy counter; the explicit
click endpoint is the single increment boundary. Work locations and footer
socials render the server aggregate and no longer perform browser refetches.

## Phase 8 privileged admin boundary

Admin and security-console authorization now uses one server policy keyed by
the authenticated user's immutable ID, persisted role, and blocked status.
`security_admin` remains read-only: it can inspect security records and the
minimal security-user projection, while block/unblock operations, ordinary
admin pages, billing, verification, marketing, exports, and user management
remain admin-only. Page guards, proxy guards, and API handlers share this role
matrix; blocked privileged users are denied at every boundary.

Service-role access for the migrated routes is isolated in server-only,
operation-specific repositories. Security-user, admin-table, and export reads
use explicit projections so Veriff sessions, domain verification codes, Stripe
identifiers, and subscription authority fields are not returned incidentally.
Marketing campaigns are strictly bounded before suppression-list or email
provider work. No schema migration, production provider call, credential use,
or analytics behavior change is part of this slice.

### Proxy authentication validation decision

The broad Next.js Proxy now validates request identity with
`supabase.auth.getClaims()` and uses only the verified `sub` claim for route
guards and the existing persisted admin-capability lookup. This follows the
current [Supabase Next.js SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager):
asymmetric signing keys verify locally through cached JWKS, while symmetric
keys fall back to an Auth-server validation equivalent to `getUser()`. The
checked local project advertises one ES256 EC key with a `kid`, and the pinned
Supabase JS 2.112 client implements both paths. No production signing-key
rotation or provider call was made.

Cookie refresh remains request-bound and tests prove refreshed cookies and
cache headers survive normal responses and guard redirects. Anonymous
dashboard/admin guards and the persisted ordinary-user, blocked-user,
security-admin, and admin matrix are unchanged. Server handlers that need a
full authoritative Auth user continue to use `getUser()`; this measured change
is limited to the broad Proxy, which needs only the immutable subject ID.

### Phase 8 client bundle budgets

`bun run bundle:check` reads the production Turbopack client-reference
manifests after `bun run build`, takes the unique union of root, polyfill,
route JavaScript, and route CSS assets, and compares deterministic level-9 gzip
bytes. The budgets are 5–8% above the 2026-08-10 post-migration measurements,
which allows small toolchain variance while rejecting a meaningful route
regression:

| Route                     | Measured gzip bytes |  Budget |
| ------------------------- | ------------------: | ------: |
| `/`                       |             538,223 | 570,000 |
| `/register`               |             521,825 | 555,000 |
| `/[username]`             |             486,387 | 520,000 |
| `/dashboard`              |             614,261 | 650,000 |
| `/dashboard/gallery`      |             594,466 | 630,000 |
| `/dashboard/review`       |             594,830 | 630,000 |
| `/dashboard/subscription` |             583,492 | 620,000 |
| `/admin`                  |             506,730 | 540,000 |
| `/admin/security`         |             503,150 | 540,000 |
| `/upgrade`                |             566,322 | 605,000 |

The check is intentionally post-build and adds no analyzer dependency. It
measures shipped client assets rather than server output or historical Webpack
first-load figures. The browser-boundary test separately bundles both canonical
server and service-role Supabase factories as browser entrypoints and requires
each to fail on its `server-only` guard.

The subscription dashboard now resolves one server-owned overview for the
authorized owner: database authority, current provider subscription, payment
methods, and the first invoice page. Provider sections execute concurrently and
fail independently, while the page seeds one React Query entry so the plan,
payment, and billing cards perform no mount-time API reads. Mutations refresh
that canonical overview; invoice pagination remains explicit. Checkout,
destructive cancellation authority, legacy pricing routes, and provider
callbacks remain separate follow-up slices rather than being broadened here.

## Phase 8 subscription and billing controls

Subscription controls now use the owned Button, Alert, AlertDialog, and Sonner
surfaces while retaining Stripe Elements as the provider-owned card entry
boundary. Plan navigation is a semantic link. Cancellation, default-card, and
card-removal failures keep their confirmation and server error visible; the
canonical overview refreshes and success feedback appears only after an
authoritative mutation succeeds. Payment-card actions include the card brand
and final four digits in their accessible names, and invoice failures render
inline rather than through the retired confirmation/message UI.

The unused billing-information form was removed after import verification. No
billing route, Stripe webhook, proration rule, checkout behavior, credential,
schema, public analytics contract, or provider callback changed in this slice.
Focused component coverage verifies semantic navigation and failure
preservation; signed-in desktop/mobile and critical-axe checks exercise the
rendered dashboard without sending a Stripe mutation or provider request.

## Phase 8 settings and custom-domain forms

Account identity settings now use owned Field, Input, Select, Button, Alert,
and AlertDialog primitives with RHF/Zod field ownership. The browser no longer
writes the `users` table directly: a reparsing Server Action reauthorizes the
effective dashboard identity, enforces the current username contract on
changes while preserving grandfathered usernames, updates only presentation
columns, and invalidates the exact public profile tag after success. Password
recovery retains its established server action, and account deletion retains
the existing authenticated removal boundary behind an accessible destructive
confirmation.

Custom-domain interactive state is owned by one React Query key. Connect input
is validated by the same pure normalization policy used by the server route;
provider and authority writes remain in the compensated authenticated route.
Re-check always performs a live status GET rather than accepting a fresh cache,
and disconnect uses AlertDialog rather than a native confirmation. Sonner is
the sole notification surface. These dashboard/editor interactions remain
explicitly excluded from public-profile conversion analytics. Focused unit,
provider-failure, keyboard navigation, critical axe, safe production build,
and signed-in localhost desktop/mobile checks passed without production
provider calls or schema changes.

## Phase 8 verification and Veriff controls

Identity verification keeps the server-derived entitlement and verified state
from the dashboard shell while moving provider launch into a typed React Query
mutation with owned Button and Alert feedback. The browser sends no provider
fields. A provider-returned session URL is accepted only when its HTTPS origin
matches the server-configured Veriff base origin; that contract is enforced
before session persistence and response, then reparsed again before browser
navigation. Failed launch requests remain on the dashboard with a retryable
inline error.

Delegated admin verification state now has one target-ID Query owner and a
capability-authorized mutation. Target responses are strictly parsed, failed
updates keep the prior status and confirmation open, and preview refresh plus
Sonner success feedback occur only after an authoritative write succeeds.
Native confirmation and parallel mirrored loading/status state were removed in
favor of the owned AlertDialog and Query lifecycle. Intercepted provider E2E,
critical axe, focused authorization/provider tests, and signed-in localhost
desktop/mobile visual checks passed without contacting Veriff or changing
public analytics behavior.

## Phase 8 offer-code and marketing forms

Admin offer-code management now uses owned white table, Dialog, AlertDialog,
Field, Input, and Button surfaces with RHF/Zod draft ownership. Create, update,
and delete failures preserve their editor or confirmation. The management route
reauthorizes every operation and strictly reparses its DTOs; listing is
admin-only, so the retired optional-auth GET can no longer enumerate valid
offer codes.

Email marketing composition now uses owned form controls and validates before
opening an explicit external-delivery confirmation. Confirmed HTTP rejection
remains retryable with the draft intact. A lost or malformed response is treated
as an unknown delivery outcome: the confirmation closes and warns the operator
not to resend until delivery is checked, avoiding an ambiguous duplicate-send
path without changing the provider implementation. Localhost and E2E checks do
not submit an offer mutation or email campaign.

Signed-in localhost verification also exposed and fixed a Phase 8 repository
projection regression that selected nonexistent `dentistries.id`, crashing the
entire admin console. The projection now selects `dentistry_id`, while the table
guards error/invalid envelopes and renders inline failure instead of throwing.
No schema, email-provider, credential, production-data, dependency, or public
analytics behavior changed in this slice.

## Phase 8 admin user-management forms

Admin user management now uses owned buttons, fields, selects, Dialog, and
AlertDialog surfaces with RHF/Zod ownership for filters, announcements, and
plan changes. The full controlled filter set is reparsed by the server and
mapped to allowlisted columns; unknown authority remains rejected. A live
localhost check exposed the branch regression that rejected every initial user
list request because the new client included the existing middle-name and
country filters. The route and repository now support those bounded filters.

Announcement writes are admin-authorized before parsing and accept only title
and content. User deletion requires one strict immutable ID/email pair, resolves
that exact target before provider/auth deletion, and delegates the privileged
Auth operation to a narrow server-only repository. Failed destructive or
provider mutations preserve their dialog and draft; successful deletion remains
authoritative even if the subsequent list refresh fails. Plan confirmation
focuses its safe action, and returning from confirmation preserves the editor.
Dashboard/admin controls remain explicitly excluded from public conversion
analytics.

## Phase 8 paid-user reporting forms

Paid-user reporting retains the existing admin-only `billing:read` boundary and
Stripe read model while strictly reparsing its optional date query before any
provider call. A request supplies either no dates or one complete, valid,
ordered ISO range; partial, impossible, reversed, and unknown inputs fail
closed. The reporting UI now uses owned Button, Calendar, Field, Select, and
Alert surfaces with bounded table scrolling, named payment-history expansion,
keyboard calendar focus/Escape restoration, and responsive pagination.

The last successful period remains paired with its data when a replacement
refresh fails, and stale requests cannot overwrite newer state. No Stripe
mutation, webhook, billing authority, credential, schema, dependency, or public
analytics contract changes in this slice. Focused component and server-input
tests plus intercepted admin E2E/critical axe cover the boundary without a
provider request.

## Phase 8 security block-list forms

Security block-list creation for domains, IP addresses, and device
fingerprints now uses owned Button, Input, and Field primitives with RHF/Zod
draft ownership and bounded, trimmed payloads. Existing capability-authorized
routes still reparse every request and remain authoritative. The dashboard
passes an explicit role-derived capability to each management surface:
`security_admin` retains read access but receives no mutation controls, while
admin mutations remain available behind the server's `security:manage` gate.

The security section selector is a complete keyboard tab widget with roving
focus, wrapping arrow navigation, Home/End support, and an associated tabpanel.
Focused schema, keyboard, authorization, intercepted Playwright, and critical
axe coverage protect the slice. The follow-up security-controls PR replaces
legacy destructive confirmations with owned AlertDialog flows that focus the
safe action, reject duplicate submission, and preserve the immutable target on
failure. Security-user search, audit/security-log filters, and every security
page-size selector now use owned inputs, buttons, and selects while preserving
their existing queries and pagination. These internal controls remain excluded
from public conversion analytics.
