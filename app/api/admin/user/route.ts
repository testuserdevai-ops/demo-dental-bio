import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import {
  AdminDashboardUserReadError,
  readAdminDashboardUser,
} from "@/lib/dashboard/admin-user-read";

export const GET = withAuth(async (request, { supabase, user }) => {
  const targetUserId = new URL(request.url).searchParams.get("targetUserId");

  try {
    const data = await readAdminDashboardUser(
      user,
      targetUserId,
      async (id) => {
        const { data, error } = await supabase
          .from("users")
          .select("id, username, email, isVerified, role")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return data ? { ...data, isVerified: data.isVerified ?? false } : null;
      },
    );
    return apiResponse.success(data);
  } catch (error) {
    if (!(error instanceof AdminDashboardUserReadError)) throw error;
    if (error.code === "UNAUTHENTICATED") return apiResponse.unauthorized();
    if (error.code === "FORBIDDEN") return apiResponse.forbidden();
    if (error.code === "INVALID_TARGET") {
      return apiResponse.badRequest("targetUserId must be a UUID");
    }
    return apiResponse.error("User not found", 404);
  }
});
