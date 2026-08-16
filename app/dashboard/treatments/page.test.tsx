import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

mock.module("server-only", () => ({}));
const resolveDashboardIdentity = mock(async () => ({
  scope: {
    effectiveUserId: "00000000-0000-4000-8000-000000000001",
    dentistryId: "00000000-0000-4000-8000-000000000002",
    username: "owner",
    canManageSubscription: true,
  },
}));
const from = mock((table: string) => ({
  select: () => ({
    eq: () =>
      table === "dentistry_treatments"
        ? { order: async () => ({ data: [], error: null }) }
        : {
            single: async () => ({
              data: {
                treatment_section_title: "Treatments",
                service_section_title: "Services",
              },
              error: null,
            }),
          },
  }),
}));
const TreatmentsClientWrapper = mock(() => <p>Treatment controls</p>);
mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ from }),
}));
mock.module("./TreatmentsClientWrapper", () => ({
  default: TreatmentsClientWrapper,
}));

const { default: TreatmentsPage } = await import("./page");

describe("TreatmentsPage", () => {
  it("seeds one authorized aggregate using the effective user as the refetch hint", async () => {
    render(
      await TreatmentsPage({
        searchParams: Promise.resolve({
          userId: "00000000-0000-4000-8000-000000000009",
        }),
      }),
    );
    expect(resolveDashboardIdentity).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000009",
    );
    expect(from).toHaveBeenCalledWith("dentistry_treatments");
    expect(TreatmentsClientWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeId: "00000000-0000-4000-8000-000000000001",
        targetHint: "00000000-0000-4000-8000-000000000009",
      }),
      undefined,
    );
    expect(screen.getByText("Treatment controls")).toBeTruthy();
  });

  it("keeps the owner mutation hint undefined", async () => {
    TreatmentsClientWrapper.mockClear();
    render(await TreatmentsPage({ searchParams: Promise.resolve({}) }));
    expect(TreatmentsClientWrapper).toHaveBeenCalledWith(
      expect.objectContaining({ targetHint: undefined }),
      undefined,
    );
  });
});
