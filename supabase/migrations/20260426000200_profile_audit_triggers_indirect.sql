-- ============================================================
-- Profile audit triggers — indirect tables
--
-- For tables where the profile owner's user_id must be resolved through a
-- join chain (socials, link_groups, dentistry_links, links), each table
-- gets its own wrapper trigger function that resolves user_id and then
-- delegates to the shared write helper public.fn_audit_write().
--
-- The shared helper centralises the diff / ignore-list / insert logic so
-- that this migration and the generic per-table function from migration
-- 20260426000000 stay in lock-step.
-- ============================================================

-- ------------------------------------------------------------
-- Shared write helper. Called by every audit trigger function.
--
-- Behaviour:
--   * INSERT  — always logged (changed_keys is empty).
--   * UPDATE  — diff NEW vs OLD; if only updated_at / click_counter
--               differ, no row is written.
--   * DELETE  — always logged (changed_keys is empty).
--
-- If p_user_id is NULL the call is a no-op (we refuse to write
-- ownerless rows because RLS keys reads off user_id).
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
    v_actor   UUID := auth.uid();
    v_keys    TEXT[] := '{}';
    v_headers JSONB;
    v_ip      TEXT;
    v_ua      TEXT;
    v_ignored TEXT[] := ARRAY['updated_at', 'click_counter'];
BEGIN
    IF p_user_id IS NULL THEN
        RETURN;
    END IF;

    -- PostgREST exposes incoming HTTP headers as a JSON setting.
    -- The API layer forwards real client IP / UA via x-client-ip / x-client-ua
    -- (see lib/apiHandler.ts). Direct-from-browser Supabase calls won't set
    -- these, so v_ip / v_ua stay NULL on those mutation paths.
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::JSONB;
        v_ip := v_headers ->> 'x-client-ip';
        v_ua := v_headers ->> 'x-client-ua';
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
        (user_id, actor_id, actor_role, table_name, record_id,
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

COMMENT ON FUNCTION public.fn_audit_write(UUID, TEXT, TEXT, TEXT, JSONB, JSONB) IS
    'Shared writer for profile_audit_log. Called by all audit trigger functions. '
    'Skips writes when p_user_id is NULL or when an UPDATE only touches '
    'updated_at / click_counter.';

-- ------------------------------------------------------------
-- Re-define the generic trigger fn from migration 20260426000000
-- to delegate to fn_audit_write(). Behaviour is unchanged.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_profile_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new     JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
BEGIN
    v_user_id := COALESCE(
        (v_new ->> TG_ARGV[0])::UUID,
        (v_old ->> TG_ARGV[0])::UUID
    );

    PERFORM public.fn_audit_write(
        v_user_id,
        TG_TABLE_NAME,
        COALESCE(v_new ->> TG_ARGV[1], v_old ->> TG_ARGV[1]),
        TG_OP,
        v_old,
        v_new
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- socials  — resolve user_id via dentistries.dentistry_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_socials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new     JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
    v_dent    UUID := COALESCE(NEW.dentistry_id, OLD.dentistry_id);
    v_pk      TEXT := COALESCE(NEW.dentistry_socials_id, OLD.dentistry_socials_id)::TEXT;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.dentistries
    WHERE dentistry_id = v_dent;

    PERFORM public.fn_audit_write(
        v_user_id, TG_TABLE_NAME, v_pk, TG_OP, v_old, v_new
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_socials ON public.socials;
CREATE TRIGGER trg_audit_socials
    AFTER INSERT OR UPDATE OR DELETE ON public.socials
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_socials();

-- ============================================================
-- link_groups  — resolve user_id via dentistries.dentistry_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_link_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new     JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
    v_dent    UUID := COALESCE(NEW.dentistry_id, OLD.dentistry_id);
    v_pk      TEXT := COALESCE(NEW.link_group_id, OLD.link_group_id)::TEXT;
BEGIN
    SELECT user_id INTO v_user_id
    FROM public.dentistries
    WHERE dentistry_id = v_dent;

    PERFORM public.fn_audit_write(
        v_user_id, TG_TABLE_NAME, v_pk, TG_OP, v_old, v_new
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_link_groups ON public.link_groups;
CREATE TRIGGER trg_audit_link_groups
    AFTER INSERT OR UPDATE OR DELETE ON public.link_groups
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_link_groups();

-- ============================================================
-- dentistry_links  (junction)  — resolve via link_groups.dentistry_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_dentistry_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new     JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
    v_lg      UUID := COALESCE(NEW.link_group_id, OLD.link_group_id);
    v_pk      TEXT := COALESCE(NEW.dentistry_links_id, OLD.dentistry_links_id)::TEXT;
BEGIN
    SELECT d.user_id INTO v_user_id
    FROM public.dentistries d
    JOIN public.link_groups lg ON lg.dentistry_id = d.dentistry_id
    WHERE lg.link_group_id = v_lg;

    PERFORM public.fn_audit_write(
        v_user_id, TG_TABLE_NAME, v_pk, TG_OP, v_old, v_new
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_dentistry_links ON public.dentistry_links;
CREATE TRIGGER trg_audit_dentistry_links
    AFTER INSERT OR UPDATE OR DELETE ON public.dentistry_links
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_dentistry_links();

-- ============================================================
-- links  — resolve via dentistry_links → link_groups → dentistries
--
-- A link's owner is whichever dentistry includes it via the junction.
-- If the junction row doesn't exist yet (e.g. links INSERTed before
-- dentistry_links is wired up) we fall back to auth.uid() so the
-- create event is still attributed to the acting user.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_old     JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    v_new     JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
    v_link    UUID := COALESCE(NEW.link_id, OLD.link_id);
    v_pk      TEXT := v_link::TEXT;
BEGIN
    SELECT d.user_id INTO v_user_id
    FROM public.dentistries d
    JOIN public.link_groups lg ON lg.dentistry_id = d.dentistry_id
    JOIN public.dentistry_links dl ON dl.link_group_id = lg.link_group_id
    WHERE dl.link_id = v_link
    LIMIT 1;

    -- Fallback: brand-new link without a junction row yet — attribute
    -- to the current authenticated user if available.
    IF v_user_id IS NULL THEN
        v_user_id := auth.uid();
    END IF;

    PERFORM public.fn_audit_write(
        v_user_id, TG_TABLE_NAME, v_pk, TG_OP, v_old, v_new
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_links ON public.links;
CREATE TRIGGER trg_audit_links
    AFTER INSERT OR UPDATE OR DELETE ON public.links
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_links();
