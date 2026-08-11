# Analytics foundation (Phase 4)

## Status and decision

This document is the Phase 4 architecture decision record and migration matrix
for public-profile analytics. It defines a controlled event contract only. It
does **not** add production event emission, alter public rendering, change
existing counters, create an enquiries feature, or claim completion of
`ZKWI5yb5` or `EJ9grO95`.

**ADR:** use a versioned, allow-listed action vocabulary at the public UI
boundary and validate it again on the server against authoritative ownership.
Events are append-only product telemetry, not a substitute for the existing
`links.click_counter` and `blogs.click_counter` fields.

The initial rollout is intentionally dry: every in-scope public surface now
describes its interaction, but no production transport or persistence is enabled by this
foundation. Existing routes and navigation remain the source of truth until a
subsequent, explicitly approved implementation enables emission.

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

`Action` is a strict discriminated union, allow-listed as: `link_click`,
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
visitor/session IDs must already be opaque, privacy-safe tokens and are not
created or persisted by this phase. Device class is a coarse enum only. The
foundation creates no cookies or fingerprint.

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

## Checked migration matrix

Implementation status: every in-scope row below is migrated to the controlled
adapter. Future-only treatment/service CTAs, directions, and enquiries have
typed descriptors but no new UI was invented. Brand acquisition actions and
pure close/dismiss controls remain intentionally excluded.

