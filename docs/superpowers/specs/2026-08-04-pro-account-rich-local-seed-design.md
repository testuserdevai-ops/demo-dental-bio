# Rich Pro Account Local Seed Design

## Context

The local Supabase seed creates a confirmed `pro-user` account with the `PRO`
entitlement, but its public profile sections are empty. Developers can sign in,
yet cannot exercise the populated dashboard or public-profile states for the
bio, treatments, videos, gallery, shop, reviews, links, and social sections
after a database reset.

## Decision

Extend the existing local-only fixture rather than create a second Pro account.
The seed will populate realistic dental-professional content for the fixed user
ID `11111111-1111-4111-8111-111111111111` and its trigger-created dentistry.
It will cover:

- a professional name, title, position, country, biography, contact details,
  website, and enabled booking link;
- multiple treatments plus one service, with explicit visible ranks;
- a video group containing multiple enabled videos;
- a before/after gallery entry and multiple general-gallery entries;
- a shop group containing multiple enabled products with prices and ranks;
- multiple enabled reviews plus an external reviews-page link;
- grouped profile links with explicit ranks; and
- Instagram, Facebook, TikTok, X, and other/website social links.

Use fixed UUIDs and explicit identity values for relational fixtures. Every
seed statement must be safe to reapply without creating duplicates or changing
the fixed fixture identity. Updates should restore the canonical test values if
a developer has edited them locally.

## Media and destinations

Use stable paths to existing repository-owned images under `public/` for
gallery, product, and reviewer imagery. These paths work through the local
Next.js application and keep database resets independent of third-party image
availability. Reuse the existing placeholder and preview assets; do not add new
generated images or seed Storage objects.

Use realistic but non-production destinations. Link and product destinations
use `https://example.com/...`; videos use public YouTube watch URLs suitable for
the application's existing embed conversion. Social links use recognizable
platform profile URLs with a clearly fictional DentalBio demo handle. No
clinical patient identifiers, real contact details, secrets, Stripe data, or
production accounts are introduced.

## Data flow and ownership

`supabase db reset --local` runs migrations, creates the Auth fixtures, lets the
existing Auth trigger create `public.users` and `public.dentistries`, then
applies the related content fixtures in dependency order. The public profile
continues to read the same production tables and relationships; no application
code, schema, analytics contract, or runtime branching is added for seed data.

The seed remains explicitly local-only. Its existing warning and loopback-only
verification guard stay in place.

## Verification

Extend `scripts/verify-local-seed.ts` before changing the SQL. After signing in
through local Supabase Auth as `pro-user`, the verifier will query the profile
and every requested section, asserting representative canonical values and
minimum counts. It will also verify nested relations for treatments, videos,
products, and links so rows that exist but are disconnected do not pass.

The test cycle is:

1. Run the extended verifier against the current local database and observe a
   failure because the Pro content is absent.
2. Add the minimal idempotent seed data.
3. Run a clean local database reset and the verifier.
4. Reapply the seed and rerun the verifier to prove idempotency.
5. Run formatting, TypeScript checking for the verifier, and SQL/diff checks in
   proportion to the data-only change.

## Commit strategy and concurrent work

Commit the design, verifier, seed implementation, and any final verification
adjustments as separate coherent commits. Stage only the files owned by this
task. Do not modify or include the concurrently edited
`e2e/dashboard/profile.spec.ts`, and consult the append-only cooperation notes
before shared local-database operations.

## Alternatives considered

1. **Repository assets and relational SQL fixtures (recommended).** Stable,
   offline-friendly, exercises the real read paths, and remains easy to reset.
2. **External media URLs.** More visually varied but network-dependent and
   vulnerable to remote changes or hotlink failures.
3. **Seed Supabase Storage objects.** Closest to uploaded production media but
   adds binary/bootstrap complexity that is unnecessary for testing populated
   sections.

## Rollback

Reverting the fixture inserts returns clean resets to account-only data. No
schema migration, production data, or external service needs reversal.
