-- ============================================================
-- Profile audit log — enhancements
--
-- 1. Denormalise subject email/username + actor email onto each audit row
--    so admins can filter directly without a user_id round-trip (and so we
--    keep historical email values even if the user changes them later).
-- 2. Broaden header-based IP/UA capture in fn_audit_write so direct-from-
--    browser Supabase calls (which don't go through lib/apiHandler.ts) also
--    record IP/UA via the standard proxy headers PostgREST already sees.
-- 3. Provide a retention purge function and (best-effort) schedule it via
--    pg_cron so the table doesn't grow unboundedly.
-- ============================================================

-- ------------------------------------------------------------
-- 1. New columns
-- ------------------------------------------------------------
ALTER TABLE public.profile_audit_log
    ADD COLUMN IF NOT EXISTS subject_email    TEXT,
    ADD COLUMN IF NOT EXISTS subject_username TEXT,
    ADD COLUMN IF NOT EXISTS actor_email      TEXT;

-- For ilike '%email%' filtering. Plain btree on lower() is good enough for
-- the substring case-insensitive matches we use in the admin page; we don't
-- want a pg_trgm dependency just for this.
CREATE INDEX IF NOT EXISTS idx_profile_audit_log_subject_email_lower
    ON public.profile_audit_log (lower(subject_email));

-- ------------------------------------------------------------
-- 2. Re-define the shared writer
--
-- Adds:
--   * subject_email / subject_username lookup from public.users
--   * actor_email   lookup (only when actor differs from subject)
--   * IP/UA fallback chain so direct browser→PostgREST mutations also
--     get an IP / UA recorded.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_write(
    p_user_id    UUID,
    p_table_name TEXT,
    p_record_id  TEXT,
    p_operation  TEXT,
    p_old        JSONB,
    p_new        JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor             UUID := auth.uid();
    v_keys              TEXT[] := '{}';
    v_headers           JSONB;
    v_ip                TEXT;
    v_ua                TEXT;
    v_subject_email     TEXT;
    v_subject_username  TEXT;
    v_actor_email       TEXT;
    v_ignored           TEXT[] := ARRAY['updated_at', 'click_counter'];
BEGIN
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Subject lookup — captures the email/username at the time of the
    -- change (so renames/account email-changes don't rewrite history).
    SELECT email, username
      INTO v_subject_email, v_subject_username
      FROM public.users
     WHERE id = p_user_id;

    -- Actor lookup — skip the second SELECT in the common 'self' case.
    IF v_actor IS NOT NULL AND v_actor <> p_user_id THEN
        SELECT email INTO v_actor_email FROM public.users WHERE id = v_actor;
    ELSE
        v_actor_email := v_subject_email;
    END IF;

    -- Header chain. x-client-ip / x-client-ua are set by lib/apiHandler.ts
    -- for API-route mutations. The other entries are standard proxy /
    -- platform headers that PostgREST sees on every request, so they
    -- cover direct browser→Supabase mutations too.
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::JSONB;
        v_ip := COALESCE(
            v_headers ->> 'x-client-ip',
            v_headers ->> 'cf-connecting-ip',
            NULLIF(split_part(v_headers ->> 'x-forwarded-for', ',', 1), ''),
            v_headers ->> 'x-real-ip'
        );
        v_ua := COALESCE(
            v_headers ->> 'x-client-ua',
            v_headers ->> 'user-agent'
        );
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
        v_ua := NULL;
    END;

    IF p_operation = 'UPDATE' THEN
        SELECT COALESCE(array_agg(key), '{}')
          INTO v_keys
          FROM jsonb_each(p_new) AS e(key, value)
         WHERE p_new -> key IS DISTINCT FROM p_old -> key
           AND key <> ALL (v_ignored);

        IF array_length(v_keys, 1) IS NULL THEN
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.profile_audit_log
        (user_id, actor_id, actor_role,
         subject_email, subject_username, actor_email,
         table_name, record_id,
         operation, changed_keys, old_values, new_values,
         ip_address, user_agent)
    VALUES
        (p_user_id,
         v_actor,
         CASE
             WHEN v_actor IS NULL THEN 'system'
             WHEN v_actor = p_user_id THEN 'self'
             ELSE 'admin'
         END,
         v_subject_email,
         v_subject_username,
         v_actor_email,
         p_table_name,
         p_record_id,
         p_operation,
         COALESCE(v_keys, '{}'),
         p_old,
         p_new,
         v_ip,
         v_ua);
END;
$$;

-- ------------------------------------------------------------
-- 3. Backfill the new columns for any rows already in the table.
-- ------------------------------------------------------------
UPDATE public.profile_audit_log a
   SET subject_email    = u.email,
       subject_username = u.username
  FROM public.users u
 WHERE a.user_id = u.id
   AND a.subject_email IS NULL;

UPDATE public.profile_audit_log a
   SET actor_email = u.email
  FROM public.users u
 WHERE a.actor_id = u.id
   AND a.actor_email IS NULL;

-- ------------------------------------------------------------
-- 4. Retention
--
-- purge_profile_audit_log() deletes rows older than 365 days and returns
-- the count. Safe to call manually at any time; idempotent.
--
-- We then attempt to schedule it via pg_cron. If the extension isn't
-- enabled on this Supabase project the DO block swallows the error so the
-- migration still applies cleanly — the function is still callable, you
-- just need to schedule it yourself (Supabase dashboard → Extensions →
-- enable pg_cron, or hit the function from a Vercel cron endpoint).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_profile_audit_log(p_keep_days INTEGER DEFAULT 365)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted BIGINT;
BEGIN
    WITH del AS (
        DELETE FROM public.profile_audit_log
         WHERE created_at < now() - make_interval(days => p_keep_days)
        RETURNING 1
    )
    SELECT count(*) INTO v_deleted FROM del;
    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.purge_profile_audit_log(INTEGER) IS
    'Deletes profile_audit_log rows older than p_keep_days (default 365). '
    'Returns the number of rows deleted. Scheduled daily via pg_cron when available.';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Drop any prior schedule with the same name so re-running is idempotent.
        PERFORM cron.unschedule('purge-profile-audit-log-daily')
          WHERE EXISTS (
              SELECT 1 FROM cron.job WHERE jobname = 'purge-profile-audit-log-daily'
          );

        PERFORM cron.schedule(
            'purge-profile-audit-log-daily',
            '0 3 * * *',  -- every day at 03:00 UTC
            $cron$SELECT public.purge_profile_audit_log();$cron$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron unavailable or insufficient privileges to schedule.
    -- The purge function still exists and can be called manually.
    NULL;
END $$;
