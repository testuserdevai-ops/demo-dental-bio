import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { buildSubscriptionOverview } = await import("./overview");
import type { SubscriptionOverviewDependencies } from "./overview";

function dependencies(
  overrides: Partial<SubscriptionOverviewDependencies> = {},
): SubscriptionOverviewDependencies {
  return {
    readAuthority: mock(async () => ({
      subscriptionId: "sub_owner",
      subscriptionStatus: "PRO",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      trialEnd: null,
      billingCycle: "monthly",
      customerId: "cus_owner",
    })),
    retrieveSubscription: mock(async () => ({
      id: "sub_owner",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodStart: 1_785_547_200,
      currentPeriodEnd: 1_788_225_600,
      trialEnd: null,
      priceId: null,
      unitAmount: 2_000,
      currency: "gbp",
    })),
    listPaymentMethods: mock(async () => [
      {
        id: "pm_owner",
        type: "card",
        card: {
          brand: "visa",
          last4: "4242",
          expMonth: 12,
          expYear: 2030,
        },
        isDefault: true,
      },
    ]),
    listInvoices: mock(async () => ({
      invoices: [],
      hasMore: true,
      nextCursor: "in_owner",
    })),
    ...overrides,
  };
}

describe("canonical subscription overview", () => {
  it("returns null without invoking providers when authority is missing", async () => {
    const deps = dependencies({ readAuthority: mock(async () => null) });

    await expect(buildSubscriptionOverview("owner", deps)).resolves.toBeNull();
    expect(deps.retrieveSubscription).not.toHaveBeenCalled();
    expect(deps.listPaymentMethods).not.toHaveBeenCalled();
    expect(deps.listInvoices).not.toHaveBeenCalled();
  });

  it("loads each provider-backed section once and maps one overview", async () => {
    const deps = dependencies();
    const overview = await buildSubscriptionOverview("owner", deps);

    expect(deps.readAuthority).toHaveBeenCalledWith("owner");
    expect(deps.retrieveSubscription).toHaveBeenCalledWith("sub_owner");
    expect(deps.listPaymentMethods).toHaveBeenCalledWith("cus_owner");
    expect(deps.listInvoices).toHaveBeenCalledWith("cus_owner");
    expect(overview).toMatchObject({
      customerId: "cus_owner",
      plan: {
        planName: "PRO",
        price: 20,
        currency: "gbp",
        subscriptionDetails: { id: "sub_owner", status: "active" },
      },
      paymentMethods: {
        items: [{ id: "pm_owner", isDefault: true }],
        error: null,
      },
      billingHistory: { hasMore: true, nextCursor: "in_owner", error: null },
    });
  });

  it("keeps plan authority usable when independent provider sections fail", async () => {
    const deps = dependencies({
      retrieveSubscription: mock(async () => {
        throw new Error("provider unavailable");
      }),
      listPaymentMethods: mock(async () => {
        throw new Error("provider unavailable");
      }),
      listInvoices: mock(async () => {
        throw new Error("provider unavailable");
      }),
    });

    await expect(buildSubscriptionOverview("owner", deps)).resolves.toEqual({
      customerId: "cus_owner",
      plan: {
        planName: "PRO",
        price: 0,
        currency: "usd",
        renewalDate: "2026-09-01T00:00:00.000Z",
        billingCycle: "monthly",
        subscriptionDetails: null,
        trialEnd: null,
      },
      paymentMethods: {
        items: [],
        error: "Payment methods are temporarily unavailable.",
      },
      billingHistory: {
        invoices: [],
        hasMore: false,
        nextCursor: null,
        error: "Billing history is temporarily unavailable.",
      },
    });
  });
});
