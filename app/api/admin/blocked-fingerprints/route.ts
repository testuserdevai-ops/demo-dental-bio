import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

// GET - List all blocked fingerprints with associated users
export const GET = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { data: blocked, error } = await supabaseAdmin
        .from('blocked_fingerprints')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    // For each blocked fingerprint, find which users have used that device
    const fingerprints = blocked?.map((b: any) => b.fingerprint) || [];
    let usersByFingerprint: Record<string, any[]> = {};

    if (fingerprints.length > 0) {
        const { data: links } = await supabaseAdmin
            .from('user_device_fingerprints')
            .select('fingerprint, user_id, users(email, username, first_name, last_name)')
            .in('fingerprint', fingerprints);

        if (links) {
            for (const link of links) {
                if (!usersByFingerprint[link.fingerprint]) {
                    usersByFingerprint[link.fingerprint] = [];
                }
                usersByFingerprint[link.fingerprint].push(link.users);
            }
        }
    }

    const result = blocked?.map((b: any) => ({
        ...b,
        associated_users: usersByFingerprint[b.fingerprint] || [],
    }));

    return apiResponse.success(result);
});

// POST - Block a fingerprint
export const POST = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { fingerprint, reason } = await request.json();

    if (!fingerprint) {
        return apiResponse.badRequest('Fingerprint is required');
    }

    const { data, error } = await supabaseAdmin
        .from('blocked_fingerprints')
        .insert({
            fingerprint,
            reason: reason || null,
            blocked_by: user.id,
        })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            return apiResponse.badRequest('This fingerprint is already blocked');
        }
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success(data);
});

// DELETE - Unblock a fingerprint
export const DELETE = withAuth(async (request, { user }) => {
    if (user.role !== 'admin') {
        return apiResponse.forbidden();
    }

    const { fingerprint } = await request.json();

    if (!fingerprint) {
        return apiResponse.badRequest('Fingerprint is required');
    }

    const { error } = await supabaseAdmin
        .from('blocked_fingerprints')
        .delete()
        .eq('fingerprint', fingerprint);

    if (error) {
        return apiResponse.error(error.message, 500);
    }

    return apiResponse.success({ message: 'Fingerprint unblocked successfully' });
});
