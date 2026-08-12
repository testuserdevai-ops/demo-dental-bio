# Analytics story audit

Audit date: 2026-08-12. Board: DentalBio.

This inventory keeps the platform-owner, profile-owner, conversion-growth, and
lifecycle-message surfaces separate while sharing one controlled event source.
Completed slices are recorded independently in Trello; an active card keeps
only acceptance criteria that still need an authoritative source or product
surface.

| Card                                                  | Product surface                                    | Current evidence                                                                                                     | Remaining release scope                                                                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #24 Reliable profile views and clicks                 | Public ingestion and reporting data                | `d0ba52fd`, `311bb835`; immutable events, aggregates, owner/admin RPCs, consent and privacy gates                    | Operational monitoring, legacy-counter reconciliation, consented persistent identity, profile timezone and load targets                                      |
| #53 Free/Pro analytics dashboard                      | `/dashboard/analytics`                             | `44f90d00`, `4a8dad0a`, `1f7e5d62`; exact Overview/Content/Audience/Conversions models and 390/375 journeys          | Stable entity drill-downs/labels, Links entry points, timezone, deleted-content resolution, premium export/custom ranges and latency gates                   |
| #70 Attribution, UTM, goals, exports and integrations | Analytics conversions, Links editor and settings   | Controlled attribution vocabulary exists in the event contract                                                       | First-party goals, safe UTM builder, campaign aggregates and authorized CSV; GA4/advertising/webhooks remain disabled until separately approved              |
| #91 Platform acquisition-to-revenue funnel            | Admin-only analytics                               | Account, onboarding, publish, profile-view/action and subscription timestamps exist in separate authoritative stores | Cohort-safe stage model, filtered funnel, completion/traffic/adoption diagnostics; unsupported landing, billing-churn and LTV inputs must remain unavailable |
| #92 Owner admin overview                              | `/admin`                                           | `8e1fbb6c`, `d94e8893`, `5d21ddb5`; account/readiness/plan and filtered engagement core                              | Authenticated active users, provider billing, failures/reports/SLA, cohort/country filters and audit-backed exports                                          |
| #82 Lifecycle messaging foundation                    | Server policy, scheduler and operator audit        | Event ingestion, onboarding progress, publish timestamps and marketing unsubscribe exist                             | Authoritative activation projection, next-best action, preferences, idempotent queue, frequency/precedence, provider outcomes and operator audit             |
| #87 First-value milestones                            | Lifecycle email and analytics deep links           | Qualified profile views and controlled actions are available                                                         | One-time threshold claims, ordering/frequency, accurate copy, delivery and return attribution                                                                |
| #88 Weekly performance summary                        | Lifecycle email                                    | Exact totals, comparisons, content and audience aggregates are available                                             | Eligibility/preferences, timezone-safe weekly snapshot, one supported recommendation, duplicate prevention and rendering gates                               |
| #89 Visits with no contact action                     | Dashboard insight and lifecycle email              | Qualified views and counted contact-action totals are available                                                      | Rolling-window eligibility, pre-send recheck/cooldown, contact-action edit deep link and outcome measurement                                                 |
| #90 Published profile with zero traffic               | Dashboard insight, sharing hub and lifecycle email | Publish timestamp and qualified-view totals are available                                                            | Operational tracking check, share/QR hub, preference/frequency rules, cancellation on first visit and channel measurement                                    |

## Adjacent stories

The following are dependencies or follow-ons, not substitutes for the ten
analytics stories above:

- #63 native enquiry capture supplies a confirmed first-party submission event.
- #64 treatment/location booking mappings improve conversion specificity.
- #69 scheduled and campaign-specific links expand the UTM/campaign model.
- #71 CRM/email ownership consumes explicitly consented submissions.
- #72 commerce may later supply verified purchase/revenue outcomes.

No implementation may label a click as a confirmed booking or purchase. No
analytics surface may invent identity, geography, revenue, provider delivery or
incident data when its authoritative source is absent.
