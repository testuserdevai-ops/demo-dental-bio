import { getUserIdByEmail } from "@/utils/user/getUserIdByEmail";
import supabaseAdmin from "@/utils/supabase/supabaseAdmin";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import {
  getDentalBrandEntitlementAuthority,
  setDentalBrandAuthority,
} from "@/lib/dashboard/authority-write";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const brandingUpdateSchema = z
  .object({
    targetUserId: z.string().uuid().nullable().optional(),
    use_dental_brand: z.boolean(),
  })
  .strict();

export const PUT = withAuth(async (request, { user }) => {
  const body = await request.json().catch(() => null);
  const parsed = brandingUpdateSchema.safeParse(body);
  if (!parsed.success) return apiResponse.error("Invalid request body", 400);

  const { targetUserId, use_dental_brand } = parsed.data;

  if (targetUserId && user.role !== "admin") return apiResponse.forbidden();

  const userId = targetUserId ?? user.id;
  try {
    const entitlement = await getDentalBrandEntitlementAuthority(userId);
    if (entitlement?.subscription_status !== "PREMIUM PRO")
      return apiResponse.forbidden();

    return apiResponse.success(
      await setDentalBrandAuthority(userId, use_dental_brand),
    );
  } catch (error) {
    return apiResponse.error(
      error instanceof Error ? error.message : "Branding update failed",
      400,
    );
  }
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { email } = await request.json();

  if (user.role !== "admin")
    return apiResponse.error("You are not authorized to this action!");

  const userId = await getUserIdByEmail(email);

  const { data: customerData } = await supabase
    .from("users")
    .select("customer_id")
    .eq("email", email)
    .single();

  if (customerData?.customer_id) {
    await stripe.customers.del(customerData.customer_id);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
    userId!,
  );

  if (authError) {
    return apiResponse.error(authError.message, 400);
  }

  return apiResponse.success({ status: "success" });
});
