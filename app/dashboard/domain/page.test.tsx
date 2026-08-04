import { beforeEach, describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

function identity(canManageSubscription: boolean, subscriptionStatus = "FREE") {
  return {
    scope: {
      effectiveUserId: "00000000-0000-4000-8000-000000000001",
      dentistryId: "00000000-0000-4000-8000-000000000002",
      username: "owner",
      canManageSubscription,
    },
    shell: {
      subscriptionStatus,
      isVerified: false,
      useDentalBrand: true,
      position: null,
      createdAt: null,
      trialEnd: null,
      currentPeriodEnd: null,
    },
  };
}

const resolveDashboardIdentity = mock(async () => identity(true));
const DomainClient = mock(() => <p>Domain editor</p>);

mock.module("@/lib/dashboard/identity", () => ({ resolveDashboardIdentity }));
mock.module("./DomainClient", () => ({ default: DomainClient }));

const { default: DomainPage } = await import("./page");

beforeEach(() => {
  resolveDashboardIdentity.mockReset();
  resolveDashboardIdentity.mockResolvedValue(identity(true));
  DomainClient.mockClear();
});

describe("DomainPage upgrade capability", () => {
  it("does not offer an upgrade while an admin views a non-premium target", async () => {
    resolveDashboardIdentity.mockResolvedValueOnce(identity(false));

    render(
      await DomainPage({
        searchParams: Promise.resolve({
          userId: "00000000-0000-4000-8000-000000000009",
        }),
      }),
    );

    expect(
      screen.queryByRole("link", { name: "Upgrade to Premium Pro" }),
    ).toBeNull();
  });

  it("offers an eligible owner one semantic external upgrade link", async () => {
    render(await DomainPage({ searchParams: Promise.resolve({}) }));

    const link = screen.getByRole("link", {
      name: "Upgrade to Premium Pro",
    });
    expect(link.getAttribute("href")).toBe("/upgrade");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
    expect(link.querySelector("button")).toBeNull();
  });

  it("does not mount owner domain controls while an admin views a Premium Pro target", async () => {
    resolveDashboardIdentity.mockResolvedValueOnce(
      identity(false, "PREMIUM PRO"),
    );

    render(
      await DomainPage({
        searchParams: Promise.resolve({
          userId: "00000000-0000-4000-8000-000000000009",
        }),
      }),
    );

    expect(DomainClient).not.toHaveBeenCalled();
    expect(screen.queryByText("Domain editor")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.querySelector("form")).toBeNull();
    expect(
      screen.getByText(
        "Custom domain management is unavailable while viewing another user's dashboard.",
      ),
    ).toBeTruthy();
  });

  it("mounts domain controls for the Premium Pro owner", async () => {
    resolveDashboardIdentity.mockResolvedValueOnce(
      identity(true, "PREMIUM PRO"),
    );

    render(await DomainPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Domain editor")).toBeTruthy();
    expect(DomainClient).toHaveBeenCalledTimes(1);
  });
});
