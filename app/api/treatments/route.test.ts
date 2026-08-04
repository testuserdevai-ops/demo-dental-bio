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
const from = mock(() => ({
  select: () => ({
    eq: () => ({ order: async () => ({ data: [], error: null }) }),
  }),
}));
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from }),
}));

const { GET } = await import("./route");

describe("GET /api/treatments", () => {
  it("reauthorizes the target hint and returns the server aggregate", async () => {
    const response = await GET(
      new Request(
        "http://example.test/api/treatments?targetUserId=00000000-0000-4000-8000-000000000009",
      ),
    );

    expect(resolveDashboardIdentity).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000009",
    );
    expect(from).toHaveBeenCalledWith("dentistry_treatments");
    expect(await response.json()).toEqual({ treatments: [], services: [] });
  });
});
