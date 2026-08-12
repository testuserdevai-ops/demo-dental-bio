# Direct Booking, Location Router, and Services Catalogue product review

Review date: 2026-08-12  
Integrated baseline: `7ef0a1f`  
Review branch: `codex/review-booking-router-services`

## Review method

- Compared the current public profiles with the Linktree references recorded in
  the template stories and research notes.
- Used a newly created, empty Free owner account to select a theme and each of
  the three templates, then clicked through every visible question at 390px.
  The temporary account was removed after the review.
- Exercised the populated showcase profiles as a visitor at 390×844 and
  375×812, including router selection, booking, contact, and map-modal tasks.
- Measured the public canvas at 1280px and checked it against Basic's 661px
  maximum width.

Accessibility was treated as a secondary regression concern. The approval
criteria in this review are whether a new owner can create the required profile
data without leaving the walkthrough, and whether a mobile visitor can reach an
obvious action without working through a website-sized composition.

## Reference comparison

### Direct Booking

The current Linktree references remain extremely small:

- `simranbukalsaria`: identity, authored bio, social/contact icons, one booking
  action.
- `OliveTreeDental`: identity, authored positioning, one clinic action.
- `dralejandroricaurte`: identity, two booking actions, Instagram, and location.

The DentalBio renderer now follows that link-in-bio density: compact identity,
socials, booking and supporting actions in the first viewport, followed by
owner-authored treatment, location, and review data. It uses the same 661px
canvas as Basic and exposes `links`, `treatments`, `location`, and `review`
preview anchors.

### Location or Provider Router

The references use direct, concrete choices:

- `broadwaterdentalclinic`: new patient, named dentist, or hygienist booking.
- `dr.raghdah_alzuhairy`: booking/tool links, followed by three explicitly
  named clinic links and social/review actions.
- `Dr.maria.isabel.orthodontist`: online consultation, clinic consultation,
  then a branch/location action.

The baseline DentalBio showcase delayed its first booking action to about
1,411px on a 390px screen. A three-image gallery, two marketing headings,
duplicated location controls, and invented opening-time copy came first. The
reviewed renderer removes the non-contract gallery and unsupported hours,
keeps one native selector, places the selected location's booking action at
about 718px, moves extended owner-authored copy below the task, and uses the
661px Basic canvas. The `location` and `review` anchors now identify the actual
rendered modules.

The public data contract still only supplies locations plus practice-wide
booking/contact fields. It does not supply providers, appointment types, or
per-option booking/contact mappings. The renderer must not pretend a location
is a provider. Those modes remain an onboarding-contract blocker described
below.

### Services Catalogue

`smilesonly` is the clearest current reference: identity and socials, booking,
service links, testimonial/video proof, financing links, team, then socials.
The other recorded references use the same principle—section headings organize
links, but the page remains a profile rather than a clinic website.

The baseline DentalBio showcase used a 960px split hero and a 4,512px mobile
page. The reviewed renderer uses a compact centered identity card on the 661px
Basic canvas, a persistent mobile booking action, and whole-card featured-care
links. Mobile featured cards omit the repeated descriptions visually while
desktop can retain two lines. The populated 375px page is about 3,645px because
it deliberately contains services, finance media, team, FAQ, reviews, and a
location, but the primary task remains fixed and every featured item is an
obvious action. `treatments`, `services`, `links`, `review`, and `location`
preview anchors identify the rendered modules.

## New-owner question journey: current blockers

These are shared onboarding-engine defects. Route-private renderers cannot fix
them without creating a second data-authoring system.

### Shared engine requirements

1. Add form-backed question steps that reuse the dashboard schemas and server
   mutations. A question must be able to create or edit data, not merely select
   an ID that a new owner cannot have yet.
2. Give every question a visible **Skip** action. `Finish later` exits the whole
   journey and is not a substitute. Skipping must preserve prior answers and
   advance to the next step without creating placeholder content.
3. Keep **Back**, **Skip**, and **Continue** in the sticky mobile action bar.
   Continue validates only the current form. Successful creation refreshes the
   local option list and keeps the newly created stable ID selected.
