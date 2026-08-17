# Final parity remediation Trello manifest

Date: 2026-08-18

Board: [DentalBio](https://trello.com/b/7yU4CEba/dentalbio)

Branch: `codex/public-profile-feature-parity`

Status: all seven cards are verified in `Done 🎉` against final source/evidence head `1a4621cb18912ce45dc5f1a013b9e1d7e2020265` and [pull request #136](https://github.com/digimaxhub/dentalbio/pull/136).

## Duplicate audit

The API returned 303 open cards before the write. Each proposed title had an exact open-card count of zero. The audit also inspected cards containing the relevant analytics, review, mutation, treatment/service, link, blog, gallery, and location-media terms.

Several adjacent historical stories exist, including `Make dashboard mutations and the published profile converge reliably`, `Saving another external review page replaces the first one`, the per-template collection-parity cards, `Build the Phase 4 public analytics interaction foundation`, and `Let profile owners manage an image for every saved location`. They were not reused because the seven entries below record newly verified, narrower remediation defects and their exact final-audit commits. The batch upsert then created seven cards and updated zero existing cards.

## Verified cards

Every row was read back through `verify-json` and the full board-card response. For each card:

- exact-title count is one;
- list ID `6a66455de5828451407487b7` resolves to `Done 🎉`;
- label ID `6a6674e0d0b76c2d9aa58110` resolves to `Priority: Medium`;
- label ID `6a66455de582845140748a47` resolves to `Bug`;
- the returned description exactly equals the manifest description;
- the description exactly matches the manifest and records the final branch, fixing commit, exact final source/evidence head, and pull-request URL.

| Defect cluster                                                                                            | Canonical card ID          | Fixing commit                      | Card                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public analytics remains disabled pending approval                                                        | `6a83676bdda0646cea4520a5` | `2f2f1925`                         | [Keep public-profile analytics disabled until rollout is approved](https://trello.com/c/lOQeAbqj/369-keep-public-profile-analytics-disabled-until-rollout-is-approved)                   |
| Review mutation/reload robustness, complete external review collections, and owner-managed public heading | `6a83676cdfb79c3b6e0b2656` | `2f2f1925`, `5fa2c24c`, `0161f7f0` | [Keep review changes and external review collections complete after reload](https://trello.com/c/tkl7Ao7B/370-keep-review-changes-and-external-review-collections-complete-after-reload) |
| Treatment/service preview refresh                                                                         | `6a83676e201598d1f24b37f2` | `6c99e033`                         | [Refresh the dashboard preview after treatment and service changes](https://trello.com/c/HnFFw4cj/371-refresh-the-dashboard-preview-after-treatment-and-service-changes)                 |
| Credential-free HTTP(S) link parity                                                                       | `6a83676fcc665a9ff778b0da` | `6c99e033`                         | [Keep safe HTTP links visible and reject credential-bearing links](https://trello.com/c/g3wEeVu8/372-keep-safe-http-links-visible-and-reject-credential-bearing-links)                   |
| Deterministic/null-safe/owner-authored blogs                                                              | `6a8367719bc2068b99c21e2c` | `6c99e033`                         | [Keep blog inventories deterministic, null-safe, and owner-authored](https://trello.com/c/oWG28EV8/373-keep-blog-inventories-deterministic-null-safe-and-owner-authored)                 |
| Unique Clinic comparison-media analytics positions                                                        | `6a836773c18a5ea28c68583b` | `210c698c`                         | [Give Clinic before-and-after gallery media unique analytics positions](https://trello.com/c/WHnbiXz2/374-give-clinic-before-and-after-gallery-media-unique-analytics-positions)         |
| Real owner-scoped Batch C location media                                                                  | `6a83677447ec47f1d638021f` | `210c698c`                         | [Use real owner-scoped location media in Batch C showcases](https://trello.com/c/ONCZdl2v/375-use-real-owner-scoped-location-media-in-batch-c-showcases)                                 |

## Machine-readable source

The exact upsert and verification input is `final-remediation-trello.json` in this directory. It contains seven entries, each with `priority: medium` and `bug: true`.

## Finalization completed

The same seven cards were updated in place; no replacement cards were created. Deterministic `verify-json` readback against `Done 🎉` returned 7 expected and 7 matched, with no missing titles, duplicates, description mismatches, priority mismatches, or Bug mismatches.
