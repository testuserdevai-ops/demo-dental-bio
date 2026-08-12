import { describe, expect, it, mock } from "bun:test";

const requireAdminPageCapability = mock(async () => ({
  id: "00000000-0000-4000-8000-000000000001",
  role: "admin" as const,
}));

mock.module("@/lib/admin/actor", () => ({ requireAdminPageCapability }));
mock.module("./components/UsersManagement", () => ({
  default: () => null,
}));
mock.module("./components/OfferCodeManagement", () => ({
  default: () => null,
}));
mock.module("./components/MarketingCampaign", () => ({
  default: () => null,
}));

const { default: AdminUsersPage } = await import("./users/page");
const { default: AdminOfferCodesPage } = await import("./offer-codes/page");
const { default: AdminCampaignsPage } = await import("./campaigns/page");
const { default: AdminReportsPage } = await import("./reports/page");

describe("dedicated admin workspace routes", () => {
  it("server-enforces the users capability", async () => {
    requireAdminPageCapability.mockClear();
    await AdminUsersPage();
    expect(requireAdminPageCapability).toHaveBeenCalledWith("users:manage");
  });

  it("server-enforces marketing capability for offer codes", async () => {
    requireAdminPageCapability.mockClear();
    await AdminOfferCodesPage();
    expect(requireAdminPageCapability).toHaveBeenCalledWith("marketing:manage");
  });

  it("server-enforces marketing capability for campaigns", async () => {
    requireAdminPageCapability.mockClear();
    await AdminCampaignsPage();
    expect(requireAdminPageCapability).toHaveBeenCalledWith("marketing:manage");
  });

  it("server-enforces report moderation capability", async () => {
    requireAdminPageCapability.mockClear();
    await AdminReportsPage();
    expect(requireAdminPageCapability).toHaveBeenCalledWith("reports:moderate");
  });
});
