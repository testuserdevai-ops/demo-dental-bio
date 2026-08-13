# Admin platform funnel

## Purpose and boundary

`/admin/funnel` is platform-owner reporting, not the Free/Pro profile-owner
analytics workspace. The page is protected by the existing `console:admin`
capability and its data comes from one `get_admin_platform_funnel` RPC. The RPC
rechecks the authenticated database identity against an unblocked
`public.users.role = 'admin'` row. Ordinary owners and anonymous sessions cannot
read cross-account aggregates.

The cohort is selected by `public.users.created_at` in an inclusive UTC date
range. Plan and registered domain are current attributes because the database
does not retain authoritative historical snapshots for either. Referral cohort
classification is available only when `registration_completions` contains a
row: `referred` requires a `referrer_user_id`, while `organic` requires a ledger
row without one. Accounts outside ledger coverage are included only by `all`.
With no URL filters, the page defaults to the full DentalBio history beginning
`2000-01-01`, all plans, all registered domains, and all referral cohorts. An
administrator can still submit an explicit valid UTC date range.

## Stable stage definitions

The visible funnel is cumulative. A user can enter a later stage only after
meeting every earlier stage, so adjacent conversion rates cannot exceed 100%.

| Stage                 | Authoritative source                              | Definition                                                                                        | Elapsed time                                                                                        |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Registered            | `public.users.created_at`                         | Owner account created inside the selected UTC cohort                                              | Cohort entry; no prior stage                                                                        |
| Email verified        | `auth.users.email_confirmed_at` or `confirmed_at` | Confirmation timestamp exists                                                                     | Registration to verification median                                                                 |
| Onboarding complete   | `profile_onboarding_progress`                     | Every current question ID required by the row's selected template appears in `completed_step_ids` | Unavailable: `updated_at` is mutable and is not immutable first completion                          |
| Profile published     | `users.profile_presentation_published_at`         | Explicit appearance publication exists after prior stages                                         | Registration-to-publish median, labelled as such rather than falsely claiming adjacent elapsed time |
| First qualified view  | `public_analytics_events`                         | First accepted `profile_view` at or after publication                                             | Publication to first view median                                                                    |
| First outbound action | `public_analytics_events`                         | First counted outbound action at or after the first qualified view                                | First view to first action median                                                                   |

Counted outbound actions use the same controlled list as the admin analytics
overview: link, blog, video, gallery, product, external review, treatment/service
CTA, booking, directions, email, phone, social, share, and enquiry submission.
Generic `cta_click` remains excluded to avoid double-counting a specific CTA
event emitted alongside it.

Public events have UUID idempotency, authoritative entity ownership checks,
bounded timestamps, controlled dimensions, and append-only storage. The HTTP
boundary excludes preview/test traffic, recognizable bots and crawlers, missing
user agents, DNT, and Global Privacy Control before storage. Accepted late
events may arrive within the ingestion window; stages use `occurred_at`, while
traffic coverage starts at the earliest `received_at`. All stage and cohort
dates are UTC.

## Diagnostics

- Completion distribution compares current completed IDs with the exact current
  step set for each of the nine templates. Skip is a valid walkthrough outcome,
  so a skipped step counts as completed progress.
- Zero traffic includes only published profiles whose publication is at or after
  the earliest accepted analytics event. If no coverage timestamp exists, the
  value is unavailable rather than zero.
- Viewed with no action requires a qualified post-publication view and no later
  counted outbound action.
- Module adoption is current-state existence of owner-authored profile details,
  social links, treatments/services, locations, active links, reviews, gallery,
  videos, and products. It does not infer quality or completion.
- Registration ledger coverage is shown explicitly because older accounts may
  predate the ledger.

## Explicitly unavailable scope

The UI presents these as unavailable explanations, not zeros:

- landing visits and signup starts: no reviewed controlled events;
- first onboarding-completion elapsed time and step abandonment: no immutable
  step-entry/exit/completion event stream;
- trial start and first paid conversion: current entitlement and Stripe setup
  completion do not prove payment or distinguish a trial;
- retention, churn, and lifetime value: no authoritative historical billing and
  authenticated activity cohort source;
- product-funnel device and privacy-safe geography filters: no approved account
  stage dimensions;
- CSV/warehouse export: no audited analyst export boundary;
- historical backfill: pre-ingestion traffic is never inferred from legacy
  counters or current state.

No landing, revenue, billing, device, geography, or historical values may be
fabricated to make the funnel look complete. Adding one requires a separately
reviewed source, identity/deduplication policy, retention policy, authorization
test, and reconciliation fixture.

## Analytics exclusion

Admin navigation, filters, and investigation controls are authenticated
operations controls and are excluded from owner-profile conversion analytics.
The funnel reads accepted public-profile events; it emits no additional public
actions and never includes profile text, answer values, URLs, email, phone,
clinical data, IP addresses, or authentication identifiers in its result.
