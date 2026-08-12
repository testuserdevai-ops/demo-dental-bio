# Analytics foundation (Phase 4)

## Status and decision

This document began as the Phase 4 architecture decision record and now also
records the reviewed first-party ingestion and reporting boundary. Production
public contexts emit to the same-origin endpoint. Existing counters remain
separate, and this work does not create an enquiries feature.

**ADR:** use a versioned, allow-listed action vocabulary at the public UI
boundary and validate it again on the server against authoritative ownership.
Events are append-only product telemetry, not a substitute for the existing
`links.click_counter` and `blogs.click_counter` fields.

Every in-scope public surface describes its interaction through the controlled
contract. The server revalidates it, verifies entity ownership, and stores only
controlled scalar dimensions. Navigation never waits for analytics.

## V1 event contract

Every future event must be a JSON object with this controlled shape:

```ts
type PublicProfileAnalyticsEventV1 = {
  schemaVersion: 1;
  eventId: UUID;
  eventType: "public_action";
  occurredAt: ISODateTime;
  profileId: UUID; // immutable public.users.id
  section: Section;
  position?: PositiveInteger; // one-based visible position
  renderContext: RenderContext;
  consent: Consent;
  attribution?: SanitizedAttribution;
  client?: PrivacySafeClientContext;
  action: Action;
};
```

`Action` is a strict discriminated union, allow-listed as: `profile_view`, `link_click`,
`blog_click`, `video_open`, `gallery_open`, `product_click`,
`external_review_click`, `review_expand`, `treatment_expand`,
`treatment_cta_click`,
`service_expand`, `service_cta_click`, `cta_click`, `booking_click`,
`directions_click`, `email_click`, `phone_click`, `social_click`, `share_open`,
`share_click`, `navigation_click`, `enquiry_start`, and `enquiry_submit`.
Relevant variants carry only their controlled subtype and stable entity IDs
(UUIDs or positive integer primary keys, matching the existing schema).
Primary CTAs may describe both their specific action and a generic `cta_click`;
each resulting event receives its own idempotency UUID.

`Section` is allow-listed: `header`, `profile`, `links`, `treatments`,
`services`, `blogs`, `videos`, `gallery`, `reviews`, `shop`, `locations`,
`footer`, `share`, and `navigation`.

`RenderContext` is discriminated as public, authenticated-owner preview, or a
signed test context. `Consent` is allow-listed as `unknown`, `granted`,
`denied`, and `not_required`; the eventual transport must apply the product's
consent policy and must not emit when policy requires consent that has not been
granted.

Attribution accepts only a sanitized referrer domain and allow-listed,
length-bounded campaign tokens; it never accepts a URL. Optional anonymous
visitor/session IDs must already be opaque, privacy-safe tokens and are accepted
only with explicit `granted` consent. Device class is a coarse enum only.
DentalBio creates no analytics cookie or fingerprint.

`profile_view` is the sole view metric. It emits at most once per public profile
per browser session using an identifier-free `sessionStorage` marker. Preview,
admin-preview, signed-test, bots, DNT, and Global Privacy Control traffic never
enters production storage.

## First-party consent and identity policy

The default public-profile measurement is privacy-minimized first-party
aggregate telemetry under the controlled `not_required` product policy. It
stores no visitor ID, session ID, request/IP-derived identifier, raw IP, or raw
user agent. The server accepts only controlled action fields and uses a
profile-wide abuse ceiling for this identifier-free path. Unique visitor,
clicker, and converter values are returned as `null` (unavailable), never as a
misleading zero.

If a future authoritative consent mechanism supplies `granted`, the browser may
send only opaque bounded visitor/session tokens. The server HMACs them before
storage and never stores their raw values. `unknown` and `denied` do not emit.
Changing the default consent or introducing an ID requires a separate privacy
review.

## Storage, aggregation, and access

`public_analytics_events` is append-only and contains controlled scalar columns,
not a free-form payload. Client event UUID is the idempotency key. Postgres
revalidates active entity ownership, enforces timestamp/payload/rate bounds, and
updates daily aggregates in the same transaction. Raw events expire after 400
days and daily aggregates after 760 days; account deletion cascades both stores.
Scheduled cleanup is installed when `pg_cron` is available.

The HTTP boundary accepts either one event or a strictly bounded batch of 1–25
events under the same 16 KiB request limit. Batch items are validated and
reported independently; one invalid, excluded, duplicate, limited, or rejected
item cannot be mislabeled as an accepted sibling. The current browser transport
still sends immediately so navigation never waits and retains no retry queue.

