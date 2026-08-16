# DentalBio starter profile templates

Derived from the 32-profile study in [`docs/research/linktree-dentist-profile-research.md`](../research/linktree-dentist-profile-research.md).

## Recommendation

Ship eight content templates. Keep content templates independent from visual themes so that choosing a color/font preset never silently reorders or removes patient information.

Every template uses the same accessible base identity order:

1. Optional hero or background visual.
2. Profile photo or practice logo.
3. Name and credentials.
4. Specialty/positioning statement.
5. Compact social/contact row, when useful.
6. Template-specific modules below.

The rendered DOM should keep identity before actions even when a premium layout visually overlaps the profile image with the hero.

## Template 1 — Direct Booking

**Best for:** new solo dentists and small practices with one booking destination.  
**Inspired by:** [Dr. Simran Bukalsaria](https://linktr.ee/simranbukalsaria), [Olive Tree Dental](https://linktr.ee/OliveTreeDental), [Smiles by Dr. Ricaurte](https://linktr.ee/dralejandroricaurte).

### Default order

1. Profile photo/logo.
2. Name and credentials.
3. One-line bio.
4. Social/contact icons.
5. Primary **Book an appointment** button.
6. Secondary **Visit website** or **WhatsApp** action.
7. Three featured treatments.
8. Location summary.
9. Review score/link.

### Design

- Compact centered identity with no required hero.
- Primary CTA occupies the strongest full-width surface and remains sticky only when it does not obscure content.
- Treatment rows use concise labels; overflow routes to a treatment section rather than adding a wall of links.
- Free-plan default because it requires no premium composition.

### Onboarding questions

- What is the one action you want most visitors to take?
- What are your three most important treatments?
- Do you want phone, email, or WhatsApp as the secondary action?

## Template 2 — Location or Provider Router

**Best for:** multi-location practices, group practices, and practitioners working at several clinics.  
**Inspired by:** [Dr. Raghdah Alzuhairy](https://linktr.ee/dr.raghdah_alzuhairy), [Broadwater Dental Clinic](https://linktr.ee/broadwaterdentalclinic), [Dr. Edward Camacho](https://linktr.ee/dredwardcamacho), [Dr. Maria Isabel](https://linktr.ee/Dr.maria.isabel.orthodontist).

### Default order

1. Profile photo/logo.
2. Name and specialty.
3. One-line availability/coverage statement.
4. Primary booking introduction.
5. Location/provider/appointment-type selector.
6. Selected location card: address, hours, map, phone, and booking CTA.
7. Other locations/providers.
8. Location-specific reviews.
9. Social/contact row.

### Design

- The selector must expose a deterministic default and programmatic selected state.
- Selection updates downstream booking and contact actions, not merely the map.
- On narrow screens, use a select/listbox or horizontally scrollable, labelled tabs with a non-scroll alternative.
- A hero is optional; location clarity has priority over imagery.

### Onboarding questions

- Should visitors choose a location, a clinician, or an appointment type first?
- Does each option have a different booking URL, phone number, or treatment set?
- Which option is the default?

## Template 3 — Services Catalogue

**Best for:** full-service, family, and multidisciplinary clinics.  
**Inspired by:** [Kclinic Dental Practice](https://linktr.ee/kclinicdental), [Smiles Only Dental](https://linktr.ee/smilesonly), [Urban Smile](https://linktr.ee/urbansmileaus), [Coastland Dental](https://linktr.ee/coastlanddental).

### Default order

1. Practice logo/photo.
2. Practice name and positioning.
3. Primary booking CTA.
4. **Services** heading.
5. Featured service cards.
6. Grouped service categories.
7. Financing/payment options.
8. Team introduction.
9. Reviews/results.
10. Contact, hours, and locations.
11. FAQs/resources.

### Design

- Show three featured treatments first; place the rest in labelled groups.
- Use progressive disclosure or a dedicated service view when more than six treatments are visible.
- Preserve one-based visible analytics positions after filtering and expansion.
- Free may use text/icon cards; Pro may use image cards and a category navigation rail.

### Onboarding questions

- Which three treatments should be featured?
- Which categories describe the remaining services?
- Are financing or insurance details important before booking?

## Template 4 — Cosmetic Transformation

**Best for:** cosmetic dentists, implant practices, aligner specialists, and high-consideration smile treatments.  
**Inspired by:** [Dr. Daniel Sluyk](https://linktr.ee/drdanielsluyk), [SmileArt Utah](https://linktr.ee/smileartutah), [Advanced Cosmetic Dentistry](https://linktr.ee/dr.sehmi), [Bristles Dentistry](https://linktr.ee/bristlesdentistry).

### Default order

1. Wide hero/result visual (Pro) or featured image card (Free fallback).
2. Overlapping profile photo/logo.
3. Name, specialty, and authority line.
4. Primary **Start a consultation** CTA.
5. Signature treatment card.
6. Before/after gallery.
7. Patient testimonials/reviews.
8. Treatment options.
9. Financing.
10. Dentist biography/credentials.
11. Location and contact.

### Design

- Pro hero supports crop, focal point, responsive art direction, descriptive alt text, and an explicit decorative option.
- Never place essential text inside the image.
- Before/after cases are one labelled comparison with a non-drag alternative.
- Contrast validation covers text over the hero and all CTA states.

### Onboarding questions

- What is the signature treatment?
- Do you have consented before/after cases and testimonials?
- Is the first step an in-person, virtual, or free consultation?

## Template 5 — Trust-First Family Practice

**Best for:** family dentistry, anxious-patient positioning, and practices where reassurance matters more than a large treatment list.  
**Inspired by:** [Toowoomba Dental](https://linktr.ee/toowoombadental), [Dra. Eliane Leite](https://linktr.ee/elianeleitedra), [Natural and Cosmetic Dentistry](https://linktr.ee/naturalandcosmeticdentistry).

### Default order

1. Warm practice/team image or logo.
2. Practice name and reassurance statement.
3. Booking CTA.
4. Review summary and two featured testimonials.
5. **Why choose us** points.
6. Dentist/team cards.
7. Featured family services.
8. Payment/insurance information.
9. Contact, location, and hours.
10. Patient resources.

### Design

- Favor readable editorial spacing and human photography over promotional density.
- Reviews are summarized; long testimonial carousels require pause/keyboard controls and should not block the CTA.
- Keep contact details visible near both booking and location sections.

### Onboarding questions

- What concern should the first sentence reassure?
- Which reviews may be featured?
- Do patients need payment, insurance, accessibility, or anxiety-care information before booking?

## Template 6 — Specialist Assessment

**Best for:** orthodontists, aligner providers, implant clinicians, and practices offering online assessment tools.  
**Inspired by:** [NK Orthodontist](https://linktr.ee/nkortho), [Austin Orthodontics](https://linktr.ee/austinortho), [Macarthur Orthodontics](https://linktr.ee/macarthurorthodontics), [Smiles on 35th](https://linktr.ee/smileson35thdrrubeccashahid).

### Default order

1. Specialist identity and credentials.
2. Eligibility/reassurance line, such as “No referral required.”
3. Primary **Start online assessment** or **Free consultation** CTA.
4. Secondary in-person booking CTA.
5. Signature treatments.
6. Assessment/smile-preview tool.
7. Results and reviews.
8. Emergency or aftercare information, if relevant.
9. Insurance/financing.
10. Specialist FAQs and guides.
11. Locations/contact.

### Design

- Assessment and booking are distinct actions with accurate outcome labels.
- Emergency information may move above routine booking when the owner explicitly enables an urgent-care state.
- Education reduces uncertainty but stays below the first conversion decision.

### Onboarding questions

- Is the preferred first step an assessment or appointment?
- Is a referral required?
- Are emergency, insurance, or treatment-eligibility instructions needed?

## Template 7 — Expert and Educator

**Best for:** dentists with press coverage, professional education, speaking, research, or a second audience of clinicians.  
**Inspired by:** [Dr. Bianca Frederick](https://linktr.ee/doctorb_ortho), [Dr. Jenni Rawes](https://linktr.ee/dr.jenni.dentist), [Dr. Moez Khakiani](https://linktr.ee/drmoezik), [Dr. Parijat](https://linktr.ee/docparijat).

### Default order

1. Professional portrait.
2. Name, credentials, and multi-role positioning.
3. Audience switch: **Patients** / **Professionals**.
4. Patient CTA and practice link.
5. Professional CTA: speaking, courses, or collaboration.
6. Credentials and affiliations.
7. Featured article/video/press.
8. Resource library.
9. Events/courses.
10. Newsletter/community.
11. Social row.

### Design

- Audience segmentation prevents patient booking from being buried under professional content.
- The default audience remains Patients unless the owner explicitly chooses otherwise.
- Press cards show source and date; they do not imply endorsements not present in the source.
- Pro may use a split editorial hero; Free uses the same semantic order in a single column.

### Onboarding questions

- Is the profile primarily for patients, professionals, or both?
- Which credential, article, or talk best establishes authority?
- What is the primary action for each audience?

## Template 8 — Clinic + Commerce

**Best for:** dentists selling products, books, courses, memberships, or affiliate collections alongside clinical care.  
**Inspired by:** [Dr. Nina Kumar](https://linktr.ee/ninakumardds), [Dr. Patrice Smith](https://linktr.ee/dr.unorthodoc), [Dr. Moez Khakiani](https://linktr.ee/drmoezik).

### Default order

1. Identity and positioning.
2. Patient booking CTA.
3. Practice/contact actions.
4. Audience or **Clinic / Shop** switch.
5. Featured product/resource.
6. Product/course categories.
7. Books, guides, or affiliate disclosure.
8. Reviews/proof.
9. Newsletter/community.
10. Social row.

### Design

- Patient conversion remains above commerce by default.
- Products and clinical treatments use visibly different card types and analytics entities.
- Affiliate status, currency, seller, and external checkout are explicit.
- DentalBio must not infer purchases from outbound product clicks.

### Onboarding questions

- Are you selling to patients, dental professionals, or both?
- Which clinical action must remain above the store?
- Which products are owned, affiliate, digital, or course content?

## Profile-to-template coverage

| Template                    | Closest profiles from the research                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Direct Booking              | Dr. Simran, Olive Tree, Dr. Ricaurte, Curative Dental                                    |
| Location or Provider Router | Dr. Raghdah, Broadwater, Dr. Maria Isabel, Dr. Edward Camacho, Buddy Davis               |
| Services Catalogue          | Urban Smile, Coastland, Smiles Only, Kclinic, Gateway Dental Arts                        |
| Cosmetic Transformation     | Dr. Daniel Sluyk, SmileArt Utah, Advanced Cosmetic Dentistry, Bristles Dentistry         |
| Trust-First Family Practice | Toowoomba Dental, Dra. Eliane, Natural and Cosmetic Dentistry                            |
| Specialist Assessment       | Austin Orthodontics, Macarthur Orthodontics, NK Orthodontist, Smiles on 35th, Mandhortho |
| Expert and Educator         | Dr. Bianca Frederick, Dr. Jenni Rawes, Dr. Parijat                                       |
| Clinic + Commerce           | Dr. Nina Kumar, Dr. Patrice Smith, Dr. Moez Khakiani                                     |

All 32 researched profiles have a clear closest template; owners may add optional modules without creating another template.

## Theme presets, separate from templates

The first release can pair every content template with a small curated theme set:

1. **Violet** — white/soft-neutral surfaces with a restrained violet accent.
2. **Terracotta** — warm neutral surfaces with terracotta actions and teal focus.
3. **Copper** — paper-toned surfaces, deep ink, mineral green, and copper accents.
4. **Deep Cyan** — cool neutral surfaces with precise deep-cyan actions.
5. **Premium Contrast** — dark or deep-accent hero with light content surface and enforced AA combinations.

Themes define tokens only: page/background, text, muted text, button, accent, card surface, border, type pair, radius, shadow, spacing density, and motion. Owners cannot independently select combinations that fail the controlled contrast matrix.

## Premium layout variants

Offer a small number of tested compositions instead of arbitrary layout controls:

- **Classic stack:** centered identity followed by a single content column; available to all plans.
- **Hero overlap:** wide hero with overlapping profile identity; Pro, only for templates where a hero adds value.
- **Editorial split:** identity/CTA beside a feature story on wide screens, collapsing to semantic single-column order; Pro.
- **Section navigator:** sticky or inline navigation for service/resource-heavy profiles; Pro when more than three sections are populated.

## Data and persistence model

Keep three independent concepts:

```text
template_id      -> module defaults, order, emphasis, labels
theme_id         -> controlled visual tokens
layout_variant   -> tested composition rules
```

User content remains the source of truth. Applying a template should:

1. Preview the proposed order and any newly enabled empty modules.
2. Never delete existing content.
3. Preserve stable entity IDs and analytics attribution.
4. Ask before hiding populated modules.
5. Save one explicit versioned appearance configuration through an authorized server boundary.

## Accessibility and analytics requirements

- One logical `main` landmark and heading hierarchy regardless of visual composition.
- Hero text and controls pass WCAG AA in every allowed theme; user colors are validated before publication.
- Hero, gallery, and before/after media support descriptive alt text or explicit decoration.
- Reduced motion, 200% zoom, keyboard navigation, and narrow mobile layouts remain usable.
- Primary and sticky CTAs emit the specific controlled action and generic `cta_click` through project-owned adapters.
- Template/module changes do not create arbitrary analytics names or include labels, destinations, contact details, or other free-form values.
- Visible list positions are calculated after template ordering, filtering, and hidden-item exclusion.
- Dashboard preview remains explicitly excluded from production owner-profile analytics.

## Suggested implementation sequence

1. Define the versioned template/theme/layout configuration contract and safe migration behavior.
2. Build Direct Booking and Services Catalogue as the two base information architectures.
3. Add Location Router and Specialist Assessment using existing location/treatment entities.
4. Add Trust-First and Cosmetic Transformation after gallery/review accessibility is ready.
5. Add Expert/Educator and Clinic + Commerce after audience grouping and product distinctions are explicit.
6. Release premium hero/editorial variants only after crop, focal point, alt text, contrast, responsive, preview-parity, entitlement, and server-validation coverage passes.
