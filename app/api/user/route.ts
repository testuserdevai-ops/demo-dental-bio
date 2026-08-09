import { withAuth } from "@/lib/apiHandler";
import { deleteAuthUserForAdmin } from "@/lib/admin/user-deletion-repository";
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
const adminUserDeleteSchema = z
  .object({
    id: z.uuid(),
    email: z.email().max(320),
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
  if (user.role !== "admin") return apiResponse.forbidden();
  const parsed = adminUserDeleteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid user deletion.");

  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("id,email,customer_id")
    .eq("id", parsed.data.id)
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (targetError) return apiResponse.error("Unable to resolve user.", 400);
  if (!target) return apiResponse.error("User not found.", 404);

  try {
    if (target.customer_id) {
      await stripe.customers.del(target.customer_id);
    }
    await deleteAuthUserForAdmin(target.id);
  } catch {
    return apiResponse.error("Unable to delete user.", 502);
  }

  return apiResponse.success({ status: "success" });
});
