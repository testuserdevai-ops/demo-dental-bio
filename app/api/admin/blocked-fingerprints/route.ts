import { withAdminAuthorization } from "@/lib/admin/http";
import {
  blockedFingerprintCreateSchema,
  fingerprintSchema,
  referencePageQuerySchema,
} from "@/lib/admin/route-input";
import {
  addBlockedFingerprint,
  AdminRepositoryError,
  listBlockedFingerprints,
  removeBlockedFingerprint,
} from "@/lib/admin/security-repository";
import { apiResponse } from "@/lib/apiResponse";

export const GET = withAdminAuthorization("security:read", async (request) => {
  const parsed = referencePageQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid pagination");
  return apiResponse.success(await listBlockedFingerprints(parsed.data));
});

export const POST = withAdminAuthorization(
  "security:manage",
  async (request, { actor }) => {
    const parsed = blockedFingerprintCreateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid fingerprint");
    try {
      return apiResponse.success(
        await addBlockedFingerprint({
          fingerprint: parsed.data.fingerprint,
          reason: parsed.data.reason ?? null,
          blockedBy: actor.id,
        }),
      );
    } catch (error) {
      if (error instanceof AdminRepositoryError && error.code === "23505") {
        return apiResponse.badRequest("This fingerprint is already blocked");
      }
      throw error;
    }
  },
);

export const DELETE = withAdminAuthorization(
  "security:manage",
  async (request) => {
    const parsed = fingerprintSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid fingerprint");
    await removeBlockedFingerprint(parsed.data.fingerprint);
    return apiResponse.success({
      message: "Fingerprint unblocked successfully",
    });
  },
);
