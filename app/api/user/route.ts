import { getEffectiveUserId } from '@/utils/user/getEffectiveUserId';
import { getUserIdByEmail } from '@/utils/user/getUserIdByEmail';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const POST = withAuth(async (request, { supabase }) => {
  const { targetUserId } = await request.json();

  const userId = await getEffectiveUserId({ targetUserId, supabase });

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return apiResponse.error('User ID is required', 400);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const body = await request.json();

  const { targetUserId } = body;

  if (user.subscription_status !== "PREMIUM PRO")
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("You are not authorized to this action!");

  const userId = targetUserId || user.id;
  const use_dental_brand = body.use_dental_brand ?? true;

  const { data, error } = await supabase
    .from('users')
    .update({ use_dental_brand })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { email } = await request.json();

  if (user.role !== "admin")
    return apiResponse.error("You are not authorized to this action!");

  const userId = await getUserIdByEmail(email);

  const { data: customerData } = await supabase
    .from('users')
    .select('customer_id')
    .eq('email', email)
    .single();

  if (customerData?.customer_id) {
    await stripe.customers.del(customerData.customer_id);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId!);

  if (authError) {
    return apiResponse.error(authError.message, 400);
  }

  return apiResponse.success({ status: 'success' });
});
