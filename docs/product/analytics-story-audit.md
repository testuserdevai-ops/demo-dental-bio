# Analytics story audit

Audit date: 2026-08-12. Board: DentalBio.

This inventory keeps the platform-owner, profile-owner, conversion-growth, and
lifecycle-message surfaces separate while sharing one controlled event source.
Completed slices are recorded independently in Trello; an active card keeps
only acceptance criteria that still need an authoritative source or product
surface.

| Card                                                  | Product surface                                    | Current evidence                                                                                                       | Remaining release scope                                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| #24 Reliable profile views and clicks                 | Public ingestion and reporting data                | `d0ba52fd`, `311bb835`, `b0c819b0`; immutable events, aggregates, consent/privacy gates and operator health            | Legacy lifetime-counter reconciliation, consented persistent identity and explicit load targets                                                 |
| #53 Free/Pro analytics dashboard                      | `/dashboard/analytics`                             | `44f90d00`, `1f7e5d62`, `d5995fd2`; exact models, stable labelled drill-downs, owner timezone and 390/375 journeys     | Premium export/custom ranges and measured latency gates                                                                                         |
| #70 Attribution, UTM, goals, exports and integrations | Analytics conversions, Links editor and settings   | Controlled attribution vocabulary exists in the event contract                                                         | First-party goals, safe UTM builder, campaign aggregates and authorized CSV; GA4/advertising/webhooks remain disabled until separately approved |
| #91 Platform acquisition-to-revenue funnel            | `/admin/funnel`                                    | `ea851333`–`3f2d5994`; cohort-safe stages, filters, completion/traffic/adoption diagnostics and mobile journey         | Landing/signup-start, authoritative billing churn/revenue/LTV, retention, geography and export remain explicitly unavailable                    |
| #92 Owner admin overview                              | `/admin`                                           | `8e1fbb6c`, `d94e8893`, `5d21ddb5`; account/readiness/plan and filtered engagement core                                | Authenticated active users, provider billing, failures/reports/SLA, cohort/country filters and audit-backed exports                             |
| #82 Lifecycle messaging foundation                    | Server policy, scheduler and operator audit        | `c00faffb`–`27e064d8`; activation/next action, preferences, eligibility recheck, idempotent claims and outcomes        | Operator UI, CTA-return/result attribution and provider webhook reconciliation                                                                  |
| #87 First-value milestones                            | Lifecycle email and analytics deep links           | One-time 100-qualified-view claim, precedence, preference and delivery copy are implemented                            | Remaining first publish/view/click/10-view/QR thresholds and return attribution                                                                 |
| #88 Weekly performance summary                        | Lifecycle email                                    | Weekly eligibility, exact totals/comparison, preferences, duplicate prevention and 7-day analytics CTA are implemented | Best-content/source recommendation, owner-timezone week boundaries and multi-client rendering matrix                                            |
| #89 Visits with no contact action                     | Dashboard insight and lifecycle email              | `46f9ee85`, `81babc0a`; rolling aggregate, recheck/cooldown, honest insight and edit CTA                               | Post-edit sufficient-data reset and recommendation outcome attribution                                                                          |
| #90 Published profile with zero traffic               | Dashboard insight, sharing hub and lifecycle email | `08eb68fb`, `81babc0a`; share hub, preferences/precedence and first-view cancellation through live recheck             | Attributed high-resolution QR, editable share copy/manual clipboard fallback and channel-to-first-view measurement                              |

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
