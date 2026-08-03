import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import {
  navigationSpies,
  resetNavigationMocks,
} from "@/test/mocks/next-navigation";

const { refresh } = navigationSpies;
const updateSubscription = mock(() => ({ eq: updateSubscriptionForUser }));
const updateSubscriptionForUser = mock(
  async (): Promise<{ error: null | { message: string } }> => ({ error: null }),
);

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
    from: (table: string) => {
      if (table !== "users") throw new Error(`Unexpected table: ${table}`);
      return { update: updateSubscription };
    },
    storage: {
      from: () => ({ list: async () => ({ data: [], error: null }) }),
    },
  }),
}));
mock.module("@/services/apiClient", () => ({
  apiClient: {
    get: async () => ({}),
    delete: async () => ({}),
  },
}));

const { default: Sidebar } = await import("./Sidebar");

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000001",
  dentistryId: "00000000-0000-4000-8000-000000000002",
  username: "owner",
};

function shell(
  overrides: Partial<DashboardShellViewModel> = {},
): DashboardShellViewModel {
  return {
    subscriptionStatus: "PRO",
    isVerified: true,
    useDentalBrand: true,
    position: null,
    createdAt: null,
    trialEnd: "2020-01-01T00:00:00.000Z",
    currentPeriodEnd: "2020-02-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderSidebar(
  shellValue: DashboardShellViewModel,
  { strict = false }: { strict?: boolean } = {},
) {
  const content = (
    <DashboardScopeProvider scope={scope}>
      <Sidebar shell={shellValue} />
    </DashboardScopeProvider>
  );
  return render(
    strict ? <React.StrictMode>{content}</React.StrictMode> : content,
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

describe("Sidebar expired subscription reconciliation", () => {
  afterEach(() => {
    cleanup();
    resetNavigationMocks();
    updateSubscription.mockClear();
    updateSubscriptionForUser.mockReset();
    updateSubscriptionForUser.mockResolvedValue({ error: null });
  });

  it("attempts one FREE update under StrictMode and rerender", async () => {
    const expiredShell = shell();
    const view = renderSidebar(expiredShell, { strict: true });

    await waitFor(() => expect(updateSubscription).toHaveBeenCalledTimes(1));
    view.rerender(
      <React.StrictMode>
        <DashboardScopeProvider scope={scope}>
          <Sidebar shell={expiredShell} />
        </DashboardScopeProvider>
      </React.StrictMode>,
    );

    await screen.findByRole("link", { name: "@owner" });
    expect(updateSubscription).toHaveBeenCalledTimes(1);
  });

  it("does not update an already-FREE subscription", async () => {
    renderSidebar(shell({ subscriptionStatus: "FREE" }), { strict: true });

    await screen.findByRole("link", { name: "@owner" });
    expect(updateSubscription).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes only after a successful FREE update resolves", async () => {
    const request = deferred<{ error: null }>();
    updateSubscriptionForUser.mockImplementationOnce(() => request.promise);
    renderSidebar(shell());

    await waitFor(() =>
      expect(updateSubscriptionForUser).toHaveBeenCalledTimes(1),
    );
    expect(refresh).not.toHaveBeenCalled();

    request.resolve({ error: null });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("does not refresh or retry-loop after a failed FREE update", async () => {
    updateSubscriptionForUser.mockResolvedValueOnce({
      error: { message: "update failed" },
    });
    const expiredShell = shell();
    const view = renderSidebar(expiredShell);

    await waitFor(() =>
      expect(updateSubscriptionForUser).toHaveBeenCalledTimes(1),
    );
    view.rerender(
      <DashboardScopeProvider scope={scope}>
        <Sidebar shell={{ ...expiredShell }} />
      </DashboardScopeProvider>,
    );
    await screen.findByRole("link", { name: "@owner" });

    expect(refresh).not.toHaveBeenCalled();
    expect(updateSubscription).toHaveBeenCalledTimes(1);
  });

  it("preserves the six-month student message", async () => {
    renderSidebar(
      shell({
        position: "Student",
        createdAt: "2025-01-01",
        trialEnd: "2025-07-01",
        currentPeriodEnd: null,
      }),
    );

    expect(
      await screen.findByText(
        "Congrulates! You have unlocked pro plan for 6 months!",
      ),
    ).toBeTruthy();
  });
});
