import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import Stripe from 'stripe';
import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const POST = withAuth(async (request, { supabase, user }) => {
    const { id } = await request.json();

    if (!id)
      return apiResponse.badRequest("You are not authorized to this action!");

    // Verify the authenticated user is deleting their own account
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return apiResponse.unauthorized();
    }
    if (authUser.id !== id) {
      return apiResponse.forbidden();
    }

    const { data: customerData } = await supabase
      .from('users')
      .select('customer_id')
      .eq('id', id)
      .single();

    if (customerData?.customer_id) {
      stripe.customers.del(customerData.customer_id);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteError) {
      return apiResponse.error(deleteError.message, 400);
    }

    return apiResponse.success({ status: 'success' });
});
