import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { setUserVerification } from "@/lib/dashboard/authority-write";

export const POST = withAuth(async (request, { user }) => {
  const { targetUserId, isVerified } = await request.json();

  if (!targetUserId || typeof isVerified !== "boolean") {
    return apiResponse.badRequest("targetUserId and isVerified are required");
  }

  if (user.role !== "admin") {
    return apiResponse.forbidden();
  }

  const data = await setUserVerification(targetUserId, isVerified);

  return apiResponse.success({ user: data });
});
