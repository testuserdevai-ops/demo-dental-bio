# Independent review: `fn_audit_write` lint fix

Commit reviewed: `efc40d932370f0a7cff8a0c81e7a0747d5889459`
(equivalent cherry-pick `3507006fc578e27ee68823e7bcfacc99417e636d`)

Verdict: **PASS** — no Medium-or-higher findings.

## Scope and conclusions

- `supabase/migrations/20260817204018_fix_fn_audit_write_lint.sql`
- `supabase/tests/profile_audit_write_lint.test.sql`

The recreated function retains the established signature, `void` return,
`SECURITY DEFINER` setting, empty fixed search path, qualified table references,
actor/subject attribution, proxy-header fallback behavior, ignored-key policy,
and audit row shape. The only behavioral-source change from the latest prior
definition is the local accumulator initializer changing from the ambiguous
string literal `'{}'` to the explicit empty `text[]` expression
`array[]::text[]`; the remaining changes are formatting and the already-applied
empty-search-path hardening.

`CREATE OR REPLACE FUNCTION` is appropriate here. A before/after catalog check
on a fresh private PostgreSQL 17 stack showed that the function OID (`18700`),
owner (`postgres`), `SECURITY DEFINER` flag, `search_path=""` configuration,
comment, ACL (`postgres` and `service_role` execute only), and the checksum of
all audit-trigger definitions were identical before the migration, after one
application, and after a second application. The second application completed
successfully, establishing migration idempotence. Direct privilege checks
after both applications returned `anon=false`, `authenticated=false`, and
`service_role=true`.

The new pgTAP test is meaningful: it exercises both the direct dentistry
trigger and the indirect link ownership chain, checks exact changed keys and
old/new values, proves click-counter-only updates remain suppressed, and
checks the existing service-role/system actor classification. The existing
Phase 8 security test complements it by checking the restricted function
grant. Inserts, deletes, request-header extraction, and self/admin
classification are not repeated in this focused regression test, but their
function branches are unchanged by the migration.

## Independent runtime evidence

A disposable Supabase stack used API `57321` and database `57322`; it did not
touch the shared project or ports.

- Fresh migration and seed application through
  `20260817204018_fix_fn_audit_write_lint.sql` — **passed**.
- `profile_audit_write_lint.test.sql` plus
  `phase8_database_security.test.sql` — **44/44 assertions passed**.
- Pre-migration `supabase db lint --schema public --level warning` reproduced
  the `fn_audit_write` `text`-to-`text[]` warning.
- Post-migration lint, including after a second migration application, no
  longer reported `fn_audit_write`. It reported only the separately owned
  pre-existing `increment_click_counter` UUID/bigint finding.
- Before/after/reapply catalog and trigger-definition comparisons — **no
  differences**.

The Supabase changelog was scanned for relevant current database/function
breaking changes; none affected this local PostgreSQL function correction.
The private stack was stopped and its disposable files were moved to Trash.
