# Public profile feature-parity stories

Status: Ready for implementation planning  
Source audit:
[`docs/product/public-profile-template-feature-matrix.md`](../../product/public-profile-template-feature-matrix.md)

## Product contract

Every public template must support every owner-managed feature when eligible
content exists: treatments, services, links, blogs, videos, reviews and
external review pages, shop products, before/after and general galleries, and
locations.

Templates may retain distinct UI, grouping, emphasis, responsive layout, and
deterministic ordering. Those choices must never silently cap, consume, hide,
or invalidate eligible saved content.

For treatments and services:

- They remain distinct inventories.
- Their UI and ordering may differ.
- Their owner-defined section titles come from the two new dashboard inputs.
- Template-specific copy may supplement, but not replace, those accessible
  headings.

For locations:

- Every location remains reachable.
- Images belong to individual location records and are managed in the location
  forms.
- Templates must not substitute unrelated general-gallery images.

## Story inventory

This folder contains **67 feature/template parity stories** and **2 shared
prerequisite stories**.

Shared prerequisites:

1. [Treatment and service section-title inputs](./shared/treatment-service-section-titles.md)
2. [Owner-managed location images](./shared/location-images.md)

| Feature    | Basic                       | Direct Booking                          | Location / Provider Router                        | Services Catalogue                       | Cosmetic Transformation                          | Trust-First Family                                   | Specialist Assessment                          | Clinic / Commerce                        | Expert / Educator                        |
| ---------- | --------------------------- | --------------------------------------- | ------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Treatments | Complete                    | [Story](./treatments/direct-booking.md) | [Story](./treatments/location-provider-router.md) | Complete                                 | [Story](./treatments/cosmetic-transformation.md) | [Story](./treatments/trust-first-family-practice.md) | [Story](./treatments/specialist-assessment.md) | [Story](./treatments/clinic-commerce.md) | [Story](./treatments/expert-educator.md) |
| Services   | Complete                    | [Story](./services/direct-booking.md)   | [Story](./services/location-provider-router.md)   | Complete                                 | [Story](./services/cosmetic-transformation.md)   | [Story](./services/trust-first-family-practice.md)   | [Story](./services/specialist-assessment.md)   | [Story](./services/clinic-commerce.md)   | [Story](./services/expert-educator.md)   |
| Links      | Complete                    | [Story](./links/direct-booking.md)      | [Story](./links/location-provider-router.md)      | [Story](./links/services-catalogue.md)   | Complete                                         | [Story](./links/trust-first-family-practice.md)      | [Story](./links/specialist-assessment.md)      | [Story](./links/clinic-commerce.md)      | [Story](./links/expert-educator.md)      |
| Blogs      | Complete                    | [Story](./blogs/direct-booking.md)      | [Story](./blogs/location-provider-router.md)      | [Story](./blogs/services-catalogue.md)   | [Story](./blogs/cosmetic-transformation.md)      | [Story](./blogs/trust-first-family-practice.md)      | [Story](./blogs/specialist-assessment.md)      | [Story](./blogs/clinic-commerce.md)      | [Story](./blogs/expert-educator.md)      |
| Videos     | Complete                    | [Story](./videos/direct-booking.md)     | [Story](./videos/location-provider-router.md)     | [Story](./videos/services-catalogue.md)  | [Story](./videos/cosmetic-transformation.md)     | [Story](./videos/trust-first-family-practice.md)     | [Story](./videos/specialist-assessment.md)     | [Story](./videos/clinic-commerce.md)     | [Story](./videos/expert-educator.md)     |
| Reviews    | [Story](./reviews/basic.md) | [Story](./reviews/direct-booking.md)    | [Story](./reviews/location-provider-router.md)    | [Story](./reviews/services-catalogue.md) | [Story](./reviews/cosmetic-transformation.md)    | [Story](./reviews/trust-first-family-practice.md)    | [Story](./reviews/specialist-assessment.md)    | [Story](./reviews/clinic-commerce.md)    | [Story](./reviews/expert-educator.md)    |
| Shop       | Complete                    | [Story](./shop/direct-booking.md)       | [Story](./shop/location-provider-router.md)       | [Story](./shop/services-catalogue.md)    | [Story](./shop/cosmetic-transformation.md)       | [Story](./shop/trust-first-family-practice.md)       | [Story](./shop/specialist-assessment.md)       | Complete                                 | [Story](./shop/expert-educator.md)       |
| Gallery    | Complete                    | [Story](./gallery/direct-booking.md)    | [Story](./gallery/location-provider-router.md)    | [Story](./gallery/services-catalogue.md) | [Story](./gallery/cosmetic-transformation.md)    | [Story](./gallery/trust-first-family-practice.md)    | [Story](./gallery/specialist-assessment.md)    | [Story](./gallery/clinic-commerce.md)    | [Story](./gallery/expert-educator.md)    |
| Locations  | Complete                    | [Story](./locations/direct-booking.md)  | Complete                                          | Complete                                 | [Story](./locations/cosmetic-transformation.md)  | [Story](./locations/trust-first-family-practice.md)  | [Story](./locations/specialist-assessment.md)  | [Story](./locations/clinic-commerce.md)  | [Story](./locations/expert-educator.md)  |

