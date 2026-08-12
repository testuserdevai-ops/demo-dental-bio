# Local template showcase seeds

Template showcase fixtures are loaded after the established local account seed
through the ordered paths in `supabase/config.toml`:

1. `supabase/seed.sql` creates the shared Pro/admin development fixtures.
2. `supabase/seeds/template-showcases/*.sql` adds one stable showcase per
   template in filename order.

Each template owns one file named after its controlled template ID. A showcase
must use deterministic IDs and `ON CONFLICT` updates, write the private
`public.users` source plus existing content tables, and let the production
trigger synchronize `public.public_profiles`. Showcase SQL must never insert or
update that projection directly.

Prefer `INSERT … SELECT` from the shared rich Pro fixture when content can be
reused safely. Clone records where the schema requires exclusive ownership,
then create deterministic joins so one showcase cannot mutate another. Keep
template configuration in `profile_presentation_published` and include an
explicit revision.

Reusable local images live under `supabase/storage/<bucket>/`. Profile images
use a directory named for the deterministic dentistry ID so the production
loader resolves them without fixture-specific code. Public module imagery may
reuse checked-in `/public/previews` assets.

Extend `scripts/verify-local-seed.ts` with the showcase's stable username,
configuration, content relationships, module counts, and image checks. Also
extend `lib/environment/local-seed-showcases.test.ts` so omissions and direct
projection writes fail before a database reset. Completion requires a clean
local reset followed by `bun scripts/verify-local-seed.ts`.
