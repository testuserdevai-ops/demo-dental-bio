# Local aggregate seed verifier parity remediation

Base: `5fa2c24cac05a325d46989e17c46a924c00cc5f2`

## Outcome

`scripts/verify-local-seed.ts` now passes against a fresh complete local seed
after every template parity overlay. The verifier remains strict about each
showcase's deterministic representative IDs and authored fields while allowing
the additive treatment, service, product, location, and link inventories that
the public templates intentionally render dynamically.

## Corrections

- Derive the expected Storage origin from the validated local Supabase status,
  including an explicitly selected isolated workdir, instead of assuming port
  `54321`.
- Verify Direct Booking's current `owner-location-1.webp` media and find its
  stable location relation by ID instead of trusting relation order.
- Find Trust-First, Expert Educator, and Cosmetic Transformation locations by
  stable ID where overlays add multiple locations.
- Require every deterministic representative treatment ID without requiring
  that it exhaust the complete inventory for Basic, Direct Booking, Services
  Catalogue, Cosmetic Transformation, Trust-First, Specialist Assessment, and
  Clinic Commerce.
- Scope Trust-First, Clinic Commerce, and Expert Educator legacy resource checks
  to their stable authored groups when link parity adds another group.
- Verify all four final Clinic Commerce products, including the overlay's fourth
  valid product, while leaving optional image sanitization to the production
  selector contract. The three deterministic Storage objects remain fetched and
  byte-verified separately.
- Split Direct Booking, Services Catalogue, Cosmetic Transformation,
  Trust-First, and Specialist assertions into diagnostic feature sections so a
  future seed regression identifies its actual relationship.
- Add focused contracts forbidding exact treatment caps, requiring all seven
  representative-ID subset checks, protecting the isolated Storage origin, and
  retaining the stable resource IDs and Direct Booking location asset.

## Isolated reproduction

Runtime: ignored `supabase/.temp/verify-local-seed-parity`

Project ID: `dental_verify_seed`

API/DB: `56821` / `56822`

The runtime was created from the exact branch seed and migrations. Only its
ignored copy replaced local seed URL port `54321` with `56821`; repository seed
files were not changed.

Final aggregate output verified:

- populated Pro profile and `pro@dentalbio.local`;
- `admin@dentalbio.local`;
- Basic;
- Direct Booking;
- Location Router;
- Services Catalogue;
- Cosmetic Transformation;
- Trust-First;
- Specialist Assessment;
- Clinic Commerce;
- Expert Educator.

## Verification

- `LOCAL_SUPABASE_WORKDIR=supabase/.temp/verify-local-seed-parity bun scripts/verify-local-seed.ts` — **passed**, all 11 accounts and the populated Pro module inventory.
- Focused static verifier suite — **passed**, 43 tests and 356 expectations.
- `bun run typecheck` — **passed**.
- Exact-file ESLint — **passed**.
- Exact-file Prettier check — **passed**.
- `git diff --check` — **passed**.

No pgTAP test, dashboard manager, tracker, or workflow file was changed.