Owner RPCs authorize the authenticated profile owner or a database-authorized
admin. Free owners are limited to seven days, views/outbound totals, and
non-conversion content performance. Pro and Premium Pro may query up to the
retained 730-day reporting window and see controlled conversion metrics. Exact
range-distinct totals come from a separate totals RPC and are never calculated
by summing daily unique counts. Admin overview uses one global aggregate RPC
with controlled plan and registered-domain filters, avoiding profile N+1 reads.

Audience reporting is a separate Pro/Premium-only RPC. It uses only normalized
profile-view attribution source, sanitized referrer domain, and coarse device
class. Buckets with fewer than five views never reveal their dimension value;
only a combined `other` bucket is returned when the suppressed total itself
meets five. Unique audience counts follow the consent availability rules above.
Geography is explicitly unavailable (`not_collected`): DentalBio does not infer
or retain location from IP addresses, and the dashboard must not fabricate it.

Counted outbound actions deliberately exclude generic `cta_click`. A primary CTA
may emit both a specific event and generic `cta_click`; counting only the
specific action prevents double-counting.

## Privacy and integrity boundaries

Never place any of the following in the event payload, URL, client logs, or
analytics dimensions: clinical or enquiry values, arbitrary DOM text, titles,
email address, telephone number, postal address, latitude/longitude, destination
URL/usernames/query strings, full IP address, auth ID, secrets, raw user agent,
raw referral URL, share text, or clipboard content. Do not infer consent from a
browser state that the product has not explicitly defined.

The browser may propose only controlled enum values and stable entity IDs. The
downstream server must resolve the immutable `profileId` and verify that every
supplied entity belongs to that profile before accepting an event:

- link through `dentistry_links`/`link_groups` for that dentistry;
- blog, product, gallery, general gallery, video/group, review, and external
  review page through the resolved owner;
- treatment through the dentistry treatment join;
- location through the dentistry location join.

Reject unknown enums, mismatched/absent ownership, unavailable/disabled
content, invalid render context, and events that violate consent. Never trust
client-supplied ownership, plan status, or target URLs.

Preview context requires an authenticated owner/admin session and a
server-verified relationship to the profile being previewed. An iframe,
`Referer`/`Origin`, path shape, query parameter, or browser-only flag alone is
not sufficient proof. Until that verification is implemented, preview must not
emit production telemetry (or must be explicitly labelled and isolated as test
telemetry). Dashboard-editor controls are excluded from public conversion
telemetry.

The authenticated appearance onboarding controls at
`/onboarding/appearance` are also excluded from owner-profile conversion
analytics. Theme and template radio selection, the mobile sticky advance
action, template-switch impact and confirmation controls, progress navigation,
retry, resume, and private-draft save actions are product setup controls rather
than public-profile conversions.
This flow does not add an analytics adapter or enable production emission. Any
future onboarding-funnel measurement requires a separately reviewed controlled
contract and must never include free-form answers, profile content, contact
details, destinations, or clinical values.

The authenticated template-question controls at `/onboarding/questions` use the
same exclusion. Embedded dashboard forms, Skip/Continue actions, persisted
completion progress, autosave state, validation, conflict recovery, progress
navigation, and private-draft review are setup/editor interactions, not
public-profile conversions. The dashboard setup widget and its resume/change
template links share this exclusion. No form value, option label, entity title,
template prompt, contact detail, destination, or clinical content is emitted. A
future funnel event needs a separate controlled question/step identifier and
outcome-only privacy review before instrumentation.

## Checked migration matrix

Implementation status: every in-scope row below is migrated to the controlled
adapter. Future-only treatment/service CTAs, directions, and enquiries have
typed descriptors but no new UI was invented. Brand acquisition actions and
pure close/dismiss controls remain intentionally excluded.

