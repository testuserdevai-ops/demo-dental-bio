import { withAdminAuthorization } from "@/lib/admin/http";
import { profileAuditQuerySchema } from "@/lib/admin/route-input";
import { listProfileAuditLog } from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

export const GET = withAdminAuthorization(
  "security:audit:read",
  async (request) => {
    const parsed = profileAuditQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      return apiResponse.badRequest("Invalid audit log filters");
    const { page, limit, table_name, operation, actor_role, email } =
      parsed.data;
    return apiResponse.success(
      await listProfileAuditLog(
        { page, limit },
        {
          tableName: table_name,
          operation,
          actorRole: actor_role,
          email,
        },
      ),
    );
  },
);
