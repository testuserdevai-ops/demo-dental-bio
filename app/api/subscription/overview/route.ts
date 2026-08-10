import { apiResponse } from "@/lib/apiResponse";
import { withAuth } from "@/lib/apiHandler";
import { getSubscriptionOverview } from "@/lib/subscription/overview";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { supabase }) => {
  const userId = await getEffectiveUserId({ supabase });
  if (!userId) return apiResponse.unauthorized();

  const overview = await getSubscriptionOverview(userId);
  if (!overview) return apiResponse.error("User not found", 404);
  return apiResponse.success(overview);
});
