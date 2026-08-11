# Product review: Cosmetic, Trust-First, and Specialist templates

Reviewed on 2026-08-12 as a first-time profile owner and as a public visitor at
390 px and 375 px. The review compares the seeded DentalBio routes with the
linked reference profiles and prioritizes a short, clickable dental-bio journey
over a website-style landing page.

## Reference lessons

| Template                    | Reference profiles                                                                                                                                                                                                                     | Useful pattern to retain                                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Cosmetic Transformation     | [Dr Daniel Sluyk](https://linktr.ee/drdanielsluyk), [SmileArt Utah](https://linktr.ee/smileartutah), [Advanced Cosmetic Dentistry](https://linktr.ee/dr.sehmi), [Bristles Dentistry](https://linktr.ee/bristlesdentistry)              | Identity and owner-written positioning lead directly to a consultation link; visual proof and short owner-named links follow.     |
| Trust-First Family Practice | [Toowoomba Dental](https://linktr.ee/toowoombadental), [Dra Eliane Leite](https://linktr.ee/elianeleitedra), [Natural and Cosmetic Dentistry](https://linktr.ee/naturalandcosmeticdentistry)                                           | Owner-written reassurance, social links, reviews, contact/payment resources, and a small number of obvious destinations.          |
| Specialist Assessment       | [NK Orthodontist](https://linktr.ee/nkortho), [Austin Orthodontics](https://linktr.ee/austinortho), [Macarthur Orthodontics](https://linktr.ee/macarthurorthodontics), [Smiles on 35th](https://linktr.ee/smileson35thdrrubeccashahid) | Distinct assessment and in-person booking links appear immediately after identity; supporting reviews and guides stay below them. |

The reference pages are link-first. They do not invent practice claims or long
process explanations. DentalBio may present the same content more clearly, but
the owner remains the author of public titles and body copy.

## Public-template decisions

- Match Basic's `661px` maximum width at every breakpoint.
- Keep the profile identity and the first real action in the first mobile
  viewport whenever the owner's content length permits it.
- Reuse only owner content for positioning, biographies, reviews, treatment
  names/descriptions, result labels, resource titles, and destinations.
- Treat template-authored text as short interface labels only. Do not emit
  claims such as a generated care promise, referral process, or payment policy.
- Give every supported dashboard area a stable preview target:
  `profile`, `treatments`, `gallery`, `review`, `links`, and `location`.
- Keep social and website destinations centered and at least 44 by 44 px.
- Prefer a short stack of real links/buttons over decorative multi-column
  website sections.

### Cosmetic Transformation

Keep the visual result, owner-written identity and bio, consultation action,
signature treatment, before/after proof, reviews, owner links, and map. Remove
the second generated biography headline and keep the biography with the
identity so the profile does not repeat or reinterpret owner copy.

### Trust-First Family Practice

Keep the owner-written reassurance, social row, booking/call actions, selected
reviews, dentist identity, concise owner-authored treatments, location, and
resource links. Do not generate `Why families choose us` claims or canned
payment/accessibility/anxiety descriptions from checkbox answers.

### Specialist Assessment

Keep identity, owner-written introduction, separate assessment and appointment
actions, a neutral referral status, concise treatment names, reviews, urgent
and preparation links, location, and contact actions. Remove the generated
three-step assessment process, generated referral instructions, and decorative
consultation section; these made the profile read like a marketing website and
could contradict the practice's real process.

## Shared onboarding requirements

The current question UI cannot be approved for a new account. Entity questions
only list records that already exist and send an empty owner out to a dashboard
builder. Required questions then block progress. Replace that behavior with the
following shared contract:

1. Every question has a visible **Skip for now** action. Skipping persists the
   omitted answer, clears stale validation for that step, and advances without
   publishing invented fallback content.
2. Entity questions embed the existing dashboard create/edit form in the
   onboarding surface, preferably as an inline card or mobile bottom sheet.
   Saving returns to the same step and automatically selects the new entity.
3. The forms use the same validation, upload, authorization, loading, retry,
   and analytics-exclusion behavior as their dashboard counterparts. They must
   not introduce a second content model.
4. A step may ask about ordering or presentation only after it lets an empty
   owner create the underlying content.
5. Profile copy always comes from text inputs. Controlled booleans and choices
   may change order or neutral status labels, but cannot generate clinical,
   eligibility, payment, accessibility, or reassurance claims.

### Forms needed by these templates

| Template    | In-flow forms                                                                                                                                                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cosmetic    | Profile headline and bio; treatment title/description; consultation button title and destination; repeatable before/after case title, labels, images and existing publication checks; review; links/socials; optional location.                                                   |
| Trust-First | Profile reassurance headline and body; booking destination; review; treatment; repeatable location; payment/accessibility/anxiety resource title and body or destination; patient links; socials.                                                                                 |
| Specialist  | Profile headline and body; assessment button title and destination; separate appointment destination; referral status plus optional owner-written eligibility title/body; optional urgent resource title/body/destination; treatment; review; repeatable location; links/socials. |

The shared dashboard preview map must also add `/dashboard/profile` (and shop
for templates that use products). Editing or saving any mapped dashboard form
must scroll the iframe to the matching stable target after refresh.

## Approval gate

Renderer-level visitor checks can pass independently. Template acceptance must
remain open until a brand-new account can complete or skip every step entirely
inside onboarding, publish, revisit the dashboard editors, and observe preview
focus on both 390 px and 375 px widths.
