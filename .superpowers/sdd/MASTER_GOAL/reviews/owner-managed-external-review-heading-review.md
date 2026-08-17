# Owner-managed external-review heading review

## Verdict

PASS — no High or Medium findings in the reviewed implementation or controller follow-up.

## Reviewed ranges

- Feature implementation: `e07ea8d8..0161f7f0`
- Controller test/format follow-up: `0161f7f0..9440b805`
- Exact isolated-schema type regeneration: `9440b805..6f13b42c`

## Scope and conclusions

- The heading authority is nullable owner-managed data on `dentistries`; `public_profiles` receives only the synchronized public value. The existing private `SECURITY DEFINER` projection synchronizer remains closed to anonymous/authenticated direct execution, uses an empty search path, and now includes the heading in the dentistry trigger and approved-field boundary test.
- `save_external_review_section_title(uuid,text)` is explicitly revoked from `PUBLIC`, `anon`, `service_role`, and unauthorised callers, then granted only to `authenticated`. It locks the target dentistry, checks the authenticated owner or an unblocked dashboard admin, trims values, maps blank input to `NULL`, rejects controls/overflow, and relies on matching table constraints as defense in depth.
- The server action resolves the effective owner scope before passing the dentistry ID to the RPC. It invalidates public content and identity caches only after an authoritative returned row. Returned failures, rejected promises, malformed input, and blank removal preserve the intended error/draft semantics.
- The dashboard form resets to the authoritative returned value and calls the preview reload callback exactly once only after success. Returned/rejected failures retain the draft and call no reload. Blank success removes the heading without inventing public copy.
- All nine concrete public templates pass the projected value through the shared reviews component. A valid owner value renders as the visible `h2` and labels the external-review navigation with `aria-labelledby`; blank/invalid values render reachable tracked links without a hardcoded section label or public fallback. Link analytics descriptors, positions, native anchors, modified-click semantics, and privacy-controlled payloads are unchanged.
- The deterministic showcase seed stores nine distinct owner values, one for every template. New public E2E coverage asserts the exact stored heading on desktop/mobile, labelled navigation, link presence, reload persistence, and axe results. The dashboard E2E covers invalid zero-reload, valid exact-one reload, persistence, and blank removal.
- Generated database types include the nullable `dentistries` and `public_profiles` fields in Row/Insert/Update and retain exactly one `save_external_review_section_title` RPC signature. The exact `9440b805..6f13b42c` regeneration matches the isolated schema: it preserves those heading contracts, restores the four external-review-page RPCs omitted by the earlier manual snapshot, retains the treatment/service-title RPC, and only reorders generated declarations or corrects generated function metadata. TypeScript still passes. The controller's `.prettierignore` addition is appropriate for this generated artifact; the file is generator-owned rather than Prettier-owned. The concurrency-test follow-up separates identity and rank assertions, preserving the exact two-row/distinct contiguous-rank contract without assuming scheduler order.
- The dashboard heading control is owner/editor UI and is correctly excluded from owner-profile conversion analytics. The public external links continue to use the existing controlled analytics adapter.

## Independent evidence

- Focused Bun tests: 21 passed, 0 failed, 114 expectations.
- TypeScript: `tsc --noEmit --incremental false` passed.
- ESLint: every changed TypeScript/TSX file passed.
- Prettier: every changed TypeScript/TSX file passed after the generated-type exclusion.
- Diff checks: all three reviewed ranges passed `git diff --check`.
- Final full isolated pgTAP: 30 files, 760 assertions, all passed after the approved-field boundary and scheduler-independent concurrency fixes.
- Playwright discovery: 20 tests listed (dashboard setup, one dashboard flow, and 18 public desktop/mobile cases).
- Static migration/RLS/grant/projection, generated-type, seed, null-safety, cache-invalidation, analytics, accessibility, and all-template wiring review: passed.

The implementation agent separately recorded a fresh isolated migration/seed, nine-profile projection query, 15-assertion focused pgTAP, and security-advisor pass. The controller's authoritative final isolated run subsequently passed all 30 pgTAP files and all 760 assertions. This review did not use or disturb ports 3001/3002 or any shared database runtime.
