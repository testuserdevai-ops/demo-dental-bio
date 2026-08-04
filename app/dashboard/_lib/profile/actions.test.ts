import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000801",
  dentistryId: "00000000-0000-4000-8000-000000000811",
  username: "owner",
  canManageSubscription: true,
};
const resolveDashboardIdentity = mock(async () => ({ scope }));
const rpc = mock(async () => ({ data: null as any, error: null as any }));
const single = mock(async () => ({ data: {}, error: null }));
const eq = mock(() => ({ single }));
const select = mock(() => ({ eq }));
const from = mock(() => ({ select }));
const list = mock(async () => ({ data: [], error: null }));
const getPublicUrl = mock(() => ({ data: { publicUrl: "" } }));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
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
