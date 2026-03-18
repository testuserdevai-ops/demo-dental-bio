import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

// GET - List blocked users with pagination
export const GET = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '25');

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, count, error } = await supabaseAdmin
        .from('users')
        .select('id, email, username, first_name, last_name, is_blocked, blocked_reason, blocked_at, blocked_by', { count: 'exact' })
        .eq('is_blocked', true)
        .order('blocked_at', { ascending: false })
        .range(start, end);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success({ data, count });
});

// POST - Block a user
export const POST = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { user_id, reason } = await request.json();

    if (!user_id) {
        return apiResponse.badRequest('User ID is required');
    }

    const { data, error } = await supabaseAdmin
        .from('users')
        .update({
            is_blocked: true,
            blocked_reason: reason || null,
            blocked_at: new Date().toISOString(),
            blocked_by: user.id,
        })
        .eq('id', user_id)
        .select('id, email, username, is_blocked, blocked_reason, blocked_at')
        .single();

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// DELETE - Unblock a user
export const DELETE = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { user_id } = await request.json();

    if (!user_id) {
        return apiResponse.badRequest('User ID is required');
    }

    const { error } = await supabaseAdmin
        .from('users')
        .update({
            is_blocked: false,
            blocked_reason: null,
            blocked_at: null,
            blocked_by: null,
        })
        .eq('id', user_id);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success({ message: 'User unblocked successfully' });
});
