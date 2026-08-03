import { afterEach, describe, expect, it, mock } from "bun:test";
import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";

const refresh = mock();
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
    put: mock(async () => ({ use_dental_brand: true })),
  },
}));

const { default: Sidebar } = await import("./Sidebar");
const { default: MobileNavbar } = await import("./MobileNavbar");
const { default: VerifyStatus } =
  await import("../verification/components/VerifyStatus");

const scope = {
  effectiveUserId: "00000000-0000-4000-8000-000000000001",
  dentistryId: "00000000-0000-4000-8000-000000000002",
  username: "owner",
};

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

function renderShell(node: React.ReactNode) {
  return render(
    <DashboardScopeProvider scope={scope}>{node}</DashboardScopeProvider>,
  );
}

describe("dashboard server shell props", () => {
  afterEach(cleanup);

  it("renders the prior student unlock message from server presentation", () => {
    renderShell(
      <Sidebar
        shell={shell({
          position: "Student",
          createdAt: "2025-01-01",
          trialEnd: "2025-07-01",
        })}
      />,
    );
    expect(
      screen.getByText("Congrulates! You have unlocked pro plan for 6 months!"),
    ).toBeTruthy();
  });

  it("renders mobile navigation directly from the paid server shell", () => {
    renderShell(<MobileNavbar shell={shell()} />);
    expect(screen.getByRole("link", { name: "Custom Domain" })).toBeTruthy();
  });

  it("renders verification presentation directly from the server-derived status", () => {
    render(<VerifyStatus enabled={true} isVerified={true} />);
    expect(screen.getByText("You verified your identity")).toBeTruthy();
  });
});
