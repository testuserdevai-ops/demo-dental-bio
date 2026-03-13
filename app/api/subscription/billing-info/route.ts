import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const dynamic = 'force-dynamic';

// Get billing information
export const GET = withAuth(async (request, { supabase }) => {
  const userId = await getEffectiveUserId({ supabase });

  if (!userId) {
    return apiResponse.unauthorized();
  }

  // Get user's customer_id
  const { data: user } = await supabase
    .from("users")
    .select("customer_id")
    .eq("id", userId)
    .single();

  if (!user?.customer_id) {
    return apiResponse.error("Customer not found", 404);
  }

  // Retrieve customer from Stripe
  const customer = await stripe.customers.retrieve(user.customer_id);

  // Correct check for deleted customers
  if ("deleted" in customer && customer.deleted) {
    return apiResponse.error("Customer not found", 404);
  }

  return apiResponse.success({
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    tax: customer.tax,
  });
});

// Update billing information
export const PUT = withAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");
  const body = await request.json();

  const userId = await getEffectiveUserId({ supabase, targetUserId: targetUserId || undefined });

  if (!userId) {
    return apiResponse.unauthorized();
  }

  // Get user's customer_id
  const { data: user } = await supabase
    .from("users")
    .select("customer_id")
    .eq("id", userId)
    .single();

  if (!user?.customer_id) {
    return apiResponse.error("Customer not found", 404);
  }

  // Update customer in Stripe
  const updateData: Stripe.CustomerUpdateParams = {};

  if (body.name) updateData.name = body.name;
  if (body.email) updateData.email = body.email;
  if (body.phone) updateData.phone = body.phone;
  if (body.address) updateData.address = body.address;
  if (body.tax) updateData.tax = body.tax;

  await stripe.customers.update(user.customer_id, updateData);

  return apiResponse.success({ success: true });
});
