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
- Eight `supabase/.temp/*` files are already tracked despite the current ignore rules, including local project/pooler metadata. Do not expose their contents; remove them from version control in a separately reviewed security/cleanup commit.

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

| Current implementation        | Inventory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Disposition                               | Target / risk                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod validation                | `lib/validation.ts`, `lib/treatmentDescription.ts`, `utils/functions/socialMediaProfiles.ts`, `utils/registrationUrl.ts`                                                                                                                                                                                                                                                                                                                                                                                                   | **Keep / Adapt**                          | Put capability schemas under `lib/<capability>`; use Zod as the authoritative contract. Preserve tested normalization and treatment reset behavior. |
| Dashboard field primitives    | `app/dashboard/components/LabeledInput.tsx`, `LimitedTextArea.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **Adapt**                                 | Seed owned Field/Input/Textarea primitives. Preserve helper/error IDs, character count, `aria-describedby`, and tests.                              |
| Registration controls         | `app/register/CustomInput.tsx`, `CustomButton.tsx`, `CustomDayPicker.css`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **Replace**                               | Component mixes text/password/date parsing and calendar behavior. Split into primitives and RHF fields.                                             |
| Specialized controls          | `app/components/DatePicker/DatePicker.tsx`, `OtpInput.tsx`, `TextEditor/RichTextEditor.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                | **Adapt**                                 | Keep bounded adapters; audit keyboard/paste/focus for OTP, and expose normal value/error APIs.                                                      |
| Account/map controls          | `app/dashboard/settings/UsernameInput.tsx`, `app/dashboard/location/GoogleMapAutocomplete.tsx`, `MapLoader.tsx`                                                                                                                                                                                                                                                                                                                                                                                                            | **Adapt**                                 | Compose the account field from owned Field/Input; keep Maps loading, selection and failure behavior feature-bound and lazy.                         |
| Upload controls               | `app/dashboard/components/ImageUploader.tsx`, `app/dashboard/ProfilePictureUploader.tsx`, `utils/supabase/useUppyWithSupabase.tsx`                                                                                                                                                                                                                                                                                                                                                                                         | **Adapt**                                 | Share preview/status/error behavior. Browser Supabase remains allowed only for the explicit Storage upload path.                                    |
| Auth/account forms            | `app/login/page.tsx`, `app/admin-login/page.tsx`, `app/register/page.tsx`, `app/register/email-success/page.tsx`, `app/forgot-password/page.tsx`, `app/dashboard/settings/ForgotPasswordForm.tsx`, `SettingsForm.tsx`, `app/components/home-page/ClaimForm.tsx`                                                                                                                                                                                                                                                            | **Adapt**                                 | Migrate to RHF/Zod and standard ActionResult. Preserve server auth actions and registration brand routing.                                          |
| Profile/referral/domain forms | `app/dashboard/components/ProfileEditor.tsx`, `SocialLinksEditor.tsx`, `RightPanelClient.tsx`, `AddressItem.tsx`, `app/dashboard/referral/InviteEmailForm.tsx`, `app/dashboard/domain/DomainClient.tsx`                                                                                                                                                                                                                                                                                                                    | **Adapt**                                 | Compose owned fields; remove parallel pending/error implementations.                                                                                |
| Content forms                 | `app/components/Group/{AddNewGroupForm,Group}.tsx`; `app/dashboard/blog/components/{AddNewGroupForm,BlogGroup}.tsx`; `app/dashboard/components/{AddBlogModal,EditBlogModal,AddVideoModal}.tsx`; gallery add/edit modal files; links `AddLinkForm.tsx`, `AddLinkGroupForm.tsx`, `LinkGroup.tsx`; location `AddLocation.tsx`, `LocationListManager.tsx`; review `ManageReviews.tsx`, `AddReviewModal.tsx`; shop `AddIndividualProductModal.tsx`; treatments `AddTreatment.tsx`, `ManageServices.tsx`, `ManageTreatments.tsx` | **Replace shells / Adapt feature fields** | Approximately 40 form-bearing files hand-roll values and errors. Migrate one feature slice at a time; do not create a generic domain form.          |
| Form framework                | No `react-hook-form`, `@hookform/resolvers`, or `useForm` usage                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **Add in Phase 2**                        | One approved framework; no competing form state library.                                                                                            |

