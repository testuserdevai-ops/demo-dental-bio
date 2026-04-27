import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

// GET — paginated, filterable feed of profile change events.
// Admin-only. Bypasses RLS via supabaseAdmin so we can see every user's history.
export const GET = withAuth(async (request, { user }) => {
    if (user.role !== 'admin' && user.role !== 'security_admin') {
        return apiResponse.forbidden();
    }

    const url = new URL(request.url);
    const page       = parseInt(url.searchParams.get('page')       || '1');
    const limit      = parseInt(url.searchParams.get('limit')      || '25');
    const tableName  = url.searchParams.get('table_name')  || '';
    const operation  = url.searchParams.get('operation')   || '';
    const actorRole  = url.searchParams.get('actor_role')  || '';
    const email      = url.searchParams.get('email')       || '';

    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    // If the admin is filtering by email, resolve email → user_ids first and
    // restrict the audit query to those subjects. ilike for partial match.
    let userIdFilter: string[] | null = null;
    if (email) {
        const { data: matches, error: lookupErr } = await supabaseAdmin
            .from('users')
            .select('id')
            .ilike('email', `%${email}%`)
            .limit(500);

        if (lookupErr) return apiResponse.error(lookupErr.message, 500);

        userIdFilter = (matches ?? []).map((u: { id: string }) => u.id);
        if (userIdFilter.length === 0) {
            // No users match this email — short-circuit with empty page.
            return apiResponse.success({ data: [], count: 0 });
        }
    }

    let query = supabaseAdmin
        .from('profile_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (tableName) query = query.eq('table_name', tableName);
    if (operation) query = query.eq('operation',  operation);
    if (actorRole) query = query.eq('actor_role', actorRole);
    if (userIdFilter) query = query.in('user_id', userIdFilter);

    const { data: rows, count, error } = await query.range(start, end);
    if (error) return apiResponse.error(error.message, 500);

    // Enrich with user details so the UI can show email / username without
    // joining client-side. We collect unique ids and fetch in one round trip.
    const ids = Array.from(new Set([
        ...(rows ?? []).map((r: any) => r.user_id).filter(Boolean),
        ...(rows ?? []).map((r: any) => r.actor_id).filter(Boolean),
    ])) as string[];

    let usersById: Record<string, any> = {};
    if (ids.length > 0) {
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, email, username, first_name, last_name')
            .in('id', ids);

        usersById = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]));
    }

    const enriched = (rows ?? []).map((r: any) => ({
        ...r,
        subject: usersById[r.user_id] ?? null,
        actor:   r.actor_id ? usersById[r.actor_id] ?? null : null,
    }));

    return apiResponse.success({ data: enriched, count });
});
