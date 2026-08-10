import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { SubscriptionOverview } from "@/lib/subscription/contracts";

mock.module("@/services/apiClient", () => ({
  apiClient: { get: mock() },
}));

const { default: BillingHistory } = await import("./BillingHistory");

function page(
  id: string,
  description: string,
): SubscriptionOverview["billingHistory"] {
  return {
    invoices: [
      {
        id,
        number: id,
        amount: 2_000,
        currency: "gbp",
        status: "paid",
        date: "2026-08-01T00:00:00.000Z",
        periodStart: null,
        periodEnd: null,
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description,
      },
    ],
    hasMore: false,
    nextCursor: id,
    error: null,
  };
}

describe("BillingHistory", () => {
  it("resets invoice and cursor state when the canonical overview refreshes", () => {
    const view = render(
      <BillingHistory
        key="overview-old"
        initialPage={page("in_old", "Old invoice")}
      />,
    );
    expect(screen.getByText("Old invoice")).toBeTruthy();

    view.rerender(
      <BillingHistory
        key="overview-new"
        initialPage={page("in_new", "Refreshed invoice")}
      />,
    );

    expect(screen.queryByText("Old invoice")).toBeNull();
    expect(screen.getByText("Refreshed invoice")).toBeTruthy();
  });
});