4. Reuse these dashboard form contracts rather than inventing onboarding-only
   values:
   - profile title, bio, professional/contact/booking fields from the dashboard
     profile form;
   - social profile inputs from the dashboard social form;
   - treatment/service title, description, and kind from
     `app/dashboard/treatments/AddTreatment.tsx` and its schemas/actions;
   - repeatable business name, address, city, area, country, latitude, and
     longitude from `app/dashboard/location/_components/LocationForm.tsx`;
   - link title, URL, optional small-icon/large-image presentation, image text,
     and featured state from `app/dashboard/links/components/LinkForm.tsx`.
5. Questions that order or feature entities must come after creation. They can
   combine creation with a “Feature this” choice, then provide a compact reorder
   step when two or more entities exist.
6. The review screen must summarize owner-entered titles and controlled choices
   without inserting template-authored biography, service, location, provider,
   finance, or contact copy.

### Direct Booking required flow

The blank-owner journey currently allows **Book an appointment** even though no
booking URL exists, then reaches a required treatment selector whose only
action is **Open the existing builder**. It cannot complete onboarding in place.

Replace that journey with:

1. Optional profile title and bio form.
2. Primary action choice followed immediately by the matching input form
   (booking URL and enabled state, website, phone, email, or an owner-authored
   assessment link). Skip is allowed and yields no public action.
3. Optional supporting action plus matching input; never offer the already
   selected primary kind.
4. Repeatable treatment form for zero to three title/description entries, with
   created IDs selected in creation order.
5. Optional social-link form and optional repeatable location form.

The renderer already omits missing destinations and untitled treatments rather
than manufacturing public content.

### Location Router required flow

The blank-owner journey currently exposes **Clinician or provider** and
**Appointment type** even though neither has a source entity or mapping UI. A
user can select provider, immediately reach review, and see a contradictory
planned order of Location Selector, Selected Location, and Other Locations.
Selecting Location instead reaches the reported impossible question, **Which
location should open first?**, with no locations and only a link out of the
walkthrough.

Required correction:

1. Until supported entities exist, expose only the Location route. Do not
   relabel location rows as providers or appointment types.
2. Start with a repeatable inline location form using the existing autocomplete
   and location mutation. “Add another location” stays on the step; Skip allows
   a one-location or contact-only profile.
3. If two or more locations exist, let the owner reorder them and choose the
   initial location. One location becomes the default automatically; asking the
   owner to choose it adds no value.
4. Practice-wide booking/phone/email must be described honestly as shared. A
   future provider/appointment implementation requires real option entities and
   stable per-option booking, contact, treatment, and review mappings before
   those modes return.
5. Add optional profile introduction and social-link forms. Do not ask the
   owner to write template marketing headings.

### Services Catalogue required flow

The blank-owner journey currently blocks on a required selector for treatments
that do not exist. It has only two questions despite the story requiring
featured treatments, remaining-service categories, and finance/insurance
importance. The category question is absent, and the renderer's treatment vs.
service split is only the dashboard `kind` boolean—not an owner-defined
category model.

Required correction:

1. Add optional profile title/bio and booking/contact forms.
2. Provide a repeatable inline treatment/service form. Each creation asks for
   owner-authored title, description, kind, and whether it is one of up to three
   featured entries.
3. Do not claim to support service categories until an ordered category/group
   entity and assignment UI exist. Either add that shared content model or
   change the story/question language to the real Treatment and Service groups.
4. Replace the finance-order boolean as the first finance experience with an
   optional repeatable link form for owner-authored finance/insurance links.
   Ask ordering only after finance and team content both exist.
5. Offer the same link form for team and FAQ/resources, including the existing
   media presentation choices. Add optional socials and locations.

## Public-profile verification

| Template           |       390px |       375px | 1280px canvas | Visitor task                                                                                                                              |
| ------------------ | ----------: | ----------: | ------------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Direct Booking     | No overflow | No overflow |         661px | Booking and supporting action fully visible in the first viewport                                                                         |
| Location Router    | No overflow | No overflow |         661px | Selector and 72px booking action visible in the first viewport; selection updates label/action; map sheet is 390×717 with no inner scroll |
| Services Catalogue | No overflow | No overflow |         661px | 56px fixed booking action remains visible; featured care cards are 86–94px whole-card links on 375px                                      |

The route-private changes improve the visitor experience and preview targeting,
but these templates must not be marked product-complete until the shared
new-owner form journey above is implemented and a fresh blank account can
finish each flow without leaving onboarding.
