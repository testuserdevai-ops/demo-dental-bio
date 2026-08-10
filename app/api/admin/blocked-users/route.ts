import { withAdminAuthorization } from "@/lib/admin/http";
import {
  blockUserSchema,
  pageQuerySchema,
  userIdSchema,
} from "@/lib/admin/route-input";
import {
  blockUser,
  listBlockedUsers,
  unblockUser,
} from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";
import { revalidatePublicProfileIdentityCache } from "@/lib/public-profile/cache-revalidation";

export const GET = withAdminAuthorization("security:read", async (request) => {
  const parsed = pageQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid pagination");
  return apiResponse.success(await listBlockedUsers(parsed.data));
});

export const POST = withAdminAuthorization(
  "security:manage",
  async (request, { actor }) => {
    const parsed = blockUserSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid user");
    const blockedUser = await blockUser({
      userId: parsed.data.user_id,
      reason: parsed.data.reason ?? null,
      blockedBy: actor.id,
      blockedAt: new Date().toISOString(),
    });
    revalidatePublicProfileIdentityCache([blockedUser?.username]);
    return apiResponse.success(blockedUser);
  },
);

export const DELETE = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = userIdSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid user");
    const unblockedUser = await unblockUser(parsed.data.user_id);
    revalidatePublicProfileIdentityCache([unblockedUser?.username]);
    return apiResponse.success({ message: "User unblocked successfully" });
  },
);
