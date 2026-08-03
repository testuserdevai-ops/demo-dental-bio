import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";

export const POST = withAuth(async (request, { supabase, user }) => {
  const { targetUserId, isVerified } = await request.json();

  if (!targetUserId || typeof isVerified !== "boolean") {
    return apiResponse.badRequest("targetUserId and isVerified are required");
  }

  if (user.role !== "admin") {
    return apiResponse.forbidden();
  }

  const { data, error } = await supabase
    .from("users")
    .update({ isVerified })
    .eq("id", targetUserId)
    .select("*")
    .single();

  if (error) {
    return apiResponse.error(error.message, 400);
  }

  return apiResponse.success({ user: data });
});