### Buttons, selection, and overlays

| Current implementation          | Inventory                                                                                                                                                                                                                                                                                                     | Disposition                               | Target / risk                                                                                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rounded buttons                 | `app/components/Button/FullRoundedButton.tsx`, `RoundedButton.tsx`                                                                                                                                                                                                                                            | **Adapt**                                 | Seed one CVA Button and preserve current appearance as variants.                                                                                                          |
| Feature submit buttons          | `app/dashboard/components/SaveButton.tsx`, `app/register/CustomButton.tsx`, login/admin-login/email-success `SubmitButton.tsx`                                                                                                                                                                                | **Replace / Remove after migration**      | Duplicate pending/disabled/spinner behavior.                                                                                                                              |
| Icon button                     | `app/dashboard/components/IconButton.tsx`                                                                                                                                                                                                                                                                     | **Adapt**                                 | Require accessible name, visible focus, tooltip only as supplemental text.                                                                                                |
| Feature utility actions         | `app/components/Button/GotoDashboard.tsx`, `app/dashboard/components/CopyButton.tsx`, `SocialProfileVisitButton.tsx`, `app/dashboard/referral/ReferralButton.tsx`, `app/dashboard/verification/components/VerifyButton.tsx`                                                                                   | **Adapt behavior / Replace presentation** | Preserve navigation/copy/visit/verify behavior while composing owned Button/IconButton and pending states.                                                                |
| Switches                        | `app/dashboard/components/Switch.tsx`, `app/components/Switcher.tsx`, `TooltipSwitcher.tsx`                                                                                                                                                                                                                   | **Replace / Remove after migration**      | One Radix-backed Switch. Current default ID can collide; require generated/consumer ID and associated label.                                                              |
| Dropdown/select                 | `app/components/Dropdown.tsx` plus native selects embedded in feature forms                                                                                                                                                                                                                                   | **Replace**                               | Custom div dropdown lacks keyboard/listbox semantics. Prefer native select or owned Radix Select.                                                                         |
| Best existing confirm dialog    | `app/components/Modal/ConfirmMessage.tsx`                                                                                                                                                                                                                                                                     | **Adapt**                                 | Preserve its contract while replacing the bespoke trap with owned AlertDialog; add dialog keyboard/focus tests (none currently exist).                                    |
| Generic/treatment/legacy modals | `app/components/Modal/Modal.tsx`, `app/dashboard/treatments/Modal.tsx`, `app/dashboard/components/Modal.tsx`                                                                                                                                                                                                  | **Replace / Remove after migration**      | Missing or incomplete semantics/focus behavior; Bootstrap data API has no durable owner.                                                                                  |
| Blog/video overlays             | `app/dashboard/components/AddBlogModal.tsx`, `EditBlogModal.tsx`, `AddVideoModal.tsx`                                                                                                                                                                                                                         | **Replace shells**                        | Keep feature content, compose owned Dialog.                                                                                                                               |
| Gallery overlays                | `app/dashboard/gallery/components/{AddDentalGalleryModal,AddGalleryModal,AddGeneralGalleryModal,EditGalleryModal,EditGeneralGalleryModal}.tsx`                                                                                                                                                                | **Replace shells**                        | Consolidate focus/backdrop/Escape/close behavior.                                                                                                                         |
| Other overlays                  | `app/dashboard/review/components/AddReviewModal.tsx`, `app/dashboard/shop/components/AddIndividualProductModal.tsx`, `app/dashboard/links/components/ConfirmDeletePopup.tsx`, `app/dashboard/settings/DeleteBio.tsx`, `app/admin/components/upgradePlanModal.tsx`, `app/[username]/components/ShareModal.tsx` | **Replace shells / Adapt content**        | Use Dialog or AlertDialog according to whether a decision is destructive.                                                                                                 |
| Promotional overlay             | `app/components/PromoBanner.tsx`                                                                                                                                                                                                                                                                              | **Replace shell / Adapt flow**            | Sole Headless UI `Transition` consumer found. Preserve delayed/on-scroll claim behavior but add Dialog semantics, named close, Escape, containment and focus restoration. |
| Cards/collection items          | `app/components/Card/BaseCard.tsx`; dashboard `BlogCard`, `VideoCard`, `ReviewCard`, `ProductCard`, `InvidualProductCard`; gallery `GalleryCard.tsx`                                                                                                                                                          | **Adapt base / Replace duplicate shells** | Make Card domain-free; feature collection items own actions. GalleryCard duplicates card/action/switch/confirmation behavior and should converge after parity.            |
| Navigation/layout shells        | `app/components/Navbar.tsx`, `Footer.tsx`; dashboard `Sidebar`, `SidebarItem`, `SidebarItems`, `MobileNavbar`, `RightPanel`, `RightPanelClient`; public profile `Navbar`, `Header`, `Footer`, `Collapse`                                                                                                      | **Adapt**                                 | Preserve responsive route structure; migrate clickable icons and mobile drawer/collapse behavior to named, focus-managed controls.                                        |
| Drag/reorder                    | `app/components/Group/DraggableGroup.tsx`, blog `DraggableBlogGroup.tsx`, gallery `DraggableGeneralGalleryCard.tsx`, and reorder behavior in links/review/shop/treatments/video managers                                                                                                                      | **Keep behavior / Adapt access**          | Retain persistence and `react-dnd` initially; add keyboard reorder controls, live status, and ordering tests before considering dependency replacement.                   |
| Ratings                         | `react-stars` in public `ReviewItem.tsx` and dashboard `AddReviewModal.tsx`; unused top-level `react-rating-stars-component` dependency                                                                                                                                                                       | **Adapt / Replace after parity**          | Provide labelled read-only and interactive rating behavior; remove the dependency-only package after import verification.                                                 |

