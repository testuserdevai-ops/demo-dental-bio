import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

// GET - List all blocked domains
export const GET = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { data, error } = await supabaseAdmin
        .from('blocked_email_domains')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// POST - Add a new blocked domain
export const POST = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { domain } = await request.json();

    if (!domain) {
        return apiResponse.badRequest('Domain is required');
    }

    const cleanDomain = domain.trim().toLowerCase();

    const { data, error } = await supabaseAdmin
        .from('blocked_email_domains')
        .insert({ domain: cleanDomain })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return apiResponse.badRequest('This domain is already blocked');
        }
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// PATCH - Toggle domain active status
export const PATCH = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { id, is_active } = await request.json();

    if (!id || typeof is_active !== 'boolean') {
        return apiResponse.badRequest('id and is_active (boolean) are required');
    }

    const { data, error } = await supabaseAdmin
        .from('blocked_email_domains')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// DELETE - Remove a blocked domain
export const DELETE = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { id } = await request.json();

    if (!id) {
        return apiResponse.badRequest('Domain id is required');
    }

    const { error } = await supabaseAdmin
        .from('blocked_email_domains')
        .delete()
        .eq('id', id);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success({ message: 'Domain removed successfully' });
});
