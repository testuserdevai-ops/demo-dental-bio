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

const refresh = mock(() => {});
const deleteSubscription = mock(async () => ({}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));
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

function renderSidebar() {
  return render(
    <DashboardScopeProvider
      scope={{
        effectiveUserId: "00000000-0000-4000-8000-000000000001",
        dentistryId: "00000000-0000-4000-8000-000000000002",
        username: "owner",
      }}
    >
      <Sidebar shell={shell} />
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
  return screen.getByRole("dialog", { name: "Downgrade plan?" });
}

describe("Sidebar subscription downgrade", () => {
  afterEach(() => {
    cleanup();
    refresh.mockClear();
    deleteSubscription.mockClear();
  });

  it("opens the downgrade confirmation from the paid-plan control", async () => {
    expect(await openDowngradeDialog()).toBeTruthy();
  });

  it("cancels without deleting the subscription", async () => {
    await openDowngradeDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("dialog", { name: "Downgrade plan?" }),
    ).toBeNull();
    expect(deleteSubscription).not.toHaveBeenCalled();
  });

  it("refreshes only after the authoritative downgrade resolves", async () => {
    const request = deferred<object>();
    deleteSubscription.mockImplementationOnce(() => request.promise);
    await openDowngradeDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(refresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Downgrade plan?" }),
    ).toBeTruthy();

    request.resolve({});
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole("dialog", { name: "Downgrade plan?" }),
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
      screen.getByRole("dialog", { name: "Downgrade plan?" }),
    ).toBeTruthy();
  });
});
