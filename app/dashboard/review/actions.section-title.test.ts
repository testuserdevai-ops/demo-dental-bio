import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000001",
  dentistryId: "00000000-0000-4000-8000-000000000002",
  username: "owner-profile",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const rpc = mock(async () => ({
  data: [{ external_review_section_title: "More owner reviews" }],
  error: null,
}));
const invalidatePublicProfileCache = mock(() => undefined);
const invalidatePublicProfileIdentityCache = mock(() => undefined);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
}));

const { saveExternalReviewSectionTitle } = await import("./actions");

describe("saveExternalReviewSectionTitle", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockClear();
    rpc.mockClear();
    rpc.mockResolvedValue({
      data: [{ external_review_section_title: "More owner reviews" }],
      error: null,
    });
    invalidatePublicProfileCache.mockClear();
    invalidatePublicProfileIdentityCache.mockClear();
  });

  it("uses the authorized dentistry RPC and invalidates content plus identity", async () => {
    const result = await saveExternalReviewSectionTitle(undefined, {
      externalReviewSectionTitle: "  More owner reviews  ",
    });

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(undefined);
    expect(rpc).toHaveBeenCalledWith("save_external_review_section_title", {
      p_dentistry_id: scope.dentistryId,
      p_external_review_section_title: "More owner reviews",
    });
    expect(result).toEqual({
      ok: true,
      data: { externalReviewSectionTitle: "More owner reviews" },
    });
    expect(invalidatePublicProfileCache).toHaveBeenCalledWith({
      profileId: scope.effectiveUserId,
      feature: "external-review-page",
    });
    expect(invalidatePublicProfileIdentityCache).toHaveBeenCalledWith([
      scope.username,
    ]);
  });

  it("lets an owner clear the heading without inventing a fallback", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ external_review_section_title: null }],
      error: null,
    } as never);
    const result = await saveExternalReviewSectionTitle(undefined, {
      externalReviewSectionTitle: "   ",
    });

    expect(rpc).toHaveBeenCalledWith("save_external_review_section_title", {
      p_dentistry_id: scope.dentistryId,
      p_external_review_section_title: "",
    });
    expect(result).toEqual({
      ok: true,
      data: { externalReviewSectionTitle: null },
    });
  });

  it("rejects malformed input before authorization and never invalidates failures", async () => {
    const invalid = await saveExternalReviewSectionTitle("forged", {
      externalReviewSectionTitle: "Reviews\nelsewhere",
    });
    expect(invalid.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "FAIL" },
    } as never);
    const failed = await saveExternalReviewSectionTitle(undefined, {
      externalReviewSectionTitle: "Owner heading",
    });
    expect(failed.ok).toBe(false);
    expect(invalidatePublicProfileCache).not.toHaveBeenCalled();
    expect(invalidatePublicProfileIdentityCache).not.toHaveBeenCalled();
  });
});
