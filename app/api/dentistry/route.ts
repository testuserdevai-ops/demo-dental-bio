import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

export const POST = withAuth(async (request, { supabase }) => {
  const { targetUserId } = await request.json();

  const userId = await getEffectiveUserId({ targetUserId, supabase });

  const { data, error } = await supabase
    .from("dentistries")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return apiResponse.error("User ID is required", 400);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase }) => {
  const { id } = await request.json();

  // Verify the authenticated user owns this dentistry
  const userId = await getEffectiveUserId({ supabase, targetUserId: id });

  const { error } = await supabase
    .from("dentistries")
    .delete()
    .eq("user_id", userId);

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success({ status: "success" });
});
