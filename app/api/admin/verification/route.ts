import { withAdminAuthorization } from "@/lib/admin/http";
import { verificationUpdateSchema } from "@/lib/admin/route-input";
import { apiResponse } from "@/lib/apiResponse";
import { setUserVerification } from "@/lib/dashboard/authority-write";

export const POST = withAdminAuthorization(
  "verification:manage",
  async (request) => {
    const parsed = verificationUpdateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return apiResponse.badRequest("targetUserId and isVerified are required");
    }

    const data = await setUserVerification(
      parsed.data.targetUserId,
      parsed.data.isVerified,
    );

    return apiResponse.success({ user: data });
  },
);
