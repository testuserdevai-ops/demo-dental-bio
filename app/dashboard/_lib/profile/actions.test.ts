import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
  dentistryId: "00000000-0000-4000-8000-000000000811",
  username: "owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const invalidatePublicProfileCache = mock(() => {});
const invalidatePublicProfileIdentityCache = mock(() => {});
const getProfileViewModel = mock(async () => ({ title: "Dr" }) as any);
const rpc = mock(async () => ({ data: null as any, error: null as any }));
const single = mock(async () => ({ data: {}, error: null }));
const eq = mock(() => ({ single }));
const select = mock(() => ({ eq }));
const from = mock(() => ({ select }));
const list = mock(async () => ({ data: [], error: null }));
const getPublicUrl = mock(() => ({ data: { publicUrl: "" } }));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/public-profile/cache-invalidation", () => ({
  invalidatePublicProfileCache,
  invalidatePublicProfileIdentityCache,
}));
mock.module("./queries", () => ({ getProfileViewModel }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    rpc,
    from,
    storage: { from: () => ({ list, getPublicUrl }) },
  }),
}));

const actions = await import("./actions");
const profile = {
  title: "Dr",
  position: "Dentist",
  gdcNo: "123",
  qualification: "BDS",
  aboutTitle: "Owner",
  aboutText: "About",
  phone: "",
  contactEmail: "",
  website: "",
  bookingLink: "",
  bookingEnabled: false,
};

describe("profile Actions", () => {
  beforeEach(() => {
    resolveDashboardIdentity.mockReset();
    resolveDashboardIdentity.mockResolvedValue({ scope });
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: { message: "stop" } });
    invalidatePublicProfileCache.mockClear();
    invalidatePublicProfileIdentityCache.mockClear();
  });

  it("invalidates the exact profile and socials features only after success", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    const profileResult = await actions.saveProfile(undefined, profile);
    expect(profileResult.ok).toBe(true);
    expect(invalidatePublicProfileCache).toHaveBeenLastCalledWith({
      profileId: scope.effectiveUserId,
      feature: "profile",
    });
    expect(invalidatePublicProfileIdentityCache).toHaveBeenCalledWith([
      scope.username,
    ]);

    rpc.mockResolvedValueOnce({
      data: [
        {
          linkedin_link: "",
          twitter_link: "",
          instagram_link: "",
          facebook_link: "",
          tiktok_link: "",
          other_link: "",
        },
      ],
      error: null,
    });
    const socialsResult = await actions.saveSocialLinks(undefined, {
      linkedin: "",
      twitter: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      other: "",
    });
    expect(socialsResult.ok).toBe(true);
    expect(invalidatePublicProfileCache).toHaveBeenLastCalledWith({
      profileId: scope.effectiveUserId,
      feature: "socials",
    });

    rpc.mockResolvedValueOnce({ data: null, error: { message: "stop" } });
    await actions.saveProfile(undefined, profile);
    expect(invalidatePublicProfileCache).toHaveBeenCalledTimes(2);
    expect(invalidatePublicProfileIdentityCache).toHaveBeenCalledTimes(1);
  });

  it("reauthorizes and maps profile fields to the typed atomic RPC", async () => {
    await actions.saveProfile(undefined, profile);
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(undefined);
    expect(rpc).toHaveBeenCalledWith("save_dashboard_profile", {
      p_user_id: scope.effectiveUserId,
      p_dentistry_id: scope.dentistryId,
      p_title: "Dr",
      p_position: "Dentist",
      p_gdc_no: "123",
      p_qualification: "BDS",
      p_about_title: "Owner",
      p_about_text: "About",
      p_phone: "",
      p_contact_email: "",
      p_website: "",
      p_booking_link: "",
      p_booking_enabled: false,
    });
  });

  it("rejects forged targets before any RPC", async () => {
    resolveDashboardIdentity.mockRejectedValue(new Error("FORBIDDEN"));
    const result = await actions.saveSocialLinks(scope.effectiveUserId, {
      linkedin: "",
      twitter: "",
      instagram: "",
      facebook: "",
      tiktok: "",
      other: "",
    });
    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