### Loading, errors, empty states, and notifications

| Current implementation   | Inventory                                                                                                                                                                                                                           | Disposition                          | Target / risk                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Loaders                  | `app/components/Loader/Loader.tsx`, `SkeletonLoader.tsx`                                                                                                                                                                            | **Adapt**                            | Owned Spinner/Skeleton with status text, size variants, reduced-motion support.                                  |
| Route loading UI         | `app/[username]/loading.tsx`; auth/register/upgrade loading files; `app/dashboard/loading.tsx`, `links/loading.tsx`, `location/loading.tsx`, `settings/loading.tsx`, `treatments/loading.tsx`                                       | **Adapt**                            | Compose canonical Skeleton/Spinner; preserve route-specific layout stability.                                    |
| Route errors/not-found   | `app/global-error.tsx`, `app/error/ErrorComponent.tsx`, `app/not-found.tsx`, `app/dashboard/not-found.tsx`                                                                                                                          | **Keep / Adapt**                     | Retain route boundaries, move presentation to owned Alert/EmptyState where useful.                               |
| Inline error             | `app/components/ErrorMessage.tsx` and handwritten feature error blocks                                                                                                                                                              | **Replace**                          | Fold into FieldError or form-level Alert.                                                                        |
| Empty states             | Embedded in `ManageBlogs`, `ManageBlogGroups`, `ManageVideos`, `ManageVideoGroups`, `ManageGalleries`, `ManageReviews`, `ManageIndividualProducts`, `ManageTreatments`, `ManageServices`, `ManageLinkGroups`, `LocationListManager` | **Adapt**                            | Extract one domain-free EmptyState; content stays feature-owned.                                                 |
| Toastify                 | `app/layout.tsx`, `utils/Toast.ts`, direct usage in `app/dashboard/review/AddNewReview.tsx` and `app/error/ErrorComponent.tsx`                                                                                                      | **Replace / Remove after migration** | Move to Sonner and one root Toaster.                                                                             |
| React Hot Toast          | `app/dashboard/domain/DomainClient.tsx`                                                                                                                                                                                             | **Remove after migration**           | No matching Toaster was found; current notifications may not render.                                             |
| Blocking message context | `app/contexts/MessageContext.tsx`, `app/components/Message.tsx`; referral/admin/security consumers                                                                                                                                  | **Replace**                          | A notification should not be an inaccessible blocking modal. Use Sonner or AlertDialog based on required action. |