“Complete” means no feature/template parity story was identified by the
2026-08-16 audit. It does not waive regression coverage when shared contracts
change.

## Stories by feature

### Treatments (7)

- [Direct Booking](./treatments/direct-booking.md)
- [Location or Provider Router](./treatments/location-provider-router.md)
- [Cosmetic Transformation](./treatments/cosmetic-transformation.md)
- [Trust-First Family Practice](./treatments/trust-first-family-practice.md)
- [Specialist Assessment](./treatments/specialist-assessment.md)
- [Clinic and Commerce](./treatments/clinic-commerce.md)
- [Expert and Educator](./treatments/expert-educator.md)

### Services (7)

- [Direct Booking](./services/direct-booking.md)
- [Location or Provider Router](./services/location-provider-router.md)
- [Cosmetic Transformation](./services/cosmetic-transformation.md)
- [Trust-First Family Practice](./services/trust-first-family-practice.md)
- [Specialist Assessment](./services/specialist-assessment.md)
- [Clinic and Commerce](./services/clinic-commerce.md)
- [Expert and Educator](./services/expert-educator.md)

### Links (7)

- [Direct Booking](./links/direct-booking.md)
- [Location or Provider Router](./links/location-provider-router.md)
- [Services Catalogue](./links/services-catalogue.md)
- [Trust-First Family Practice](./links/trust-first-family-practice.md)
- [Specialist Assessment](./links/specialist-assessment.md)
- [Clinic and Commerce](./links/clinic-commerce.md)
- [Expert and Educator](./links/expert-educator.md)

### Blogs (8)

- [Direct Booking](./blogs/direct-booking.md)
- [Location or Provider Router](./blogs/location-provider-router.md)
- [Services Catalogue](./blogs/services-catalogue.md)
- [Cosmetic Transformation](./blogs/cosmetic-transformation.md)
- [Trust-First Family Practice](./blogs/trust-first-family-practice.md)
- [Specialist Assessment](./blogs/specialist-assessment.md)
- [Clinic and Commerce](./blogs/clinic-commerce.md)
- [Expert and Educator](./blogs/expert-educator.md)

### Videos (8)

- [Direct Booking](./videos/direct-booking.md)
- [Location or Provider Router](./videos/location-provider-router.md)
- [Services Catalogue](./videos/services-catalogue.md)
- [Cosmetic Transformation](./videos/cosmetic-transformation.md)
- [Trust-First Family Practice](./videos/trust-first-family-practice.md)
- [Specialist Assessment](./videos/specialist-assessment.md)
- [Clinic and Commerce](./videos/clinic-commerce.md)
- [Expert and Educator](./videos/expert-educator.md)

### Reviews (9)

- [Basic](./reviews/basic.md)
- [Direct Booking](./reviews/direct-booking.md)
- [Location or Provider Router](./reviews/location-provider-router.md)
- [Services Catalogue](./reviews/services-catalogue.md)
- [Cosmetic Transformation](./reviews/cosmetic-transformation.md)
- [Trust-First Family Practice](./reviews/trust-first-family-practice.md)
- [Specialist Assessment](./reviews/specialist-assessment.md)
- [Clinic and Commerce](./reviews/clinic-commerce.md)
- [Expert and Educator](./reviews/expert-educator.md)

