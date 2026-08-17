# Public profile template feature matrix

Status: current implementation audit  
Audited: 2026-08-17

This report records which owner-managed DentalBio features are present in each
public template and the rules used to present them. It covers the nine
templates dispatched by `PublicProfileTemplate.tsx` and the anonymous public
projection loaded by `public-profile.ts`.

## Scope and legend

- **Yes**: the complete eligible inventory is available as a public module.
- **Partial**: the source is used, but only a subset is reachable or it is used
  only as a hero, summary, CTA, or single-location treatment.
- **No**: the template does not present the saved feature.
- Supported modules self-omit when their eligible inventory is empty.
- Eligibility is fail-closed: malformed, unsafe, disabled, blank, or
  privacy-ineligible rows do not become public.
- Every list described as dynamic is uncapped and deterministically ordered by
  its public selector: saved rank where available, immutable UUID for
  unranked locations, and an explicit featured-first presentation only where
  the template preserves that owner choice without hiding inventory.

## 1. Feature presence matrix

| Template                    | Identity / bio | Socials / website | Booking / contact | Treatments | Services | Saved links | Blogs | Videos | Before / after gallery | General gallery | Reviews | External review pages | Locations | Products |
| --------------------------- | -------------- | ----------------- | ----------------- | ---------- | -------- | ----------- | ----- | ------ | ---------------------- | --------------- | ------- | --------------------- | --------- | -------- |
| Basic                       | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Direct Booking              | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Location or Provider Router | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Services Catalogue          | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Cosmetic Transformation     | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Trust-First Family Practice | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Specialist Assessment       | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Clinic and Commerce         | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Expert and Educator         | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |

## 2. Implementation details matrix

| Template                        | Treatments and services                                                                                                                                                                | Links, blogs, videos, and products                                                                                                        | Galleries, reviews, and locations                                                                                            | Important presentation details                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Basic**                       | Complete treatment and service inventories are separated by `isService` and shown under owner-defined headings.                                                                        | Complete safe saved links and enabled blogs are shown. Basic also exposes the complete enabled video and product inventories.             | Complete before/after cases, general images, reviews, external review destinations, and saved locations are shown.           | Basic retains its established module components but follows the same uncapped, deterministic public-data contract.                   |
| **Direct Booking**              | Reuses the shared treatment/service selector and booking-style renderer. Treatments and services are separate, uncapped, and owner-titled; there is no featured-treatment consumption. | Reuses complete links, blogs, video groups, and products. Videos keep owner group membership; products use native tracked outbound links. | Complete galleries, reviews, external destinations, and all saved locations with owner-managed location media are shown.     | Booking CTAs remain template-specific; reusable inventory modules do not inherit the former first-three behavior.                    |
| **Location or Provider Router** | Reuses the shared treatment/service selector and router-style renderer with both complete inventories.                                                                                 | Reuses complete links, blogs, video groups, and products.                                                                                 | Complete galleries, reviews, external destinations, and every saved location are reachable through the deterministic router. | Location selection changes active details without reducing the stored inventory; all other shared modules remain independent.        |
| **Services Catalogue**          | Reuses the shared catalogue-style treatment/service renderer. The obsolete **Featured care** / first-three split and **Browse by need** component are removed.                         | Reuses complete links, blogs, video groups, and products.                                                                                 | Complete galleries, reviews, external destinations, and all saved locations with owner-managed media are shown.              | Owner-defined treatment and service headings are authoritative; services are never relabelled or consumed by a mixed featured block. |
| **Cosmetic Transformation**     | Reuses the shared cosmetic-style treatment/service renderer; the former signature/remaining cap is removed.                                                                            | Complete links, blogs, video groups, and products are shown through the shared strict selectors.                                          | Complete before/after and general galleries, reviews, external destinations, and all saved locations are shown.              | Template-specific gallery styling and hero accents never consume or hide the complete saved inventories.                             |
| **Trust-First Family Practice** | Reuses the shared family-style renderer with complete separate owner-titled treatment and service inventories.                                                                         | Complete links, blogs, video groups, and products are shown.                                                                              | Complete galleries, reviews, external destinations, and all saved locations are shown.                                       | The previous first-three treatment cap and patient-resource link cap are removed; family-practice composition remains intact.        |
| **Specialist Assessment**       | Reuses the shared specialist-style renderer with complete separate inventories.                                                                                                        | Complete links remain discoverable regardless of specialist CTA classification; all blogs, video groups, and products are shown.          | Complete galleries, reviews, external destinations, and all saved locations are shown.                                       | Classification is supplemental presentation only and never controls saved-row eligibility.                                           |
| **Clinic and Commerce**         | Reuses the shared commerce-style renderer; treatments and services are separated and uncapped rather than mixed into the first three rows.                                             | Complete links, blogs, video groups, and products are dynamic and uncapped.                                                               | Complete galleries, reviews, external destinations, and all saved locations are shown.                                       | Commerce ordering remains template-specific while the reusable modules preserve the common data, safety, and analytics contract.     |
| **Expert and Educator**         | Reuses the shared editorial-style renderer with complete separate treatment and service inventories.                                                                                   | Complete links, blogs, video groups, and products are shown.                                                                              | Complete galleries, reviews, external destinations, and all saved locations with owner-scoped media are shown.               | The former classified/capped resource presentation and first-location selection no longer determine discoverability.                 |

## 3. Current cross-template findings

### Completed parity families

The following owner-managed families are now present in all nine templates and
accept a dynamic uncapped inventory:

- treatments;
- services;
- saved links;
- blogs;
- before/after galleries;
- general galleries;
- reviews; and
- external review destinations.