### Icons and CSS systems

| Current implementation     | Inventory                                                                                                                    | Disposition                          | Target / risk                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Phosphor                   | `@phosphor-icons/react` imports throughout dashboard/public/auth UI                                                          | **Keep**                             | Standard icon library; use per-icon imports and consistent size/weight.                                             |
| Font Awesome               | packages plus global/public CSS imports and React imports                                                                    | **Replace / Remove after migration** | Duplicate icon payload. Replace with Phosphor after visual parity.                                                  |
| Inline SVG/icon components | `app/components/XIcon.tsx`, `app/components/Dropdown.tsx`, home/pricing/public-profile components, `public/icons/*`          | **Adapt**                            | Keep branded/artwork SVGs; replace generic UI glyphs with Phosphor.                                                 |
| Tailwind/theme             | `tailwind.config.ts`, `app/globals.css`                                                                                      | **Keep / Adapt**                     | Primary system; move colors to semantic variables and add `cn`/CVA.                                                 |
| Dashboard CSS              | `app/dashboard/globals.css`, `app/dashboard/styles.css`                                                                      | **Adapt / Remove after migration**   | Migrate selectors per feature; delete only after route visual parity.                                               |
| Public profile CSS         | `app/[username]/bootstrap.min.css`, `link-page.css`, `link-page-responsive.css`                                              | **Adapt / Remove after migration**   | Large Bootstrap/global overlap; preserve public profile visuals before removal.                                     |
| Registration CSS           | `app/register/CustomDayPicker.css`                                                                                           | **Replace**                          | Scope calendar styles behind the owned DatePicker.                                                                  |
| Flowbite                   | dependency and unused module side-effect import in `tailwind.config.ts`; `plugins` is empty and no component usage was found | **Remove after verification**        | It is not registered as a Tailwind plugin. Verify no transitive runtime reliance, then avoid a competing UI system. |
| Headless UI                | `@headlessui/react` used by `app/components/PromoBanner.tsx` for `Transition`                                                | **Remove after Radix parity**        | Do not grow two primitive systems. Migrate PromoBanner during the Dialog phase, then verify imports before removal. |

### Client state, contexts, and URL state

| Current implementation | Inventory                                                                                                                                                     | Disposition                         | Target / risk                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand domain           | `app/contexts/BrandDomainContext.tsx`, `utils/hooks/useDomainConfig.ts`, `utils/domainConfig.ts`                                                              | **Keep / Adapt**                    | Correct server-to-client seam; formalize typed white-label token inputs.                                                                                                                                                                                                                                                                     |
| Navigation/preview     | `NavbarContext.tsx`, `PreviewContext.tsx`                                                                                                                     | **Keep / Adapt**                    | Appropriate low-frequency UI contexts; document provider scope and remove unused values.                                                                                                                                                                                                                                                     |
| Message context        | `MessageContext.tsx`                                                                                                                                          | **Replace**                         | Replace notification state with Sonner; keep dialogs local.                                                                                                                                                                                                                                                                                  |
| Dashboard user         | `DashboardUserContext.tsx`, `app/dashboard/client-layout.tsx`                                                                                                 | **Replace or server-seed narrowly** | Duplicates server layout authorization and `/api/user` load, blocks the entire client dashboard, and mixes identity/server state with UI state. Its active Sidebar/RightPanel/MobileNavbar/Settings/VerifyStatus consumers need an equivalent server-seeded identity/query owner; replace the PreviewContext reload pattern before deletion. |
| Local state/reducers   | Widespread `useState`/`useEffect` in collection managers, subscription panels, admin/security tables, forms and overlays; no application reducer/store        | **Adapt**                           | Keep transient UI state; move remote records/pending/errors to Query/RHF. No Redux/Zustand/MobX/XState need is demonstrated.                                                                                                                                                                                                                 |
| URL state              | `userId` parsing in DashboardUserContext, `client-layout`, Sidebar, MobileNavbar, RightPanelClient and verification; search params in registration/auth flows | **Adapt**                           | One typed parser at the route boundary. Derive authorized effective user server-side; pass normalized state down.                                                                                                                                                                                                                            |

