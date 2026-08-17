# Independent review: aggregate seed verifier parity fix

Range reviewed: `95fec2dd..e07ea8d8`

Verdict: **PASS** — no Medium-or-higher findings.

## Review scope

- `scripts/verify-local-seed.ts`
- `lib/environment/local-seed-showcases.test.ts`
- `lib/environment/local-seed-verifier-status.test.ts`
- the implementation report added by the reviewed commit

The review checked that the aggregate verifier remains strict about its
deterministic showcase fixtures while accepting inventories intentionally
extended by the parity overlays, that relation selection does not depend on
PostgREST array order, and that isolated Supabase workdirs do not inherit the
canonical `54321` Storage origin.

## Findings

No actionable findings.

The treatment assertions no longer use obsolete exact total counts, but this
does not discard the prior representative-fixture contract: all seven changed
showcases still require every original stable treatment ID, and the showcases
that previously checked authored fields still check those fields on the exact
matching ID. Extra rows are accepted because the treatment/service parity
overlay is deliberately additive. The separate production-selector verifier,
`scripts/verify-profile-treatment-services-showcase.ts`, continues to require
the complete exact treatment and service IDs, titles, order, positions, and
non-overlap for all eight overlaid templates, so a missing or malformed overlay
cannot be hidden by the aggregate verifier's representative subset checks.

The other broadened inventories retain deterministic boundaries:

- Clinic Commerce requires all four final product IDs and valid enabled,
  HTTPS, price, and currency fields; its intentionally invalid optional image
  is sanitized by the separately verified production selector, while the three
  deterministic product-image objects are still fetched and byte-checked.
- Trust First and Clinic Commerce resource checks are constrained to their
  stable legacy link-group IDs.
- Expert Educator is constrained to its two stable authored link-group IDs and
  still checks exact headings and all four stable link IDs.
- Direct Booking, Trust First, Expert Educator, and Cosmetic Transformation
  select their intended location relation by stable ID rather than taking the
  first returned relation.

`localSupabaseStorageOrigin` reuses the existing loopback-only validation and
returns the validated origin. The local status path assigns it before any
account verification, so exact Storage URL checks follow an explicitly chosen
isolated workdir/port. The canonical path still refuses any port other than
`54321`, external hosts remain rejected, and repository-escaping workdirs
remain rejected. Staging retains its separate approved-project-ref gate.

## Independent focused verification

- `bun test lib/environment/local-seed-showcases.test.ts lib/environment/local-seed-verifier-status.test.ts lib/environment/profile-treatment-services-showcase.test.ts` — **41 passed, 0 failed, 364 expectations**.
- Exact-file ESLint for the verifier and its two changed tests — **passed**.
- Exact-file Prettier check for the verifier, changed tests, and implementation
  report — **passed**.
- `git diff --check 95fec2dd..e07ea8d8` — **passed**.

No source, git state, database, port, Trello card, PR, tracker, or evidence index
was changed by this review; only this durable review report was written.
