import { withAdminAuthorization } from "@/lib/admin/http";
import {
  blockedIpCreateSchema,
  ipSchema,
  referencePageQuerySchema,
} from "@/lib/admin/route-input";
import {
  addBlockedIp,
  AdminRepositoryError,
  listBlockedIps,
  removeBlockedIp,
} from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

export const GET = withAdminAuthorization("security:read", async (request) => {
  const parsed = referencePageQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid pagination");
  return apiResponse.success(await listBlockedIps(parsed.data));
});

export const POST = withAdminAuthorization(
  "security:manage",
  async (request, { actor }) => {
    const parsed = blockedIpCreateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid IP address");
    try {
      return apiResponse.success(
        await addBlockedIp({
          ipAddress: parsed.data.ip_address,
          reason: parsed.data.reason ?? null,
          blockedBy: actor.id,
        }),
      );
    } catch (error) {
      if (error instanceof AdminRepositoryError && error.code === "23505") {
        return apiResponse.badRequest("This IP is already blocked");
      }
      throw error;
    }
  },
);

export const DELETE = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = ipSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiResponse.badRequest("Invalid IP address");
    await removeBlockedIp(parsed.data.ip_address);
    return apiResponse.success({ message: "IP unblocked successfully" });
  },
);
