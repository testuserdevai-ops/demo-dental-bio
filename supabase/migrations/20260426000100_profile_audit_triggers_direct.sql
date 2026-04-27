-- ============================================================
-- Profile audit triggers — direct-FK tables
--
-- Attaches the generic public.fn_audit_profile_change() trigger to the
-- profile-related tables where the profile owner's user_id lives directly
-- on the row. Indirect tables (socials, link_groups, links, dentistry_links)
-- need per-table wrapper functions and are handled in a follow-up migration.
--
-- Each trigger passes two args to the generic function:
--   TG_ARGV[0] = column on this table that holds the profile owner user_id
--   TG_ARGV[1] = column on this table that holds the row's primary key
-- ============================================================

-- users: the row IS the profile owner. id is both the user_id and the PK.
DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_profile_change('id', 'id');

-- dentistries: 1-to-1 with users via user_id; PK is dentistry_id.
DROP TRIGGER IF EXISTS trg_audit_dentistries ON public.dentistries;
CREATE TRIGGER trg_audit_dentistries
    AFTER INSERT OR UPDATE OR DELETE ON public.dentistries
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_profile_change('user_id', 'dentistry_id');

-- galleries: before/after image pairs. user_id direct, PK is id (bigint).
DROP TRIGGER IF EXISTS trg_audit_galleries ON public.galleries;
CREATE TRIGGER trg_audit_galleries
    AFTER INSERT OR UPDATE OR DELETE ON public.galleries
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_profile_change('user_id', 'id');

-- general_galleries: single image entries. user_id direct, PK is id (bigint).
DROP TRIGGER IF EXISTS trg_audit_general_galleries ON public.general_galleries;
CREATE TRIGGER trg_audit_general_galleries
    AFTER INSERT OR UPDATE OR DELETE ON public.general_galleries
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_profile_change('user_id', 'id');

-- reviews: testimonials/reviews on the profile. user_id direct, PK is id (bigint).
DROP TRIGGER IF EXISTS trg_audit_reviews ON public.reviews;
CREATE TRIGGER trg_audit_reviews
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_audit_profile_change('user_id', 'id');
