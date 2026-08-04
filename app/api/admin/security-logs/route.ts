import { withAdminAuthorization } from "@/lib/admin/http";
import { securityLogQuerySchema } from "@/lib/admin/route-input";
import { listSecurityLogs } from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

export const GET = withAdminAuthorization("security:read", async (request) => {
  const parsed = securityLogQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success)
    return apiResponse.badRequest("Invalid security log filters");
  const { page, limit, event_type, email, ip } = parsed.data;
  return apiResponse.success(
    await listSecurityLogs(
      { page, limit },
      { eventType: event_type, email, ip },
    ),
  );
});
