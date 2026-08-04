import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MessageProvider, useMessage } from "@/app/contexts/MessageContext";
import { PreviewProvider } from "@/app/contexts/PreviewContext";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

const { refresh } = navigationSpies;
const putBrand = mock(async () => ({ use_dental_brand: false }));

mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({
    domain: "dental.bio",
    brandName: "DentalBio",
    logoPath: "/logo.svg",
  }),
}));
mock.module("@/services/apiClient", () => ({
  apiClient: { put: putBrand },
}));

const { default: RightPanel } = await import("./RightPanel");

function shell(
  overrides: Partial<DashboardShellViewModel> = {},
): DashboardShellViewModel {
  return {
    subscriptionStatus: "PREMIUM PRO",
    isVerified: true,
    useDentalBrand: true,
    position: null,
    createdAt: null,
    trialEnd: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

function UpgradeMessageProbe() {
  return useMessage().messageStatus.extraButtons;
}

function renderPanel(shellValue = shell(), canManageSubscription = true) {
  return render(
    <DashboardScopeProvider
      scope={{
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "server-owner",
        canManageSubscription,
      }}
    >
      <MessageProvider>
        <PreviewProvider>
          <RightPanel username="server-owner" shell={shellValue} />
          <UpgradeMessageProbe />
        </PreviewProvider>
      </MessageProvider>
    </DashboardScopeProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("RightPanel server seed and branding mutation", () => {
  afterEach(() => {
    cleanup();
    resetNavigationMocks();
    putBrand.mockReset();
    putBrand.mockResolvedValue({ use_dental_brand: false });
  });

  it("renders the server-seeded preview shell and branding state", async () => {
    renderPanel(shell({ useDentalBrand: false }));

    expect(screen.getByText("server-owner")).toBeTruthy();
    expect(
      document.querySelector(
        'iframe[src="/server-owner?analyticsContext=preview"]',
      ),
    ).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: "Show DentalBio logo" }),
    ).toBeTruthy();
  });

  it("refreshes only after the branding PUT succeeds", async () => {
    const request = deferred<{ use_dental_brand: boolean }>();
    putBrand.mockImplementationOnce(() => request.promise);
    renderPanel();
    const control = await screen.findByRole("button", {
      name: "Hide DentalBio logo",
    });

    fireEvent.click(control);
    await waitFor(() => expect(putBrand).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();

    request.resolve({ use_dental_brand: false });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", { name: "Show DentalBio logo" }),
    ).toBeTruthy();
  });

  it("restores the server branding state and does not refresh when PUT fails", async () => {
    putBrand.mockRejectedValueOnce(new Error("branding failed"));
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      renderPanel();
      fireEvent.click(
        await screen.findByRole("button", { name: "Hide DentalBio logo" }),
      );

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Hide DentalBio logo" }),
        ).toBeTruthy(),
      );
      expect(refresh).not.toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("does not offer an upgrade while an admin views a non-premium target", async () => {
    renderPanel(shell({ subscriptionStatus: "FREE" }), false);

    fireEvent.click(
      await screen.findByRole("button", { name: "Hide DentalBio logo" }),
    );

    expect(screen.queryByRole("link", { name: "Upgrade" })).toBeNull();
  });

  it("offers an owner upgrade as one semantic external link", async () => {
    renderPanel(shell({ subscriptionStatus: "FREE" }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Hide DentalBio logo" }),
    );

    const link = screen.getByRole("link", { name: "Upgrade" });
    expect(link.getAttribute("href")).toBe("/upgrade");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
    expect(link.querySelector("button")).toBeNull();
  });
});
