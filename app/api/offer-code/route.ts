import { withAuth, withOptionalAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
    // Non-admins only get the offer_code field (for validation during registration)
    // Admins get all fields
    const selectFields = user?.role === 'admin' ? '*' : 'offer_code';

    const { data: offerCodeData, error: offerCodeError } = await supabase
        .from('offer_codes')
        .select(selectFields)

    if (offerCodeError) {
        return apiResponse.error(offerCodeError.message, 400);
    }

    return apiResponse.success(offerCodeData);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
    const { id, value } = await request.json();

    if (user.role !== 'admin')
        return apiResponse.forbidden();

    const { data: offerCodeData, error: offerCodeError } = await supabase
        .from('offer_codes')
        .update(value)
        .eq('id', id)

    if (offerCodeError) {
        return apiResponse.error(offerCodeError.message, 400);
    }

    return apiResponse.success({ status: "success" });
});

export const POST = withAuth(async (request, { supabase, user }) => {
    const newOffer = await request.json();

    if (user.role !== 'admin')
        return apiResponse.forbidden();

    const { error } = await supabase
        .from('offer_codes')
        .insert(newOffer)

    if (error) {
        return apiResponse.error(error.message, 400);
    }

    return apiResponse.success({ status: "success" });
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
    const { id } = await request.json();

    if (user.role !== 'admin')
        return apiResponse.forbidden();

    const { error } = await supabase
        .from('offer_codes')
        .delete()
        .eq('id', id)

    if (error) {
        return apiResponse.error(error.message, 400);
    }

    return apiResponse.success({ status: 'success' });
});
