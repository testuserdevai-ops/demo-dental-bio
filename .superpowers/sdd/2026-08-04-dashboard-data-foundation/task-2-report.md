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