| Public surface and current file(s)                                                       | Current semantics and available identity                                                                                                                                                                  | Existing metric/endpoint                                                                               | Future controlled event                                                                           | Migration notes / risks                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header CTA: `app/[username]/components/Header.tsx`                                       | Desktop sticky `Contact me` scrolls `#location` when locations exist, otherwise opens `mailto:`; mobile always scrolls `#location`. Profile identity is implicit (`username`, `dentistry_id`).            | None                                                                                                   | `email_click` or `navigation_click` plus generic `cta_click`                                      | Mobile has no email fallback; do not claim an email conversion from a scroll.                                                                                                   |
| Navbar and profile location chips: `Navbar.tsx`, `ProfileDetail.tsx`                     | Anchor navigation to links/blog/gallery/video/review/location; Shop toggles products. Location chip has `location_id` but targets nonexistent `#id-${location_id}`.                                       | None                                                                                                   | `navigation_click`                                                                                | Use one-based visible position. Do not rely on duplicated/mismatched DOM IDs.                                                                                                   |
| Grouped standard links: `Links.tsx`, `PublicProfileLinkCard.tsx`                         | Active links only; has `link_id`, rank, group, and controlled text/icon/large-image presentation. Opens a native anchor in a new window after the legacy POST.                                            | `links.click_counter`; `POST /api/links/click`, RPC `increment_click_counter`; 5/IP/link/60s in-memory | `link_click`, entity `link_id`                                                                    | Image variant, failed-image fallback, alt text, featured state, title, URL, and media URL never enter analytics. Preserve the immutable link ID and one-based visible position. |
| Social and website: `SocialLinks.tsx`                                                    | Instagram/TikTok/X/Facebook and website appear under profile and footer; only dentistry identity is available.                                                                                            | None                                                                                                   | `social_click` with controlled platform                                                           | URLs must never enter telemetry. Website/external-link rel hardening is separate work.                                                                                          |
| Treatments and services: `Treatments.tsx`, `Services.tsx`, `Collapse.tsx`                | Accordion expansion. `treatment_id` exists in parent query but is discarded before Collapse.                                                                                                              | None                                                                                                   | `treatment_expand` / `service_expand`, subject `treatment_id`                                     | Thread the ID deliberately; current repeated accordion DOM id is not an identity.                                                                                               |
| Blog list and article: `BlogGroupList.tsx`, `BlogList.tsx`, `blog/[slug]/page.tsx`       | List has `blog.id`/slug; the click endpoint increments once and navigation stays native. The ownership-scoped article render has no counter side effect.                                                  | `blogs.click_counter`; `POST /api/blogs/click`                                                         | `blog_click`, entity `blog_id`                                                                    | The endpoint is the single legacy increment boundary and rejects disabled, private, or mismatched entities.                                                                     |
| Videos: `VideoGroupList.tsx`, `VideoList.tsx`, `Basic/VideoItem.tsx`                     | Title opens embedded iframe, close hides it. `video.id` is available before leaf but not passed down.                                                                                                     | None                                                                                                   | `video_open`, subject `video_id`                                                                  | No outbound click occurs; this is engagement, not conversion.                                                                                                                   |
| Before/after and general galleries: `Gallery.tsx`, `GalleryImage.tsx`                    | Thumbnail opens lightbox/backdrop closes. `gallery.id`/general-gallery ID exists before leaf but is discarded.                                                                                            | None                                                                                                   | `gallery_open`, relevant gallery subject                                                          | Gallery section uses duplicate `id="gallery"` when both kinds render.                                                                                                           |
| Shop/products: `ProfileDetail.tsx`, `IndividualProductList.tsx`, `Basic/ProductItem.tsx` | Navbar Shop reveals products; product has `id`, opens external link.                                                                                                                                      | None                                                                                                   | `navigation_click` to shop, `product_click`, entity `product_id`                                  | Public query currently does not filter `enabled`; do not encode availability assumptions until corrected.                                                                       |
| Reviews: `Reviews.tsx`, `ReviewItem.tsx`, `Basic/ReviewContent.tsx`                      | Heading can open newest external review page; More/Less expands copy. Review and external-page IDs are available upstream.                                                                                | None                                                                                                   | `external_review_click`; `review_expand` on open                                                  | Do not send review text/platform URL. External target must be ownership-validated.                                                                                              |
| Location/map/contact: `WorkLocation.tsx`, `LocationMapModal.tsx`, `MapComponent.tsx`     | `#location`; per-card `location_id`; an explicit map-modal opener, external directions, booking (when enabled), `mailto:`, and `tel:`. The map provider is lazy and zero locations can still render CTAs. | None                                                                                                   | `map_open`, `directions_click`, contact-specific action, and generic `cta_click` where applicable | Never include phone, email, address, coordinates, booking URL, or map destination. Map pan/zoom and pure close/dismiss actions are intentionally excluded.                      |
| Location router: `LocationRouterExperience.tsx`                                          | A labelled native select and other-location buttons switch one stable `location_id`; downstream map, booking, phone, and email actions retain that location and visible position.                         | None                                                                                                   | `location_select`, then existing location action descriptors                                      | Never send the routing answer, option label, address, coordinates, phone, email, or destination. Selection remains usable when tracking fails.                                  |
| Footer: `Footer.tsx`                                                                     | Uses server-supplied socials; `Contact me` opens email; brand/Digimax links and share menu retain native behavior.                                                                                        | None                                                                                                   | `email_click`, `social_click` as applicable                                                       | Footer no longer performs a duplicate browser Supabase read.                                                                                                                    |
| Share: `ShareModal.tsx`, `share.ts`                                                      | Open/copy/LinkedIn/Facebook/WhatsApp/Messenger/email. `share.ts` has unused gtag helper and safe builders.                                                                                                | No durable endpoint/counter; unused client gtag helper                                                 | `share_open`, `share_click` with controlled channel                                               | Do not emit copied URL or share body. Current modal does not use helper and constructs URLs manually. Report row is not actionable.                                             |
| Missing-user and brand CTAs: `app/[username]/page.tsx`, Header/Footer/ShareModal         | Claim/home/logo/signup/learn-more brand actions.                                                                                                                                                          | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | They are platform acquisition actions, not an owner's public-profile action.                                                                                                    |
| Dashboard profile setup widget: `app/dashboard/_components/ProfileSetupWidget.tsx`       | Shows the authoritative selected template, persisted step completion, resume/review setup, and change-template navigation.                                                                                | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | This is an authenticated editor aid. Future setup-funnel analytics require a separate outcome-only contract and must not contain owner content.                                 |
| Profile theme selection and preview: `ProfileThemeChoice.tsx`                            | Native dashboard/onboarding radio controls choose one controlled theme ID and preview source-controlled tokens.                                                                                           | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | This is an editor control, not a visitor conversion. Never emit token values or profile content.                                                                                |
| Dashboard link image/layout/featured controls: `app/dashboard/links/**`                  | Authenticated owner/editor controls upload or remove owned media, select one controlled layout, set alt/decorative policy, and mark at most three links featured.                                         | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | These are editor controls. Published anchors remain tracked through `link_click`; dashboard preview and upload paths emit no owner-profile conversion event.                    |
| Template onboarding questions: `app/onboarding/questions/**`                             | Authenticated embedded dashboard forms create owner content; every step can be skipped; completion progress is stored separately from the private presentation draft.                                     | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | Setup/editor interaction only. Never emit form values, entity titles, contact details, destinations, clinical values, or progress tied to an auth identity.                     |
| Clinic and Commerce audience jumps: `ClinicCommerceProfileTemplate.tsx`                  | Native in-page clinic/shop anchors only reorder attention; booking, product, link, and social destinations remain tracked independently.                                                                  | None                                                                                                   | Explicitly excluded from owner-profile conversion v1                                              | Pure section navigation does not represent conversion intent. Never emit audience answers, product names, or destination URLs.                                                  |
| Future enquiries                                                                         | No public enquiry/contact form, model, endpoint, or counter was found.                                                                                                                                    | None                                                                                                   | Explicitly excluded pending product design                                                        | A future flow needs separate consent, validation, retention, abuse, and ownership ADR.                                                                                          |

