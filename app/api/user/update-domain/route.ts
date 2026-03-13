import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

export const POST = withAuth(async (request, { supabase }) => {
  const { targetUserId, domain } = await request.json();

  const { data, error } = await supabase
    .from("users")
    .update({ domain })
    .eq("id", targetUserId);

  if (error) {
    return apiResponse.error("Failed to update user record", 500);
  }

  return apiResponse.success({ message: "Domain saved successfully!" });
});