### Shop (7)

- [Direct Booking](./shop/direct-booking.md)
- [Location or Provider Router](./shop/location-provider-router.md)
- [Services Catalogue](./shop/services-catalogue.md)
- [Cosmetic Transformation](./shop/cosmetic-transformation.md)
- [Trust-First Family Practice](./shop/trust-first-family-practice.md)
- [Specialist Assessment](./shop/specialist-assessment.md)
- [Expert and Educator](./shop/expert-educator.md)

### Gallery (8)

- [Direct Booking](./gallery/direct-booking.md)
- [Location or Provider Router](./gallery/location-provider-router.md)
- [Services Catalogue](./gallery/services-catalogue.md)
- [Cosmetic Transformation](./gallery/cosmetic-transformation.md)
- [Trust-First Family Practice](./gallery/trust-first-family-practice.md)
- [Specialist Assessment](./gallery/specialist-assessment.md)
- [Clinic and Commerce](./gallery/clinic-commerce.md)
- [Expert and Educator](./gallery/expert-educator.md)

### Locations (6)

- [Direct Booking](./locations/direct-booking.md)
- [Cosmetic Transformation](./locations/cosmetic-transformation.md)
- [Trust-First Family Practice](./locations/trust-first-family-practice.md)
- [Specialist Assessment](./locations/specialist-assessment.md)
- [Clinic and Commerce](./locations/clinic-commerce.md)
- [Expert and Educator](./locations/expert-educator.md)

## Delivery rules shared by every story

- Default to Server Components and keep client boundaries small.
- Reuse project-owned public-profile and shadcn primitives; do not add a
  competing component system or a top-level features/modules directory.
- Public data reads use the existing public view model. Never expose
  `public.users` anonymously or write directly to `public_profiles`.
- No fixed item limit is allowed as an eligibility rule. Featured/highlighted
  content can supplement the complete inventory.
- Invalid, blank, disabled, or unsafe records follow the existing public data
  policy and do not crash the template.
- Interactive public actions use controlled analytics descriptors, stable
  entity IDs, and one-based visible positions. Never emit free-form or clinical
  data.
- Dashboard/editor controls stay outside owner-profile conversion analytics.
- Successful dashboard mutations refresh authoritative data, invalidate public
  cache tags, and trigger one preview reload; failures trigger none.
- Each PR includes focused unit/component coverage, relevant Playwright and
  mobile coverage, axe, and proportional repository gates.
- Each story has exactly one correctly prioritized Trello card. The 67
  accepted-contract parity defects are Bugs; the two net-new shared
  prerequisites are non-Bug implementation stories unless earlier accepted
  behavior is proven.
- The master reviewer captures and attaches matching before/after screenshots
  from the port-3001 development environment before merging.

## Dependency and merge waves

1. **Baseline:** freeze seed identities, public routes, viewport sizes, scroll
   targets, and before screenshots for all nine templates.
2. **Shared contracts:** merge section-title inputs, then location images.
3. **Independent parity stories:** treatments/services after section titles;
   locations after location images; other feature/template stories may proceed
   in parallel when files do not overlap.
4. **Conflict-aware template merges:** serialize PRs touching the same template
   renderer and rebase later stories on the integration branch.
5. **Cross-template regression:** run the complete public-profile matrix,
   production build, Playwright, mobile checks, and axe.
6. **Final integration PR:** one reviewed PR from the integration branch to
   canonical `develop`; do not deploy or mutate production data.

## Screenshot contract

Each story PR must contain:

- **Before:** integration-branch baseline before that story is applied.
- **After:** the story branch with identical seed data, route, viewport, theme,
  and scroll target.
- Desktop and mobile images when layout changes at both breakpoints.
- Captions naming the template, feature, route, seed profile, viewport, and
  visible acceptance criterion.
- Images uploaded to the PR body or a PR comment, not merely referenced from a
  local filesystem path.
