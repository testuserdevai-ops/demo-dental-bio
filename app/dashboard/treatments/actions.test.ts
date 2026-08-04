import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
    dentistryId: "00000000-0000-4000-8000-000000000002",
    username: "owner",
    canManageSubscription: true,
  },
}));
const rpc = mock(async () => ({
  data: [
    {
      treatment_id: "00000000-0000-4000-8000-000000000003",
      title: "Check-up",
      description: "Routine",
      isService: false,
    },
  ],
  error: null,
}));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc }),
}));

const { createTreatment } = await import("./actions");

describe("treatment Actions", () => {
  it("reauthorizes then makes one atomic create RPC using scope dentistry", async () => {
    const result = await createTreatment(
      "00000000-0000-4000-8000-000000000009",
      {
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
      },
    );
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000009",
    );
    expect(rpc).toHaveBeenCalledWith("create_dentistry_treatment", {
      p_dentistry_id: "00000000-0000-4000-8000-000000000002",
      p_title: "Check-up",
      p_description: "Routine",
      p_is_service: false,
    });
    expect(result).toEqual({
      ok: true,
      data: {
        id: "00000000-0000-4000-8000-000000000003",
        title: "Check-up",
        description: "Routine",
        kind: "treatment",
        rank: 0,
      },
    });
  });

  it("rejects invalid input before resolving identity or accessing the database", async () => {
    resolveDashboardIdentity.mockClear();
    rpc.mockClear();
    const result = await createTreatment("hint", {
      title: "",
      description: "",
      kind: "treatment",
    });
    expect(result.ok).toBe(false);
    expect(resolveDashboardIdentity).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
