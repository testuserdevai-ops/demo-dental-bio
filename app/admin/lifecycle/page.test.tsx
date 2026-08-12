import { beforeEach, describe, expect, it, mock } from "bun:test";

const requireAdminPageCapability = mock(async () => ({
  id: "admin-id",
  role: "admin",
}));
const getAdminLifecycleAudit = mock(async (filters: unknown) => ({ filters }));

mock.module("@/lib/admin/actor", () => ({ requireAdminPageCapability }));
mock.module("@/lib/admin/lifecycle-audit-repository", () => ({
  getAdminLifecycleAudit,
}));
mock.module("./_components/LifecycleOperatorAudit", () => ({
  LifecycleOperatorAudit: (props: unknown) => ({
    type: "lifecycle-operator-audit",
    props,
  }),
}));

const { default: AdminLifecyclePage } = await import("./page");

describe("AdminLifecyclePage", () => {
  beforeEach(() => {
    requireAdminPageCapability.mockClear();
    getAdminLifecycleAudit.mockClear();
  });

  it("authorizes before querying an owner UUID", async () => {
    const output = (await AdminLifecyclePage({
      searchParams: Promise.resolve({
        owner: "11111111-1111-4111-8111-111111111111",
        campaign: "zero_traffic",
        outcome: "claimed",
        limit: "25",
      }),
    })) as unknown as { props: { state: { kind: string } } };

    expect(requireAdminPageCapability).toHaveBeenCalledWith("console:admin");
    expect(getAdminLifecycleAudit).toHaveBeenCalledWith({
      ownerId: "11111111-1111-4111-8111-111111111111",
      invalidOwnerId: false,
      campaign: "zero_traffic",
      outcome: "claimed",
      limit: 25,
    });
    expect(output.props.state.kind).toBe("ready");
  });

  it("does not call lifecycle RPCs for an invalid identifier", async () => {
    const output = (await AdminLifecyclePage({
      searchParams: Promise.resolve({ owner: "owner@example.com" }),
    })) as unknown as { props: { state: { kind: string } } };

    expect(requireAdminPageCapability).toHaveBeenCalledWith("console:admin");
    expect(getAdminLifecycleAudit).not.toHaveBeenCalled();
    expect(output.props.state.kind).toBe("idle");
  });
});
