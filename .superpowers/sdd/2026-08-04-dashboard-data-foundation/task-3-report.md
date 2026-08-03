# Task 3 report: dashboard authority RLS

## RED evidence

Before the migration implementation, `supabase test db supabase/tests/phase6_dashboard_identity_rls.test.sql --local` failed as expected. The role, subscription, session, and blocking authority updates were permitted by the baseline policy; pgTAP reported `caught: no exception` where `42501` was expected. The first RED run also stopped at the deliberately absent `public.is_dashboard_admin()` helper. The initially unquoted `isVerified` test target exposed the existing mixed-case column name, so the test was corrected to `"isVerified"` before implementation.

## GREEN evidence

After `supabase db reset`, `supabase test db --local` passed all 13 pgTAP assertions. Coverage exercises authenticated-owner authority denials and presentation success, ordinary cross-user denial, anonymous update/function denial, and admin helper/target-presentation success. No service role was used to simulate any ordinary success.

## Migration review

`20260803214923_protect_dashboard_user_authority.sql` creates the database-backed, `SECURITY DEFINER` admin helper with an empty search path and caller-derived `auth.uid()`. It revokes PUBLIC/anon function execution, grants authenticated execution, replaces the permissive users UPDATE policy with authenticated owner-or-admin `USING` plus `WITH CHECK`, revokes table UPDATE from anon/authenticated, then grants only the profile/domain presentation whitelist. Role, subscription, Stripe/billing, verification, session, registration, and blocking fields are excluded.

## Lint and types

`supabase db lint --local --level warning` completed with pre-existing findings in `public.increment_click_counter` (uuid/bigint comparison, error) and `public.fn_audit_write` (text/text[] warning). It reported no finding attributable to this migration or its new helper/policy. Types were regenerated from local Supabase then Prettier-normalized; the reviewed diff is the added `public.is_dashboard_admin: { Args: never; Returns: boolean }` function type.

## Tracking, commit, and self-review

Both SQL files are ignored by the repository's `*.sql` rule and were force-added. `git diff --check` passed. The migration was checked for fixed empty `search_path`, explicit schema qualification inside the security-definer body, caller-derived identity, both update policy expressions, and exact column grants. pgTAP separately verifies function execution grants and the required actor scenarios.

## Concerns

The local lint output contains the two unrelated historical findings above; this task does not alter those objects. The whitelist intentionally excludes domain verification state/code as authority-bearing verification data, so any route that writes those fields must continue through a trusted server path rather than an ordinary authenticated database client.
