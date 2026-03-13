import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

export const POST = withAuth(async (request, { supabase, user }) => {
  const { targetUserId, domain } = await request.json();

  // Non-admins can only update their own domain
  if (targetUserId && targetUserId !== user.id && user.role !== 'admin') {
    return apiResponse.forbidden();
  }

  const userId = targetUserId || user.id;

  const { data, error } = await supabase
    .from("users")
    .update({ domain })
    .eq("id", userId);

  if (error) {
    return apiResponse.error("Failed to update user record", 500);
  }

  return apiResponse.success({ message: "Domain saved successfully!" });
});