### Data access, Server Components, Actions, hooks, and cache

| Current implementation         | Inventory                                                                                                                                                                                      | Disposition                               | Target / risk                                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical Supabase factories   | `utils/supabase/server.ts`, `client.ts`, `middleware.ts`; root `middleware.ts`                                                                                                                 | **Keep / Adapt**                          | Retain SSR/browser split and domain/auth middleware. Move under `lib/supabase`, add typed schema, mark server-only modules.                                                                                                                              |
| Duplicate Supabase factories   | `app/lib/supabaseClient.ts`, `app/dashboard/settings/utils/supabaseClient.ts`, `app/forgot-password/utils/supabaseClient.ts`, direct anon client in `app/[username]/blog/[slug]/page.tsx`      | **Replace / Remove after migration**      | One canonical factory per runtime.                                                                                                                                                                                                                       |
| Service-role client            | `utils/supabase/supabaseAdmin.ts` used by blocked-IP/fingerprint/security helpers and admin/security/user/webhook/cron routes                                                                  | **Adapt urgently**                        | Add `server-only`; expose per-operation allowlisted repositories, not a generally importable admin client. Use only after explicit server authorization for privileged operations; never as a workaround for a normal user request.                      |
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
- Account/commerce: settings forms/page, referral page, subscription page, forgot-password page, login/email-success actions, upgrade and upgrade-success pages, `app/components/OtpInput.tsx`, `app/components/home-page/ClaimForm.tsx`, and account-removal logic in `app/components/Modal/ConfirmMessage.tsx`.
- Admin UI: `app/admin/components/{OfferCodeManagement,UsersManagement}.tsx`, all blocked-domain/fingerprint/IP/user, profile-audit, security-log/user management components under `app/admin/security/components`, and admin root/layout/paid-users/security server pages. Server reads remain server-owned; Client Components should call typed APIs rather than construct arbitrary queries.
- Public UI: username page/layout/blog page/layout, `app/[username]/components/Footer.tsx`, and `WorkLocation.tsx`. Remove the WorkLocation client fallback after the server prop is guaranteed.

Server-side direct queries in the 63 route handlers and helpers under `utils/{blocked*,trialManagement,securityLogger,slugGenerator,removeFromBucket,user/*}` should be adapted into typed feature repositories rather than mechanically removed.

### Accessibility, bundle, caching, state, and test risks

| Area            | Baseline risk                                                                                                                                                                                                        | Required guardrail                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accessibility   | Global focus outline removal; clickable div/icon patterns; bespoke dropdown without keyboard semantics; most modal shells lack complete focus/Escape/label behavior; duplicate switch IDs; loaders lack status text. | Semantic owned primitives, keyboard tests, `@axe-core/playwright` on representative routes, manual focus/zoom/reduced-motion checks, WCAG 2.2 AA contrast.            |
| Bundle          | Shared first load 209 kB; dashboard 393 kB; Bootstrap CSS, full Font Awesome, multiple toast/rating libraries; maps, Quill, Stripe, Fabric, editors can enter client bundles.                                        | Keep heavy integrations feature-bound/dynamic, consolidate UI packages, record route sizes each phase, add analyzer only when setting a budget.                       |
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
contract. A clean local reset replayed all 24 synced migrations through
`20260804024001_apply_empty_subscription_authority_transition.sql`, and the two
database test files passed 89/89 pgTAP assertions on 2026-08-04. Regeneration is
exact: the checked-in contract is 1,646 lines with SHA-256
`d90c727f5eed4bc0b486e55d2e8e948e31080c994786d224df511e0061322ca5`.
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
non-exposed `private` schema. This durable sequence was delivered by migrations
`20260804005957`, `20260804012919`, `20260804015631`, and `20260804024001`.
It is a narrow compatibility boundary for retained specialized routes, not a
general service-role escape hatch or a claim that Phase 8 form/repository work
is complete.

