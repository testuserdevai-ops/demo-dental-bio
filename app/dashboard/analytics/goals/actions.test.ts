import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000701",
    dentistryId: "00000000-0000-4000-8000-000000000702",
  },
}));
const rpc = mock(async () => ({
  data: [{ goal_id: "00000000-0000-4000-8000-000000000703" }],
  error: null,
}));
const revalidatePath = mock();

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));
mock.module("next/cache", () => ({ revalidatePath }));

const { saveConversionGoal } = await import("./actions");

const input = {
  goalId: null,
  name: "Consultation link",
  eventType: "link_click",
  entityUuid: "00000000-0000-4000-8000-000000000704",
  entityBigint: null,
  isPrimary: true,
  attributionWindowDays: 30,
  enabled: true,
  valueMinor: null,
  currency: null,
};

describe("conversion goal actions", () => {
  beforeEach(() => {
    rpc.mockClear();
    resolveDashboardIdentity.mockClear();
    revalidatePath.mockClear();
  });

  it("reauthorizes the target and sends only controlled goal fields", async () => {
    await expect(saveConversionGoal(undefined, input)).resolves.toEqual({
      ok: true,
      data: { goalId: "00000000-0000-4000-8000-000000000703" },
    });
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(undefined);
    expect(rpc).toHaveBeenCalledWith("upsert_owner_conversion_goal", {
      p_profile_id: "00000000-0000-4000-8000-000000000701",
      p_goal_id: null,
      p_name: "Consultation link",
      p_event_type: "link_click",
      p_entity_uuid: "00000000-0000-4000-8000-000000000704",
      p_entity_bigint: null,
      p_is_primary: true,
      p_attribution_window_days: 30,
      p_enabled: true,
      p_value_minor: null,
      p_currency: null,
    });
  });

  it("rejects arbitrary event names before authorization", async () => {
    const result = await saveConversionGoal(undefined, {
      ...input,
      eventType: "arbitrary_client_event",
    });
    expect(result.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