| Public surface and current file(s)                                                       | Current semantics and available identity                                                                                                                                                       | Existing metric/endpoint                                                                               | Future controlled event                                          | Migration notes / risks                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header CTA: `app/[username]/components/Header.tsx`                                       | Desktop sticky `Contact me` scrolls `#location` when locations exist, otherwise opens `mailto:`; mobile always scrolls `#location`. Profile identity is implicit (`username`, `dentistry_id`). | None                                                                                                   | `email_click` or `navigation_click` plus generic `cta_click`     | Mobile has no email fallback; do not claim an email conversion from a scroll.                                                                                                                                                  |
| Navbar and profile location chips: `Navbar.tsx`, `ProfileDetail.tsx`                     | Anchor navigation to links/blog/gallery/video/review/location; Shop toggles products. Location chip has `location_id` but targets nonexistent `#id-${location_id}`.                            | None                                                                                                   | `navigation_click`                                               | Use one-based visible position. Do not rely on duplicated/mismatched DOM IDs.                                                                                                                                                  |
| Grouped standard links: `Links.tsx`                                                      | Active links only; has `link_id`, title, URL, rank, group. Opens new window after POST.                                                                                                        | `links.click_counter`; `POST /api/links/click`, RPC `increment_click_counter`; 5/IP/link/60s in-memory | `link_click`, entity `link_id`                                   | Preserve counter and endpoint behavior. Existing limiter is instance-local; telemetry must not accidentally double count.                                                                                                      |
| Social and website: `SocialLinks.tsx`                                                    | Instagram/TikTok/X/Facebook and website appear under profile and footer; only dentistry identity is available.                                                                                 | None                                                                                                   | `social_click` with controlled platform                          | URLs must never enter telemetry. Website/external-link rel hardening is separate work.                                                                                                                                         |
| Treatments and services: `Treatments.tsx`, `Services.tsx`, `Collapse.tsx`                | Accordion expansion. `treatment_id` exists in parent query but is discarded before Collapse.                                                                                                   | None                                                                                                   | `treatment_expand` / `service_expand`, subject `treatment_id`    | Thread the ID deliberately; current repeated accordion DOM id is not an identity.                                                                                                                                              |
| Blog list and article: `BlogGroupList.tsx`, `BlogList.tsx`, `blog/[slug]/page.tsx`       | List has `blog.id`/slug; the click endpoint increments once and navigation stays native. The ownership-scoped article render has no counter side effect.                                       | `blogs.click_counter`; `POST /api/blogs/click`                                                         | `blog_click`, entity `blog_id`                                   | The endpoint is the single legacy increment boundary and rejects disabled, private, or mismatched entities.                                                                                                                    |
| Videos: `VideoGroupList.tsx`, `VideoList.tsx`, `Basic/VideoItem.tsx`                     | Title opens embedded iframe, close hides it. `video.id` is available before leaf but not passed down.                                                                                          | None                                                                                                   | `video_open`, subject `video_id`                                 | No outbound click occurs; this is engagement, not conversion.                                                                                                                                                                  |
| Before/after and general galleries: `Gallery.tsx`, `GalleryImage.tsx`                    | Thumbnail opens lightbox/backdrop closes. `gallery.id`/general-gallery ID exists before leaf but is discarded.                                                                                 | None                                                                                                   | `gallery_open`, relevant gallery subject                         | Gallery section uses duplicate `id="gallery"` when both kinds render.                                                                                                                                                          |
| Shop/products: `ProfileDetail.tsx`, `IndividualProductList.tsx`, `Basic/ProductItem.tsx` | Navbar Shop reveals products; product has `id`, opens external link.                                                                                                                           | None                                                                                                   | `navigation_click` to shop, `product_click`, entity `product_id` | Public query currently does not filter `enabled`; do not encode availability assumptions until corrected.                                                                                                                      |
| Reviews: `Reviews.tsx`, `ReviewItem.tsx`, `Basic/ReviewContent.tsx`                      | Heading can open newest external review page; More/Less expands copy. Review and external-page IDs are available upstream.                                                                     | None                                                                                                   | `external_review_click`; `review_expand` on open                 | Do not send review text/platform URL. External target must be ownership-validated.                                                                                                                                             |
| Location/map/contact: `WorkLocation.tsx`, `MapComponent.tsx`                             | `#location`; per-card `location_id`; booking (when enabled), `mailto:`, `tel:`, embedded Google map. Zero locations can still render CTAs.                                                     | None                                                                                                   | specific click plus generic `cta_click`                          | Never include phone, email, address, coordinates, booking URL, or map destination. Map pan/zoom is excluded.                                                                                                                   |
| Footer: `Footer.tsx`                                                                     | Uses server-supplied socials; `Contact me` opens email; brand/Digimax links and share menu retain native behavior.                                                                             | None                                                                                                   | `email_click`, `social_click` as applicable                      | Footer no longer performs a duplicate browser Supabase read.                                                                                                                                                                   |
| Share and trust-and-safety: `ShareModal.tsx`, `ReportProfileDialog.tsx`, `share.ts`      | Open/copy/LinkedIn/Facebook/WhatsApp/Messenger/email; the overflow menu also opens a confirmed abuse-report workflow.                                                                          | No share counter; reports use the isolated moderation endpoint and audit trail                         | `share_open`, `share_click`; reporting is explicitly excluded    | Do not emit copied URL or share body. Reporting is a platform trust-and-safety action, not owner conversion; its category, narrative, reporter contact, reference, and moderation state must never enter conversion analytics. |
| Missing-user and brand CTAs: `app/[username]/page.tsx`, Header/Footer/ShareModal         | Claim/home/logo/signup/learn-more brand actions.                                                                                                                                               | None                                                                                                   | Explicitly excluded from owner-profile conversion v1             | They are platform acquisition actions, not an owner's public-profile action.                                                                                                                                                   |
| Admin console: `app/admin` navigation, workspace cards, and controls                     | Authenticated operational navigation and administrative actions, capability-filtered and server-authorized.                                                                                    | None                                                                                                   | Explicitly excluded from owner-profile conversion v1             | These actions operate the platform and are not interactions with an owner's public profile.                                                                                                                                    |
| Dashboard Basic-template summary: `app/dashboard/_components/BasicTemplateSummary.tsx`   | Read-only compatibility/default label, representative preview, and native section-order disclosure.                                                                                            | None                                                                                                   | Explicitly excluded from owner-profile conversion v1             | This is an authenticated editor aid. The disclosure changes no owner content and introduces no public-profile conversion action.                                                                                                |
| Future enquiries                                                                         | No public enquiry/contact form, model, endpoint, or counter was found.                                                                                                                         | None                                                                                                   | Explicitly excluded pending product design                       | A future flow needs separate consent, validation, retention, abuse, and ownership ADR.                                                                                                                                         |

## Rollout and rollback

1. Keep current public behavior and both durable counters unchanged.
2. Add server validation and a disabled-by-default, versioned transport behind
   a rollout flag only after privacy/security review.
3. Enable one action family at a time, with preview/test context isolated from
   production metrics and duplicate-count checks for blogs.
4. Roll back by disabling the transport flag; this must leave navigation,
   public rendering, and current counter endpoints operational. Retain no
   client-side retry queue that could replay disabled events.

## Explicit exclusions

This foundation does not implement a tracking endpoint, database schema,
dashboard report, consent banner, identity/fingerprinting mechanism, enquiry
form, analytics vendor integration, counter migration, or
production emission. It makes no claim that `ZKWI5yb5` or `EJ9grO95` is
complete.

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
