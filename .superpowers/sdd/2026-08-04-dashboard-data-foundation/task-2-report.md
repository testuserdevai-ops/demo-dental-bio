# Task 2 report: canonical typed Supabase factories

## Status

Completed local schema generation and typed factory compatibility layer in `8842f69 feat(data): add canonical typed Supabase clients`.

## Schema reset and generated contract evidence

The first required reset failed before task edits because two empty Phase 6 migration stubs shared version `20260803214924`. The coordinator resolved the duplicate by regenerating the empty profile/gallery/review stub with version `20260803220308` in commit `75ed2d5`; no migration contents changed. Per coordinator direction, that commit became this task's base and no migration files were edited by this task.

After correction, `/Users/ramezweissa/.bun/bin/bunx supabase migration list --local`, `/Users/ramezweissa/.bun/bin/bunx supabase db reset`, and `git status --short` succeeded. The reset recreated the local database, applied every migration from `20260207142920_remote_schema.sql` through `20260803224500_referral_entitlement_accumulation.sql`, seeded `supabase/seed.sql`, and restarted local containers. No historical SQL files changed.

The canonical generated type contract was created mechanically with `/Users/ramezweissa/.bun/bin/bunx supabase gen types typescript --local > lib/supabase/database.types.ts`. `rg -n "export type Database|dentistry_treatments|registration_completions" lib/supabase/database.types.ts` found `export type Database` at line 9, `dentistry_treatments` at line 346, and `registration_completions` at line 899 (plus generated function references). The generated file is force-added as required.

## RED evidence

Before authoring the factory implementation, I added `lib/supabase/factories.test.ts` with compile-time assertions for the generated `Database` contract and all three typed factories. The test is client-marked and imports the server/admin symbols as type-only imports, so server-only modules are never placed in the client runtime graph.

`/Users/ramezweissa/.bun/bin/bun test lib/supabase/factories.test.ts --preload ./test/setup.ts` failed as expected because the implementation did not exist: `error: Cannot find module './admin' from 'lib/supabase/factories.test.ts'` (`0 pass, 1 fail`).

## GREEN verification

Implemented minimal typed factories and converted each legacy utility module into a typed compatibility re-export. The existing cookie adapter/auth settings and admin initialization remain intact, with the latter now server-only. The one shared client annotation in task scope, `utils/user/getEffectiveUserId.ts`, is now `SupabaseClient<Database>`.

`/Users/ramezweissa/.bun/bin/bun test lib/supabase utils/supabase --preload ./test/setup.ts`, `/Users/ramezweissa/.bun/bin/bunx prettier --write lib/supabase utils/supabase utils/user/getEffectiveUserId.ts`, and `git diff --check` completed successfully. Final focused output: `10 pass`, `0 fail`, `24 expect() calls`; the same focused suite was rerun after the commit with the same green result.

`/Users/ramezweissa/.bun/bin/bun run typecheck` typechecks the new factory contract but exits nonzero on feature-local assumptions exposed by typed compatibility clients: nullable profile/media fields, dynamic table names in `app/api/groups/route.ts`, form payload coercions, and pre-existing `app/components/ui/field.tsx` child-prop typing. Those files are outside Task 2's exclusive ownership; no foundation client/type error is reported.

## Files changed

- `lib/supabase/database.types.ts` (mechanically generated from local schema)
- `lib/supabase/browser.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/factories.test.ts`
- `utils/supabase/client.ts`
- `utils/supabase/server.ts`
- `utils/supabase/supabaseAdmin.ts`
- `utils/user/getEffectiveUserId.ts`

## Self-review

Browser construction is client-marked and returns `SupabaseClient<Database>`. Server and service-role construction are explicitly server-only, return/use the same canonical `Database`, and legacy paths only re-export them, so no second client instance remains. The compile-time test proves the generated `users.id` contract and client generic propagation without executing server-only modules in the client test runtime.

## Concerns

Broad typecheck is intentionally not green because canonical typing surfaces unrelated feature-local errors listed above. The required focused Supabase tests and whitespace check are green. No production Supabase service, migration content, or fixed-port process was touched.

---

## Fix round 1: typed consumer propagation and client-runtime isolation

### RED evidence

`/Users/ramezweissa/.bun/bin/bun run typecheck` initially reported the complete typed-client propagation set across public profile metadata, admin guards, dashboard editors, route handlers, registration/webhook date payloads, and shared utility injection points. The exact shared scan also found `supabase: any` in `utils/userInfo.ts`, `utils/getMaxOrder.ts`, `utils/removeFromBucket.ts`, and `utils/slugGenerator.ts`.

The new client boundary test was exercised with both `import "server-only"` markers temporarily removed from `lib/supabase/server.ts` and `lib/supabase/admin.ts`. It failed as intended: the browser bundle exited `0`, violating `expect(result.exitCode).not.toBe(0)`. The imports were immediately restored; no behavior was retained from that red setup.

### GREEN implementation and verification

- Replaced all shared injected Supabase `any` annotations with `SupabaseClient<Database>` and made rank-table/table-column selection an explicit controlled allowlist.
- Removed the call to `ensure_public_user`: verified local migrations and generated types contain no such RPC, so the missing-profile path now truthfully redirects to login instead of casting a fabricated RPC result.
- Normalized nullable storage URLs, relation IDs, request form values, Stripe/Supabase timestamps, and optional dashboard fields at their actual boundaries.
- Made group child-table selection a `videos | products` runtime allowlist, preserving the anti-injection policy while giving Supabase a controlled table union.
- Added `client-runtime-boundary.fixture.ts` and a browser-bundle test that imports server/admin factories at runtime; restored `server-only` markers cause the bundle to reject with a `server-only` diagnostic.
- Updated Field child traversal with a typed React element guard; its existing semantic regression suite remains green.

Fresh commands and results:

- `/Users/ramezweissa/.bun/bin/bun test lib/supabase utils/supabase --preload ./test/setup.ts` — `11 pass`, `0 fail`, `26 expect() calls`, including `a client runtime bundle rejects server and admin factories`.
- `/Users/ramezweissa/.bun/bin/bun test app/components/ui/button-field.test.tsx --preload ./test/setup.ts` — `12 pass`, `0 fail`, `32 expect() calls`.
- `/Users/ramezweissa/.bun/bin/bun run typecheck` — exit `0`.
- `rg -n "SupabaseClient(?!<)|supabase: any|\\[key: string\\]: any" lib utils app/contexts --pcre2` — no injected `supabase: any`, index-signature `any`, or unparameterized client annotation remains; the raw textual matches are generic type imports and factory identifiers only.
- `git diff --check` — clean before commit.

### Self-review and concerns

All query table names and payload values now cross a typed/normalized boundary. The runtime boundary test verifies an actual browser bundle instead of inspecting source text. No schema override, type/lint suppression, `any`, broad assertion, migration change, or production service was used. Fix-round commit: `fix(data): type Supabase consumers`.
