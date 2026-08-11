import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const rpc = mock(
  async (
    ..._args: unknown[]
  ): Promise<{ data: unknown[]; error: unknown }> => ({
    data: [],
    error: null,
  }),
);
const createServerSupabaseClient = mock(async () => ({ rpc }));
mock.module("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

const { completeProfileOnboardingStep, getProfileOnboardingProgress } =
  await import("./onboarding-progress");

describe("profile onboarding progress repository", () => {
  beforeEach(() => rpc.mockReset());

  it("returns empty template-scoped progress when no row or another template is saved", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect(
      await getProfileOnboardingProgress("owner", "direct-booking"),
    ).toEqual({
      templateId: "direct-booking",
      completedStepIds: [],
      revision: 0,
      updatedAt: null,
    });

    rpc.mockResolvedValueOnce({
      data: [
        {
          template_id: "basic",
          completed_step_ids: ["profile-details"],
          revision: 3,
          updated_at: "2026-08-12T00:00:00Z",
        },
      ],
      error: null,
    });
    expect(
      await getProfileOnboardingProgress("owner", "clinic-commerce"),
    ).toMatchObject({ templateId: "clinic-commerce", completedStepIds: [] });
  });

  it("maps an atomic completion result", async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          template_id: "direct-booking",
          completed_step_ids: ["profile-details", "social-links"],
          revision: 2,
          updated_at: "2026-08-12T00:00:00Z",
        },
      ],
      error: null,
    });
    expect(
      await completeProfileOnboardingStep({
        userId: "owner",
        templateId: "direct-booking",
        stepId: "social-links",
      }),
    ).toEqual({
      templateId: "direct-booking",
      completedStepIds: ["profile-details", "social-links"],
      revision: 2,
      updatedAt: "2026-08-12T00:00:00Z",
    });
    expect(rpc).toHaveBeenCalledWith("complete_profile_onboarding_step", {
      p_target_user_id: "owner",
      p_template_id: "direct-booking",
      p_step_id: "social-links",
    });
  });
});