Treatments and services are always separated by `isService`, keep independent
one-based positions, and consume the exact owner-defined section headings. A
template may style the shared data differently, but it may not reintroduce a
featured/first-three/signature selection that hides rows.

Saved-link eligibility is independent of owner title and group wording. Every
active, titled, credential-free HTTPS destination remains discoverable; any
template-specific classification is presentation-only. Malformed legacy media
fails closed to the native text link rather than crashing the profile.

General-gallery images may still be reused as a hero or accent, but the full
general gallery is rendered separately and reuse never consumes its inventory.

### Final parity families

Locations, videos, and products are now also complete in all nine templates.
Every template consumes the shared strict location, grouped-video, and product
selectors. Templates reuse `WorkLocation`, `ProfileVideoSections`, and
`ProfileProductSection` wherever their existing UI did not already provide a
complete surface; the Location Router retains its purpose-built location
selector because all saved locations are reachable there.

This reuse is intentional: each template keeps its own composition and visual
rhythm while sharing eligibility, ordering, safe URL/media handling, empty
behavior, accessibility, native interaction semantics, and controlled analytics.

## 4. One-line resolution logic and status

| Issue                      | One-line logic fix                                                                                                                                                                    | Status                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Treatments                 | Filter every eligible row by `isService !== true`, keep rank/ID order, and render the complete inventory under the exact owner-defined treatment heading.                             | Completed in all 9 templates |
| Services                   | Filter every eligible row by `isService === true`, keep an independent order/position sequence, and render a separate complete section under the exact owner-defined service heading. | Completed in all 9 templates |
| Saved links                | Treat title/group classification as optional presentation only and render every active titled credential-free HTTPS destination with stable identity and controlled tracking.         | Completed in all 9 templates |
| Blogs                      | Render every strictly enabled owner-grouped post in deterministic order; malformed optional media must never hide or crash the post.                                                  | Completed in all 9 templates |
| Reviews                    | Render every eligible review in saved order; aggregate ratings and highlighted quotes may supplement but never cap or replace the inventory.                                          | Completed in all 9 templates |
| External review pages      | Persist and render an ordered dynamic collection of safe enabled destinations with stable IDs and controlled tracking instead of selecting the first row.                             | Completed in all 9 templates |
| General-gallery hero reuse | A gallery image may also serve as a hero/accent, but the complete eligible gallery remains independently rendered and uncapped.                                                       | Completed in all 9 templates |
| Before/after gallery       | Render every complete safe case in deterministic order with stable per-image analytics positions; do not rely on template featured IDs as eligibility.                                | Completed in all 9 templates |
| Locations                  | Keep every valid saved location reachable in deterministic order, render each location's owned image, and never substitute a gallery image or stop at the first row.                  | Completed in all 9 templates |
| Videos                     | Normalize strict enabled groups/videos and safe video providers once, then reuse the tracked responsive video module across every template.                                           | Completed in all 9 templates |
| Products                   | Normalize strict enabled products and safe credential-free destinations once, then reuse the tracked product module without template caps.                                            | Completed in all 9 templates |

## 5. Verification snapshot

- Aggregate production build: passed, including TypeScript and all 100 static
  pages.
- Exact isolated seed verifiers: passed before and after reload for the eight
  newly extended Location/Video/Product showcases, including strict empty and
  sentinel cases. Basic remained covered by its existing selector contracts and
  desktop/mobile public regression.
- Public browser coverage on port 3002: 21/21 desktop and 390 px mobile
  scenarios passed across the three reusable-component batches, including axe,
  exact IDs/titles/positions, video group membership, location actions, native
  product links, image decoding, reload persistence, coexistence, and overflow.
- Dashboard Shop and Video lifecycle coverage on port 3002: setup plus both
  mutation suites passed 3/3, preserving exact-one refresh after success and
  zero refresh after validation, authorization rejection, or cancel.
- The final aggregate used only isolated local Supabase API 55321 / database
  55322; canonical and production data were not touched.

## 6. Primary implementation references

- Dispatcher and shared wrapper:
  `app/[username]/_components/PublicProfileTemplate.tsx`
- Public projection loader:
  `app/[username]/_lib/public-profile.ts`
- Shared treatments/services:
  `app/[username]/_lib/profile-treatment-services.ts` and
  `app/[username]/_components/ProfileTreatmentServiceSections.tsx`
- Shared saved links:
  `app/[username]/_lib/profile-links.ts` and
  `app/[username]/_components/ProfileLinksSection.tsx`
- Shared reviews and external destinations:
  `app/[username]/_lib/profile-reviews.ts` and
  `app/[username]/_components/ProfileReviewsSection.tsx`
- Shared gallery policy and renderer:
  `app/[username]/_lib/profile-gallery.ts` and
  `app/[username]/_components/ProfileGallerySection.tsx`
- Shared location policy and renderer:
  `app/[username]/_lib/profile-locations.ts` and
  `app/[username]/components/WorkLocation.tsx`
- Shared grouped-video policy and renderer:
  `app/[username]/_lib/profile-videos.ts` and
  `app/[username]/_components/ProfileVideoSections.tsx`
- Shared product policy and renderer:
  `app/[username]/_lib/profile-products.ts` and
  `app/[username]/_components/ProfileProductSection.tsx`
- Template-specific public composition:
  `app/[username]/_components/*ProfileTemplate.tsx`
- Template catalogue and owner-presentation contract:
  `lib/profile-presentation/catalog.ts` and
  `lib/profile-presentation/contract.ts`
