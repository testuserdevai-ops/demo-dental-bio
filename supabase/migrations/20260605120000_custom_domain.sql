-- Custom domain support
-- The users table already has: domain, domain_verification_code, domain_verified.
-- Enforce that a given custom domain can only be claimed by one user.

-- Normalise any existing values to lowercase so the unique index is consistent.
UPDATE "public"."users"
SET "domain" = lower("domain")
WHERE "domain" IS NOT NULL AND "domain" <> lower("domain");

-- Unique across non-null domains only (NULL = no custom domain configured).
-- This index also serves the middleware host -> username lookup.
CREATE UNIQUE INDEX IF NOT EXISTS "users_domain_unique_idx"
ON "public"."users" (lower("domain"))
WHERE "domain" IS NOT NULL;
