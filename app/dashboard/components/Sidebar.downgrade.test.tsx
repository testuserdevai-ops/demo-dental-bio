import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

const { refresh } = navigationSpies;
const deleteSubscription = mock(async () => ({}));

mock.module("@/utils/hooks/useDomainConfig", () => ({
  useDomainConfig: () => ({
    domain: "dental.bio",
    brandName: "DentalBio",
    logoPath: "/logo.svg",
  }),
}));
mock.module("@/utils/hooks/useIsMobile", () => ({ default: () => false }));
mock.module("@/utils/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({ list: async () => ({ data: [], error: null }) }),
    },
  }),
}));
mock.module("@/services/apiClient", () => ({
  apiClient: {
    get: async () => ({}),
    delete: deleteSubscription,
  },
}));

const { default: Sidebar } = await import("./Sidebar");

const shell: DashboardShellViewModel = {
  subscriptionStatus: "PRO",
  isVerified: true,
  useDentalBrand: true,
  position: null,
  createdAt: null,
  trialEnd: null,
  currentPeriodEnd: null,
};

function renderSidebar({
  canManageSubscription = true,
  shellValue = shell,
}: {
  canManageSubscription?: boolean;
  shellValue?: DashboardShellViewModel;
} = {}) {
  return render(
    <DashboardScopeProvider
      scope={{
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
        canManageSubscription,
      }}
    >
      <Sidebar shell={shellValue} />
    </DashboardScopeProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function openDowngradeDialog() {
  renderSidebar();
  await screen.findByRole("link", { name: "@owner" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel Current Plan" }));
  return screen.getByRole("alertdialog", { name: "Downgrade plan?" });
}

describe("Sidebar subscription downgrade", () => {
  afterEach(() => {
    cleanup();
    resetNavigationMocks();
    deleteSubscription.mockClear();
  });

  it("opens the downgrade confirmation from the paid-plan control", async () => {
    expect(await openDowngradeDialog()).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Cancel" }),
      ),
    );
  });

  it("cancels without deleting the subscription", async () => {
    renderSidebar();
    await screen.findByRole("link", { name: "@owner" });
    const trigger = screen.getByRole("button", {
      name: "Cancel Current Plan",
    });
    fireEvent.click(trigger);
    screen.getByRole("alertdialog", { name: "Downgrade plan?" });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("alertdialog", { name: "Downgrade plan?" }),
    ).toBeNull();
    expect(deleteSubscription).not.toHaveBeenCalled();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("does not expose or call owner cancellation while an admin views a target", async () => {
    renderSidebar({ canManageSubscription: false });

    await screen.findByRole("link", { name: "@owner" });
    expect(
      screen.queryByRole("button", { name: "Cancel Current Plan" }),
    ).toBeNull();
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("does not expose the owner upgrade action while an admin views a target", async () => {
    renderSidebar({
      canManageSubscription: false,
      shellValue: { ...shell, subscriptionStatus: "FREE" },
    });

    await screen.findByRole("link", { name: "@owner" });
    expect(screen.queryByRole("link", { name: "Upgrade now" })).toBeNull();
  });

  it("renders the owner upgrade action as one semantic external link", async () => {
    renderSidebar({
      shellValue: { ...shell, subscriptionStatus: "FREE" },
    });

    const link = await screen.findByRole("link", { name: "Upgrade now" });
    expect(link.getAttribute("href")).toBe("/upgrade");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel") ?? "").toContain("noopener");
    expect(link.querySelector("button")).toBeNull();
  });

  it("refreshes only after the authoritative downgrade resolves", async () => {
    const request = deferred<object>();
    deleteSubscription.mockImplementationOnce(() => request.promise);
    await openDowngradeDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(refresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Downgrade plan?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Deleting…" })
        .hasAttribute("disabled"),
    ).toBe(true);

    request.resolve({});
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("alertdialog", { name: "Downgrade plan?" }),
    ).toBeNull();
  });

  it("keeps the confirmation open and does not refresh when downgrade fails", async () => {
    deleteSubscription.mockRejectedValueOnce(new Error("downgrade failed"));
    await openDowngradeDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Delete" })
          .hasAttribute("aria-busy"),
      ).toBe(false),
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", { name: "Downgrade plan?" }),
    ).toBeTruthy();
  });
});
