# Independent review: mixed-ID click-counter RPC

Commit reviewed: `ae839542a677394620b127fc9ce89e607345bbc0`
(equivalent cherry-pick `0b9db2fd6beb012af5a4edecc9d74cd075217f81`)

Remediation reviewed: `ae839542a677394620b127fc9ce89e607345bbc0..ecc529a4`
(equivalent integrated delta `0b9db2fd..686da3dc`)

Verdict: **PASS** — the prior Medium finding is closed, with no remaining
Medium-or-higher findings.

## Finding

### Resolved — Anonymous RPC bypassed the public-profile eligibility boundary

The new function is intentionally executable by `anon` and is `SECURITY
DEFINER`, but both ownership predicates establish visibility by joining
`public.users` (`20260817203833_harden_increment_click_counter.sql:58-65` and
`:87-97`). An owning user row continues to exist when the owner is blocked.
This repository's public-routing boundary is instead the read-only
`public.public_profiles` projection: `private.sync_public_profile` deletes the
projection first and recreates it only when
`not coalesce(users.is_blocked, false)`
(`20260817201434_external_review_section_title.sql:30-82`).

Consequently, a caller can bypass the Next route and invoke the public RPC
directly to increment an enabled blog or active link belonging to a blocked,
non-public profile. The returned counter also acts as an existence/count oracle
for that content. The new pgTAP fixture creates only an unblocked owner and
tests disabled groups/inactive links, so it labels those narrower conditions as
the public-profile boundary without covering the blocked-owner case.

Remediation: in the blog branch require a matching
`public.public_profiles.profile_id = blog_group.user_id`; in the link branch
require the matching projected `dentistry_id` (or projected profile ID through
the dentistry). Add blocked-owner blog and link fixtures proving the RPC
returns `NULL` and leaves both stored counters unchanged. Using the projection
also keeps the definer implementation aligned with the repository rule that
anonymous public reads derive from `public_profiles`, not private `users`.

The exact remediation implements that boundary without widening it. The blog
branch now requires a projection row whose `profile_id` is the enabled group's
owner. The link branch requires both the projection's `profile_id` and
`dentistry_id` to match the concrete link ownership chain, preventing a valid
owner with a mismatched dentistry from satisfying the check. Existing
unblocked fixtures still exercise and pass the numeric-blog and UUID-link
success paths.

The pgTAP delta creates one blocked owner, its dentistry, an enabled group and
blog, and an active grouped link. It first proves the blocked owner is absent
from `public_profiles`, then invokes both RPC branches as `anon`, expects
`NULL`, and finally proves both stored counters retain their exact original
values. That directly covers the prior gap while retaining disabled-group and
inactive-link coverage.

## Other reviewed properties

- A single `jsonb` argument safely represents numeric blog IDs and UUID-string
  link IDs under named PostgREST arguments without unsupported overloads.
  `supabase-js` serializes the existing numeric/string call-site values to the
  required JSON shapes, and the generated `Json` argument type removes the
  prior unsafe cast.
- The table selector is a fixed whitelist, `id_column` is retained only for
  named-argument compatibility and is never interpolated, both updates use
  statically qualified relation names, and casts happen only after strict
  JSON-type/format validation. No dynamic SQL or injection surface was added.
- The `SECURITY DEFINER` function pins an empty search path and qualifies every
  relation. Execute is revoked from `PUBLIC`, `anon`, `authenticated`, and
  `service_role` before being granted only to the two intended public-profile
  caller roles. The obsolete bigint overload is dropped.
- The focused pgTAP meaningfully covers signature uniqueness, grants, search
  path, numeric and UUID success, disabled/inactive rejection, malformed
  selectors/IDs, and unchanged rejected counters. It lacks the blocked-owner
  case described above. The route tests prove the exact RPC payload and response
  for both resource kinds, but remain mocked rather than exercising PostgREST;
  the implementation agent separately recorded real anonymous PostgREST calls.
- The change preserves the legacy counter path and does not enable or alter the
  controlled analytics transport or descriptor contract.

## Independent evidence

- Focused Bun route tests: **6 passed**, 0 failed, 37 expectations.
- TypeScript: `tsc --noEmit --incremental false` **passed**.
- Exact changed TypeScript ESLint: **passed**.
- Exact changed TypeScript Prettier check: **passed**. The repository Prettier
  setup has no SQL parser, so the SQL files were reviewed directly.
- `git diff ae839542^ ae839542 --check`: **passed**.
- Supabase's current changelog and database-function guidance were checked. No
  relevant breaking change affects the RPC encoding; current guidance confirms
  that exposed functions are callable through the Data API, discourages
  overloads, and requires fixed `search_path` plus explicit function grants for
  a definer function.

No shared port or database was used, and no source, git, Trello, PR, tracker, or
matrix state was changed.

## Remediation re-review evidence

- Exact `ae839542..ecc529a4` diff and diff-check: **passed**.
- Focused Bun route tests after remediation: **6 passed**, 0 failed, 37
  expectations.
- Static SQL and fixture review: public owners retain both successful counter
  branches; blocked owners fail both projection joins; exact blocked counters
  are asserted unchanged.
- No database runtime was needed for this scoped re-review. The remediation's
  runtime pgTAP evidence is covered by the controller's final isolated database
  gate.
