import { withAdminAuthorization } from "@/lib/admin/http";
import {
  blockedDomainCreateSchema,
  blockedDomainUpdateSchema,
  idSchema,
  pageQuerySchema,
} from "@/lib/admin/route-input";
import {
  addBlockedDomain,
  AdminRepositoryError,
  listBlockedDomains,
  removeBlockedDomain,
  setBlockedDomainActive,
} from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

function parseQuery(request: Request) {
  return pageQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
}

export const GET = withAdminAuthorization("security:read", async (request) => {
  const parsed = parseQuery(request);
  if (!parsed.success) return apiResponse.badRequest("Invalid pagination");
  return apiResponse.success(await listBlockedDomains(parsed.data));
});

export const POST = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = blockedDomainCreateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid domain");
    try {
      return apiResponse.success(await addBlockedDomain(parsed.data.domain));
    } catch (error) {
      if (error instanceof AdminRepositoryError && error.code === "23505") {
        return apiResponse.badRequest("This domain is already blocked");
      }
      throw error;
    }
  },
);

export const PATCH = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = blockedDomainUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid domain update");
    return apiResponse.success(
      await setBlockedDomainActive(parsed.data.id, parsed.data.is_active),
    );
  },
);

export const DELETE = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = idSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiResponse.badRequest("Invalid domain id");
    await removeBlockedDomain(parsed.data.id);
    return apiResponse.success({ message: "Domain removed successfully" });
  },
);
