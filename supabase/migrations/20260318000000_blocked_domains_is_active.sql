-- Add is_active column to blocked_email_domains for toggling domain block status
ALTER TABLE public.blocked_email_domains
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for efficient filtering by active status
CREATE INDEX IF NOT EXISTS idx_blocked_email_domains_is_active
    ON public.blocked_email_domains (is_active) WHERE is_active = TRUE;
