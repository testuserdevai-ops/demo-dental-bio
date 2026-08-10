import Stripe from "stripe";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { deleteAuthUserById } from "@/lib/auth/account-authority-repository";
import { revalidatePublicProfileIdentityCache } from "@/lib/public-profile/cache-revalidation";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  if (!id)
    return apiResponse.badRequest("You are not authorized to this action!");

  // Verify the authenticated user is deleting their own account
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return apiResponse.unauthorized();
  }
  if (authUser.id !== id) {
    return apiResponse.forbidden();
  }

  const { data: customerData } = await supabase
    .from("users")
    .select("customer_id, username")
    .eq("id", id)
    .single();

  if (customerData?.customer_id) {
    await stripe.customers.del(customerData.customer_id);
  }

  try {
    await deleteAuthUserById(authUser.id);
  } catch (error) {
    return apiResponse.error(
      error instanceof Error ? error.message : "Auth user deletion failed",
      400,
    );
  }

  revalidatePublicProfileIdentityCache([customerData?.username]);

  return apiResponse.success({ status: "success" });
});
