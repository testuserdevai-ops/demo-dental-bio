-- Synthetic staging fixtures only. This wrapper must be selected exclusively by
-- the persistent develop branch configuration. It must never be configured on
-- the production project or run manually against an unverified remote target.
--
-- The psql gate makes reruns non-destructive: after the deterministic fixture
-- identity exists, staging edits are preserved rather than overwritten by the
-- fixture upserts in ../seed.sql.
\set ON_ERROR_STOP on

select exists (
  select 1
  from auth.users
  where id = '11111111-1111-4111-8111-111111111111'
    and email = 'pro@dentalbio.local'
) as dentalbio_staging_seed_exists
\gset

\if :dentalbio_staging_seed_exists
  \echo 'DentalBio staging fixtures already exist; preserving staging edits.'
\else
  \ir ../seed.sql
\endif