Starting evidence was 223 passing unit/component tests with two pre-existing
`use-login-lockout` failures caused by Happy DOM rejecting assignment to the
readonly `focus` property. After the isolated-suite correction, the fresh
foundation gate at `6540e13` passes 362/362 tests with 1,201 assertions across
67 files. Non-incremental TypeScript is clean. ESLint reports zero errors and 85
warnings, below the Phase 5 baseline of 87. Tracked-file Prettier passes 552/552
and `git diff --check` is clean. The safe `env -i`, local-only production build
generates 87/87 entries with local Supabase values, non-secret Contentful
placeholders, and provider credentials absent; no production or provider call
occurs. The configured Chromium setup, navigation, and critical axe run passes
21/21. Database lint retains two unchanged pre-Phase6 diagnostics; neither was
introduced by this branch. Ignored SDD working briefs are outside the tracked
Prettier count and are not product artifacts. The recorded future cache
templates are in
`docs/dashboard-public-cache-invalidation-matrix.md`; they do not enable
runtime caching. Production analytics emission and public-cache invalidation
remain disabled.

#### User-change webhook Vault rollout

The database producer reads two Supabase Vault entries by exact name:

- `user_changed_webhook_url` — the fully qualified deployed
  `/api/webhooks/user-changed` URL;
- `user_changed_webhook_secret` — a secret that exactly matches the deployed
  application's `WEBHOOK_SECRET`.

The migrations intentionally provision neither entry. Missing, blank,
whitespace-only, or unreadable configuration fails closed: no HTTP request is
queued, so no plan-change or account email is sent. The synchronous database
branding invariant still applies even when notification delivery is skipped.
Skipped notifications are not replayed automatically.
Provision both entries through a secure out-of-band deployment channel; never
commit, print, or log the secret.

Roll out in this order to avoid silent notification loss:

1. Deploy the application route with a nonblank `WEBHOOK_SECRET`.
2. While plan-changing writes remain paused, create or replace both exact Vault
   names, using the deployed route URL and the same secret as the application.
3. Verify names only; this query must return exactly two rows and must never
   select secret values:

   ```sql
   select name
   from vault.secrets
   where name in ('user_changed_webhook_secret', 'user_changed_webhook_url')
   order by name;
   ```

4. Apply the producer migrations, verify a controlled non-production plan
   change reaches the deployed handler, and only then resume plan-changing
   writes. If the migrations are already applied, provision and verify Vault
   before writes resume.

Rotating the shared secret requires updating the application and Vault within
the same paused-write window, then repeating the controlled verification.

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

Notification cleanup remains deliberately deferred to Phase 8: four source
files still import React Toastify, none import React Hot Toast, and 12 source
files still define or consume `MessageContext`. Removing these without migrating
their admin, referral, error, and shell consumers would be an unrelated behavior
change.

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
- **Public-profile cache duration/read model:** tags and ownership are decided; TTL, database view/RPC, and aggregate shape depend on mutation coverage and query measurements.
- **Headless UI removal timing:** target is owned Radix-backed primitives; remove Headless UI only after its current consumers have parity.
- **Bundle budgets:** record Phase 1 route sizes now; set thresholds after the foundation and one representative migration show realistic deltas.
- **Rate limiting provider:** process-local rate limits are insufficient, but the edge/provider choice is an infrastructure decision outside this documentation phase.
- **Tracked `supabase/.temp` cleanup:** removal is required, but should be a focused security/cleanup commit after confirming deployment tooling does not depend on tracked metadata.
- **Generated layout type failure:** determine whether `searchParams` must move out of `app/dashboard/layout.tsx` or be parsed at a page boundary; do not hide the issue with generated-file exclusion.
- **Visual regression tooling:** screenshots are required for visible PRs; adopt a hosted visual service only if manual/Playwright screenshots prove insufficient.
