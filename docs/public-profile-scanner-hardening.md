# Public-profile scanner hardening

## Evidence baseline

The design is based on the three supplied Supabase log exports and the derived
analysis under `outputs/scanner-log-analysis-20260810`:

- 2,629 failed public username lookup requests;
- 504 unique username candidates;
- every extracted request returned `406` from the old `.single()` lookup;
- syntax validation alone rejected 11 candidates;
- recognizable scanner signatures covered 441 candidates and 2,365 requests;
- 63 candidates remained indistinguishable from plausible usernames by syntax.

The output directory is a local analysis artifact and is not a runtime
dependency. Focused tests retain representative cases needed to verify the
boundary.

## Required outcomes

1. Impossible username paths are rejected before any Supabase operation.
2. Valid-looking misses are cached across requests, not only within one React
   render, so repeat probes do not repeat identity and storage lookups.
3. Public identity resolution is auth-neutral and cannot cache one visitor's
   authenticated data for another visitor.
4. Public profile, metadata, blog, sitemap, and verified custom-domain behavior
   use a deliberately public projection rather than the base `users` table.
5. Anonymous callers cannot select any column from `public.users` directly.
6. Authenticated owners retain access to their own record; unblocked dashboard
   administrators retain the existing administrative read behavior.
7. The public projection remains synchronized when a profile is created,
   renamed, blocked, unblocked, or deleted, and when its dentistry record is
   created or deleted.

## Layered policy

The application boundary normalizes the existing database username contract
and persistently caches positive and negative identity results. It does not
deny every dotted filename or human-looking scanner value: dots are valid in
existing usernames, and the log analysis demonstrates that syntax signatures
cannot safely identify every miss.

The database boundary is therefore authoritative. It exposes only approved
public-profile fields through a synchronized projection, keeps lookup columns
indexed, and revokes anonymous access to the private account record. Managed
WAF rules and infrastructure rate limits remain defense in depth for known PHP,
WordPress, dotfile, and credential-file probes; they are not substitutes for
the application cache or database grants and RLS.

## Stack and verification

1. **Next.js scanner boundary**: normalization, auth-neutral persistent identity
   caching (including misses), cache invalidation contracts, and focused tests.
2. **Supabase public boundary**: synchronized projection, least-privilege grants
   and RLS, consumer migration, database tests, and direct REST verification.

The second PR is based on the first. Each PR must pass its focused unit tests,
formatting, typecheck, and lint checks before the dependent branch is created.
The completed stack additionally runs the local database tests, production
build, public-profile Playwright flows, and accessibility checks.
