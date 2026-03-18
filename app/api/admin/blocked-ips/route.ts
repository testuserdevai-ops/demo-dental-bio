import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

// GET - List blocked IPs with pagination and associated users
export const GET = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '25');

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data: blocked, count, error } = await supabaseAdmin
        .from('blocked_ips')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    // For each blocked IP, find which users have used that IP
    const ipAddresses = blocked?.map((b: any) => b.ip_address) || [];
    let usersByIp: Record<string, any[]> = {};

    if (ipAddresses.length > 0) {
        const { data: links } = await supabaseAdmin
            .from('user_ips')
            .select('ip_address, user_id, users(email, username, first_name, last_name)')
            .in('ip_address', ipAddresses);

        if (links) {
            for (const link of links) {
                if (!usersByIp[link.ip_address]) {
                    usersByIp[link.ip_address] = [];
                }
                usersByIp[link.ip_address].push(link.users);
            }
        }
    }

    const result = blocked?.map((b: any) => ({
        ...b,
        associated_users: usersByIp[b.ip_address] || [],
    }));

    return apiResponse.success({ data: result, count });
});

// POST - Block an IP
export const POST = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { ip_address, reason } = await request.json();

    if (!ip_address) {
        return apiResponse.badRequest('IP address is required');
    }

    const { data, error } = await supabaseAdmin
        .from('blocked_ips')
        .insert({
            ip_address,
            reason: reason || null,
            blocked_by: user.id,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return apiResponse.badRequest('This IP is already blocked');
        }
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// DELETE - Unblock an IP
export const DELETE = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { ip_address } = await request.json();

    if (!ip_address) {
        return apiResponse.badRequest('IP address is required');
    }

    const { error } = await supabaseAdmin
        .from('blocked_ips')
        .delete()
        .eq('ip_address', ip_address);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success({ message: 'IP unblocked successfully' });
});
