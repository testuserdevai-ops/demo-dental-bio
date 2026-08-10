import { withAdminAuthorization } from "@/lib/admin/http";
import { securityUsersRequestSchema } from "@/lib/admin/route-input";
import {
  listAdminUsers,
  listSecurityUsers,
  listUsersForAdmin,
} from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

export const POST = withAdminAuthorization(
  "security:users:read",
  async (request, { actor }) => {
    const parsed = securityUsersRequestSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid user filters");
    const { page, limit, filters } = parsed.data;
    return apiResponse.success(
      await (actor.role === "admin" ? listAdminUsers : listSecurityUsers)(
        { page, limit },
        {
          email: filters.email,
          username: filters.username,
          firstName: filters.first_name,
          lastName: filters.last_name,
          isVerified:
            filters.isVerified === "true"
              ? true
              : filters.isVerified === "false"
                ? false
                : filters.isVerified,
          subscriptionStatus: filters.subscription_status,
        },
      ),
    );
  },
);

export const GET = withAdminAuthorization("users:manage", async () =>
  apiResponse.success({ data: await listUsersForAdmin() }),
);
