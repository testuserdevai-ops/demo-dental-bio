import { describe, expect, it, mock } from "bun:test";

const requireAdminPageCapability = mock(async () => ({
  id: "admin-id",
  role: "admin",
}));
const getAdminPlatformFunnel = mock(async (filters: unknown) => ({ filters }));

mock.module("@/lib/admin/actor", () => ({ requireAdminPageCapability }));
mock.module("@/lib/admin/platform-funnel-repository", () => ({
  getAdminPlatformFunnel,
}));
mock.module("./_components/PlatformFunnel", () => ({
  PlatformFunnel: ({ data }: { data: unknown }) => ({
    type: "platform-funnel",
    data,
  }),
}));

const { default: AdminFunnelPage } = await import("./page");

describe("AdminFunnelPage", () => {
  it("queries all users when no filters are supplied", async () => {
    await AdminFunnelPage({ searchParams: Promise.resolve({}) });

    expect(getAdminPlatformFunnel).toHaveBeenCalledWith({
      startDate: "2000-01-01",
      endDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      plan: "all",
      domain: "all",
      cohort: "all",
    });
  });

  it("authorizes before querying controlled URL filters", async () => {
    const output = (await AdminFunnelPage({
      searchParams: Promise.resolve({
        start: "2026-08-01",
        end: "2026-08-12",
        plan: "pro",
        domain: "dental.bio",
        cohort: "referred",
      }),
    })) as unknown as { props: { data: unknown } };

    expect(requireAdminPageCapability).toHaveBeenCalledWith("console:admin");
    expect(getAdminPlatformFunnel).toHaveBeenCalledWith({
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      plan: "pro",
      domain: "dental.bio",
      cohort: "referred",
    });
    expect(output.props.data).toEqual({
      filters: {
        startDate: "2026-08-01",
        endDate: "2026-08-12",
        plan: "pro",
        domain: "dental.bio",
        cohort: "referred",
      },
    });
  });
});
