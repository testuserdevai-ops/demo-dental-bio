# Final-audit Trello coverage reconciliation

Date: 2026-08-17

Board: [DentalBio](https://trello.com/b/7yU4CEba/dentalbio)

Branch: `codex/public-profile-parity-final-audit`

Audited range: `da43affc..6f13b42c`

Status: four new Bug cards and one existing remediation Bug card are open in `Backlog`. No audited card was moved to `Done 🎉`; final branch verification and the final pull request are still pending.

## Result

The current board contained 315 open cards after the write. Exact-title and adjacent-term inspection found that the seven existing final-remediation cards already cover the product defects in analytics, review mutation/collections, treatment/service preview refresh, safe links, blog ordering/safety, Clinic gallery analytics positions, and Batch C location media.

The owner-managed external-review heading belongs to the existing review collection defect rather than a duplicate card. That card was updated in place. Four materially distinct test/evidence defects had no exact card and received one card each.

| Coverage decision                                                                                                                                          | Canonical card ID          | Priority | Commits                                                                                       | Card                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Updated existing review lifecycle/collection card to include the owner-managed visible title, projection boundary, generated types, and all-nine rendering | `6a83676cdfb79c3b6e0b2656` | Medium   | `2f2f1925`, `5fa2c24c`, `0161f7f0`; boundary/type evidence `6d3f35af`, `9440b805`, `6f13b42c` | [Keep review changes and external review collections complete after reload](https://trello.com/c/tkl7Ao7B/370-keep-review-changes-and-external-review-collections-complete-after-reload) |
| Created one aggregate-seed-verifier bug                                                                                                                    | `6a8372db618038984337def9` | Medium   | `e07ea8d8`                                                                                    | [Keep aggregate template seed verification aligned with parity data](https://trello.com/c/stQeJ7OJ/377-keep-aggregate-template-seed-verification-aligned-with-parity-data)               |
| Created one full pgTAP portability/isolation bug, including scheduler-independent link concurrency                                                         | `6a8372ddc293afd951f89936` | Medium   | `1141bdcc`, `dc5caaa7`                                                                        | [Keep database contract tests isolated and scheduler-independent](https://trello.com/c/pfA4qmlg/378-keep-database-contract-tests-isolated-and-scheduler-independent)                     |
| Created one stale static-contract bug for shared-component reuse                                                                                           | `6a8372def8517a90f2634931` | Low      | `2ce8f3c7`                                                                                    | [Keep shared-template contract tests aligned with component reuse](https://trello.com/c/AP9fCSvy/379-keep-shared-template-contract-tests-aligned-with-component-reuse)                   |
| Created one loaded full-unit timing bug                                                                                                                    | `6a8372e05e63e6e4a005c914` | Low      | `1e504f74`                                                                                    | [Keep loaded interaction tests reliable in the full unit suite](https://trello.com/c/6iD3EjHY/380-keep-loaded-interaction-tests-reliable-in-the-full-unit-suite)                         |

## Items intentionally not split into Bug cards

- `5529b996` adds the pull-request quality workflow. It is a new release-control capability, not a reproduced defect, so classifying it as a Bug would be inaccurate.
- `9440b805` keeps generated database types out of Prettier, `6d3f35af` extends the public-boundary test, and `6f13b42c` regenerates the authoritative types. These are inseparable delivery evidence for the owner-managed external-review heading and are recorded on the updated review card.
- `95fec2dd` supplies browser evidence for the already tracked disabled-public-analytics defect; no second analytics card was created.
- `451fef71` and `6e436c2c` are documentation/review evidence and do not independently change defective behavior.
- The changes in `210c698c`, `6c99e033`, and the review portions of `2f2f1925`/`5fa2c24c` remain covered by the seven-card `final-remediation-trello.json` manifest.

## Verification

Both manifests passed deterministic API readback:

- `final-remediation-trello.json`: 7 expected, 7 matched, no missing titles, duplicates, description mismatches, priority mismatches, or Bug mismatches.
- `final-audit-trello-coverage.json`: 5 expected, 5 matched, no missing titles, duplicates, description mismatches, priority mismatches, or Bug mismatches.

Every card in the five-entry coverage manifest resolves to list ID `6a66455de5828451407487b9` (`Backlog`) and Bug label ID `6a66455de582845140748a47`. Medium cards have exactly priority label `6a6674e0d0b76c2d9aa58110`; Low cards have exactly priority label `6a6674e0c928fbb247d9b1d1`.

## Machine-readable sources

- `final-remediation-trello.json` remains the authoritative seven-product-defect manifest and now includes the expanded review-heading coverage.
- `final-audit-trello-coverage.json` is the exact upsert and verification input for this reconciliation. It intentionally repeats the updated review card alongside the four new test/evidence cards.

## Finalization required

After the final branch verification and ready-for-review pull request exist, replace `Final pull request: pending` with the final commit and pull-request URL on these same cards, move them to `Done 🎉`, and read them back against the destination list. Do not create replacement cards.
