# Rich Pro Account Local Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every requested public-profile section contain realistic, deterministic data after a local Supabase reset for `pro-user`.

**Architecture:** Extend the loopback-only verifier first so missing or disconnected fixture rows fail observably. Then add fixed-ID, idempotent relational records to the existing local-only SQL seed in dependency order, using existing `/public` assets and non-production destinations. No application behavior, schema, analytics, or remote services change.

**Tech Stack:** Supabase Auth/Postgres/PostgREST, SQL seed fixtures, TypeScript, Bun, `@supabase/supabase-js`.

## Global Constraints

- The fixture user is `11111111-1111-4111-8111-111111111111` / `pro@dentalbio.local` / `pro-user` with the `PRO` entitlement.
- Populate bio, treatments, videos, gallery, shop, reviews, links, and social data.
- Use fixed IDs and idempotent statements that restore canonical values without duplicates.
- Use existing repository assets; do not add generated images or Storage objects.
- Use only fictional/non-production contact details, destinations, and social handles.
- Preserve the local-only seed warning and loopback verifier guard.
- Do not edit or commit the concurrently modified `e2e/dashboard/profile.spec.ts`.
- Inspect cooperation notes and working-tree status before shared database operations and every commit.
- Make granular commits by responsibility and stage only explicit owned files.

---

### Task 1: Specify the complete Pro fixture in the verifier

**Files:**

- Modify: `scripts/verify-local-seed.ts`

**Interfaces:**

- Consumes: authenticated local Supabase client and fixed Pro user ID.
- Produces: `verifyProContent(supabase, userId)` which throws a section-specific error when a required fixture is absent, disconnected, disabled, or incorrectly ranked.

- [ ] **Step 1: Add expected fixture contracts and assertion helpers**

Define constants for the fixed dentistry, treatment, group, gallery, product,
review, link, and social values. Add an assertion helper with this contract:

```ts
function assertSeed(
  condition: unknown,
  section: string,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Pro seed ${section} verification failed: ${detail}`);
  }
}
```

Add `verifyProContent` and call it only for the account whose email is
`pro@dentalbio.local` after `verifyAccount` has authenticated and checked its
public user row.

- [ ] **Step 2: Query and assert bio plus social data**

Query the Pro `users` row for `first_name`, `last_name`, `title`, `position`,
and `country`; query `dentistries` with nested `socials`. Assert the canonical
identity `Amelia Hart`, title `Dr`, position `Cosmetic Dentist`, country
`United Kingdom`, biography title `Creating confident, healthy smiles`, a
non-empty biography, contact email `hello@example.com`, enabled booking link,
and all five social columns.

- [ ] **Step 3: Query and assert treatments and profile links**

Query `dentistry_treatments` with nested `treatments`, ordered by rank. Assert
at least three connected rows, ranks `[1, 2, 3]`, two `isService = false`
records and one `isService = true` record. Query `link_groups` with nested
`dentistry_links.links`; assert the `Helpful resources` group has at least two
active connected links ranked `[1, 2]`.

- [ ] **Step 4: Query and assert videos, gallery, shop, and reviews**

Query `groups` separately for types `videos` and `products`, with nested
`videos` or `products`; assert two enabled, ranked children per group. Query
`galleries` and `general_galleries` for the Pro user and assert one enabled
before/after pair and at least two enabled general images. Query `reviews` and
`external_review_pages`; assert at least two enabled reviews with ranks
`[1, 2]`, five stars, and one external reviews link.

- [ ] **Step 5: Run the verifier and record RED**

Before changing `supabase/seed.sql`, run:

```bash
bun scripts/verify-local-seed.ts
```

Expected: authentication succeeds, then the command fails with the first
missing Pro-content assertion (bio or its nested dentistry/social row).

- [ ] **Step 6: Format, check, and commit the executable specification**

Run:

```bash
bunx prettier --write scripts/verify-local-seed.ts
bunx tsc --noEmit --incremental false
git diff --check -- scripts/verify-local-seed.ts
```

Inspect `git status --short`, stage only `scripts/verify-local-seed.ts`, and
commit:

```bash
git add scripts/verify-local-seed.ts
git commit -m "test(seed): require populated pro profile"
```

### Task 2: Populate all requested Pro sections idempotently

**Files:**

- Modify: `supabase/seed.sql`

**Interfaces:**

- Consumes: existing fixed Auth fixture and trigger-created `public.users` /
  `public.dentistries` rows.
- Produces: canonical relational rows readable through the same queries as the
  public profile and dashboard.

- [ ] **Step 1: Restore canonical user and dentistry bio fields**

Extend the Pro `users` update with `first_name = 'Amelia'`,
`last_name = 'Hart'`, `title = 'Dr'`, `position = 'Cosmetic Dentist'`, and
`country = 'United Kingdom'`. Upsert the fixed dentistry ID
`11111111-1111-4111-8111-111111111120` on its primary key with:

```sql
about_title = 'Creating confident, healthy smiles'
contact_email = 'hello@example.com'
phone = '+442000000000'
website = 'https://example.com/dentalbio-demo'
booking_link = 'https://example.com/dentalbio-demo/book'
booking_link_enabled = true
```

Use a concise multi-sentence biography describing preventive, restorative,
and cosmetic care. Conflict updates must restore every listed field.

- [ ] **Step 2: Upsert social, treatment, and treatment-join fixtures**

Upsert one `socials` row for the fixed dentistry with fictional `dentalbio-demo`
handles on X, Instagram, Facebook, and TikTok plus
`https://example.com/dentalbio-demo` as `other_link`.

