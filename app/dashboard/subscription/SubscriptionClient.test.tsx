import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

import { DashboardQueryProvider } from "@/app/dashboard/_components/DashboardQueryProvider";
import type { SubscriptionOverview } from "@/lib/subscription/contracts";

const apiGet = mock(async () => {
  throw new Error("unexpected mount-time request");
});
mock.module("@/services/apiClient", () => ({
  apiClient: { get: apiGet, post: mock(), delete: mock() },
}));
mock.module("@stripe/stripe-js", () => ({ loadStripe: () => null }));

const { default: SubscriptionClient } = await import("./SubscriptionClient");

const overview: SubscriptionOverview = {
  customerId: null,
  plan: {
    planName: "FREE",
    price: 0,
    currency: "usd",
    renewalDate: null,
    billingCycle: null,
    subscriptionDetails: null,
    trialEnd: null,
  },
  paymentMethods: { items: [], error: null },
  billingHistory: {
    invoices: [],
    hasMore: false,
    nextCursor: null,
    error: null,
  },
};

describe("subscription overview client", () => {
  it("renders seeded server data without three mount-time API reads", async () => {
    render(
      <DashboardQueryProvider>
        <SubscriptionClient initialOverview={overview} />
      </DashboardQueryProvider>,
    );

    expect(screen.getByText("FREE")).toBeTruthy();
    expect(
      screen.getByText(
        "No customer account found. Please create a subscription first.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "No billing history yet. Your invoices will appear here once you subscribe.",
      ),
    ).toBeTruthy();
    expect(apiGet).not.toHaveBeenCalled();
  });
});
