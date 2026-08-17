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
  saved rank with a stable ID tie-break.

## 1. Feature presence matrix

| Template                    | Identity / bio | Socials / website | Booking / contact | Treatments | Services | Saved links | Blogs | Videos | Before / after gallery | General gallery | Reviews | External review pages | Locations | Products |
| --------------------------- | -------------- | ----------------- | ----------------- | ---------- | -------- | ----------- | ----- | ------ | ---------------------- | --------------- | ------- | --------------------- | --------- | -------- |
| Basic                       | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | Yes    | Yes                    | Yes             | Yes     | Yes                   | Yes       | Yes      |
| Direct Booking              | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Partial   | No       |
| Location or Provider Router | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Yes       | No       |
| Services Catalogue          | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Yes       | No       |
| Cosmetic Transformation     | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Partial   | No       |
| Trust-First Family Practice | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Partial   | No       |
| Specialist Assessment       | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Partial   | No       |
| Clinic and Commerce         | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | No        | Yes      |
| Expert and Educator         | Yes            | Yes               | Yes               | Yes        | Yes      | Yes         | Yes   | No     | Yes                    | Yes             | Yes     | Yes                   | Partial   | No       |

## 2. Implementation details matrix

| Template                        | Treatments and services                                                                                                                                                                | Links, blogs, videos, and products                                                                                                                               | Galleries, reviews, and locations                                                                                                                        | Important presentation details                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Basic**                       | Complete treatment and service inventories are separated by `isService` and shown under owner-defined headings.                                                                        | Complete safe saved links and enabled blogs are shown. Basic also exposes the complete enabled video and product inventories.                                    | Complete before/after cases, general images, reviews, external review destinations, and saved locations are shown.                                       | Basic retains its established module components but follows the same uncapped, deterministic public-data contract.                   |
| **Direct Booking**              | Reuses the shared treatment/service selector and booking-style renderer. Treatments and services are separate, uncapped, and owner-titled; there is no featured-treatment consumption. | Reuses the complete safe-links module and the owner-grouped blog module. No video or product module yet.                                                         | Complete galleries, reviews, and external review destinations are shown. The location surface still uses one selected/first location.                    | Booking CTAs remain template-specific; inventory modules no longer inherit the former first-three behavior.                          |
| **Location or Provider Router** | Reuses the shared treatment/service selector and router-style renderer with both complete inventories.                                                                                 | Reuses the complete links and blogs modules. No video or product module yet.                                                                                     | Complete galleries, reviews, and external destinations are shown. Every valid saved location is reachable through the router in deterministic order.     | Location selection changes the active location details without reducing the stored location inventory.                               |
| **Services Catalogue**          | Reuses the shared catalogue-style treatment/service renderer. The obsolete **Featured care** / first-three split and **Browse by need** component are removed.                         | Reuses the complete safe-links and blogs modules. No video or product module yet.                                                                                | Complete galleries, reviews, external destinations, and saved locations are shown.                                                                       | Owner-defined treatment and service headings are authoritative; services are never relabelled or consumed by a mixed featured block. |
| **Cosmetic Transformation**     | Reuses the shared cosmetic-style treatment/service renderer; the former signature/remaining cap is removed.                                                                            | Complete safe links and all enabled owner-grouped blogs are shown. No video or product module yet.                                                               | Complete before/after and general galleries, complete reviews, and all external destinations are shown. The location surface still selects one location. | Gallery styling remains template-specific, but hero/accent use does not consume or hide the full gallery.                            |
| **Trust-First Family Practice** | Reuses the shared family-style renderer with complete separate owner-titled treatment and service inventories.                                                                         | Complete safe links and all enabled owner-grouped blogs are shown. No video or product module yet.                                                               | Complete galleries, reviews, and external destinations are shown. The location surface still selects one location.                                       | The previous first-three treatment cap and patient-resource link cap are removed.                                                    |
| **Specialist Assessment**       | Reuses the shared specialist-style renderer with complete separate inventories.                                                                                                        | Complete safe links remain discoverable even when they do not match specialist CTA classifications; all enabled blogs are shown. No video or product module yet. | Complete galleries, reviews, and external destinations are shown. The location surface still selects one location.                                       | Title classification is allowed only for supplemental assessment/urgent CTA presentation, never for saved-link eligibility.          |
| **Clinic and Commerce**         | Reuses the shared commerce-style renderer; treatments and services are separated and uncapped rather than mixed into the first three rows.                                             | Complete safe links and enabled blogs are shown. All eligible products remain dynamic and uncapped. No video module yet.                                         | Complete galleries, reviews, and external destinations are shown. Saved locations are still absent.                                                      | Product commerce remains template-specific; shared inventory modules compose around it.                                              |
| **Expert and Educator**         | Reuses the shared editorial-style renderer with complete separate treatment and service inventories.                                                                                   | Complete safe links and all enabled owner-grouped blogs are shown. No video or product module yet.                                                               | Complete galleries, reviews, and external destinations are shown. The location surface still selects one location.                                       | The former classified/capped resource presentation no longer determines discoverability.                                             |

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

### Remaining parity families

- **Locations:** Basic, Location Router, and Services Catalogue expose every
  saved location. Direct, Cosmetic, Trust-First, Specialist, and Expert still
  present one selected/first location. Clinic and Commerce presents none.
- **Videos:** only Basic currently exposes saved videos.
- **Products:** Basic and Clinic and Commerce expose products; the other seven
  templates do not.

These remaining families are the next reusable-component wave. The shared
foundation must normalize strict IDs, ranks, safe media/destinations, controlled
analytics positions, and public-projection ordering before template batches
compose the reusable modules.

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
| Locations                  | Keep every valid saved location reachable in deterministic order, render each location's owned image, and never substitute a gallery image or stop at the first row.                  | Pending in 6 templates       |
| Videos                     | Normalize strict enabled groups/videos and safe video providers once, then reuse the tracked responsive video module across every template.                                           | Pending in 8 templates       |
| Products                   | Normalize strict enabled products and safe credential-free destinations once, then reuse the tracked product module without template caps.                                            | Pending in 7 templates       |

## 5. Primary implementation references

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
- Template-specific public composition:
  `app/[username]/_components/*ProfileTemplate.tsx`
- Template catalogue and owner-presentation contract:
  `lib/profile-presentation/catalog.ts` and
  `lib/profile-presentation/contract.ts`