Upsert these treatments and their fixed joins/ranks:

```text
Teeth whitening — treatment — rank 1
Invisalign consultation — treatment — rank 2
Virtual smile consultation — service — rank 3
```

Use fixed UUID suffixes `130`–`132` for treatment IDs and `140`–`142` for
join IDs. Conflict updates must restore titles, descriptions, service flags,
dentistry IDs, treatment IDs, and ranks.

- [ ] **Step 3: Upsert video and product groups with children**

Use fixed bigint IDs `1111101` and `1111102` for enabled groups named
`Patient guides` (`type = 'videos'`, rank 1) and `Smile care essentials`
(`type = 'products'`, rank 2). Upsert two enabled videos with ranks 1–2 and
valid YouTube watch URLs, then two enabled products with ranks 1–2,
`platform = 'Demo shop'`, `currency = 'GBP'`, prices `12.99` and `24.99`,
`https://example.com/dentalbio-demo/shop/...` links, and `/previews/*.webp`
images. Use fixed child bigint IDs `1111201`–`1111202` and
`1111301`–`1111302`.

- [ ] **Step 4: Upsert gallery and review fixtures**

Upsert one enabled before/after gallery row at fixed ID `1111401`, rank 1,
using `/previews/hero-image-1.webp` and `/previews/hero-image-2.webp`, with
labels `Before treatment` and `After treatment`. Upsert two enabled general
gallery rows at IDs `1111501`–`1111502`, ranks 1–2, using existing preview
assets.

Upsert two enabled five-star reviews at IDs `1111601`–`1111602`, ranks 1–2,
with fictional names, short realistic feedback, and repository image paths.
Upsert external review page ID `1111701` with
`https://example.com/dentalbio-demo/reviews`.

- [ ] **Step 5: Upsert grouped links and joins**

Upsert link group UUID `11111111-1111-4111-8111-111111111180`, heading
`Helpful resources`, rank 1. Upsert two active links at UUID suffixes `181`
and `182`, ranked 1–2, titled `Book a consultation` and
`New patient information`, with `example.com` destinations. Upsert fixed
dentistry-link join UUID suffixes `183` and `184` so nested public queries
resolve both children.

- [ ] **Step 6: Verify the seed is GREEN after a clean local reset**

Check the cooperation notes to ensure no other agent currently owns a reset,
then append a timestamped reset note. Run:

```bash
bunx supabase db reset --local
bun scripts/verify-local-seed.ts
```

Expected: both account checks pass and the verifier prints a successful Pro
content message covering all eight requested sections.

- [ ] **Step 7: Prove idempotency**

Retrieve the local database URL from `bunx supabase status --output json`,
apply `supabase/seed.sql` a second time only to that loopback database, then
rerun:

```bash
bun scripts/verify-local-seed.ts
```

Query fixed IDs and assert one row per fixture plus the exact expected child
counts. Expected: no duplicate-key errors, counts remain unchanged, and the
verifier passes.

- [ ] **Step 8: Check and commit the fixture implementation**

Run:

```bash
git diff --check -- supabase/seed.sql
```

Inspect only the owned SQL diff and current status. Because a global ignore
rule hides SQL files, force-stage only this already tracked seed if required:

```bash
git add -f supabase/seed.sql
git commit -m "feat(seed): populate local pro profile"
```

### Task 3: Final integration audit

**Files:**

- Verify: `scripts/verify-local-seed.ts`
- Verify: `supabase/seed.sql`
- Verify untouched: `e2e/dashboard/profile.spec.ts`

**Interfaces:**

- Consumes: committed verifier and SQL fixtures.
- Produces: evidence that every requested section is populated and concurrent
  work was not included.

- [ ] **Step 1: Run proportionate repository checks**

Run:

```bash
bunx prettier --check scripts/verify-local-seed.ts
bunx tsc --noEmit --incremental false
bun run lint
git diff --check
bun scripts/verify-local-seed.ts
```

If lint reports pre-existing warnings, confirm there are no errors associated
with the owned verifier or seed changes.

- [ ] **Step 2: Audit requirement coverage from current state**

Read the final SQL and verifier and map each requirement—bio, treatments,
videos, gallery, shop, reviews, links, social—to a concrete seed statement and
a passing assertion. Confirm nested joins are tested and canonical paths point
to files that exist under `public/`.

- [ ] **Step 3: Audit commits and concurrent changes**

Run:

```bash
git log -3 --oneline
git show --stat --oneline HEAD
git status --short
```

Confirm the design, verifier, and fixture are granular commits and that the
unrelated `e2e/dashboard/profile.spec.ts` remains unstaged/uncommitted by this
task. Append completion and verification evidence to the cooperation notes.