## Rollout and rollback

1. Keep current public behavior and both durable counters unchanged.
2. Keep preview/test/admin contexts isolated from production metrics.
3. Roll back by selecting the disabled transport; this must leave navigation,
   public rendering, and current counter endpoints operational. Retain no
   client-side retry queue that could replay disabled events.

## Explicit exclusions

This foundation does not implement an enquiry form, analytics vendor
integration, fingerprint, cross-site identity, or legacy-counter migration.
Dashboard analytics filters, tabs, drill-down, export, upgrade, and navigation
controls are authenticated dashboard/editor controls and are excluded from
public owner-profile conversion analytics.

## Phase 7 render-context and counter correction

Public, authenticated profile-owner preview, authenticated admin preview,
signed test, and excluded/unverified states are now distinct controlled render
contexts. A requested preview or test without server-verifiable proof fails
closed and cannot emit analytics or mutate legacy counters. Provider absence is
an explicit error; it never silently becomes public traffic. Verification
proof remains server-side and is not stored in an event.

Tracked native actions are recorded only after a consumer handler has not
cancelled the activation. Modified clicks and native navigation remain
independent of the disabled transport. Future transport results use `queued`
for a successful beacon handoff and `dispatched` for fetch/memory handoff; they
do not claim server acceptance. Attribution placeholders accept only the
controlled UTM vocabulary and still do not enable production emission.

Blog article rendering no longer increments `blogs.click_counter`. The link
and blog click POST routes are the single legacy increment boundary and first
validate that the target is enabled, public, and owned by the resolved public
profile. Calls from the public UI remain fire-and-forget so counter failure
cannot delay or cancel navigation. Owner/admin/test/unverified preview links
preserve their non-public context when navigating from a blog list to an
article.
