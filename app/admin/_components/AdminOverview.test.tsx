import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { AdminOverview as AdminOverviewModel } from "@/lib/admin/overview";

import { AdminOverview } from "./AdminOverview";

const data: AdminOverviewModel = {
  filters: { days: 30, plan: "all", domain: "all" },
  dataThrough: "2026-08-12T12:00:00.000Z",
  users: {
    total: 120,
    signups: { value: 18, previous: 12, changePercent: 50 },
    active7Days: null,
    active30Days: null,
    readyProfiles: 80,
    incompleteProfiles: 40,
  },
  plans: {
    free: 70,
    trial: 10,
    paid: 40,
    expired: 3,
    cancelled: null,
    pastDue: null,
  },
  profileAnalytics: {
    views: null,
    outboundActions: null,
    uniqueVisitors: null,
    state: "processing",
  },
  billing: {
    monthlyRecurringRevenue: null,
    trialToPaidRate: null,
    state: "unavailable",
  },
  operations: {
    failedOperations: null,
    pendingReports: null,
    breachedSla: null,
    state: "unavailable",
  },
};

describe("AdminOverview", () => {
  it("renders linked operational metrics and truthful unavailable states", () => {
    render(<AdminOverview data={data} />);

    expect(
      screen.getByRole("heading", { name: "Operations overview" }),
    ).toBeTruthy();
    expect(screen.getByText("120")).toBeTruthy();
    expect(screen.getByText("+50% vs previous period")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Total users/ })).toBeTruthy();
    expect(screen.getByText(/never shown as zero/)).toBeTruthy();
    expect(
      screen.getByText(/First-party aggregates are processing/),
    ).toBeTruthy();
    expect(screen.getByText(/Billing metrics remain unavailable/)).toBeTruthy();
    expect(screen.getByText(/No authoritative incident/)).toBeTruthy();
  });

  it("keeps filters native and URL-submittable", () => {
    render(<AdminOverview data={data} />);
    expect(screen.getByRole("combobox", { name: "Range" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Plan" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Domain" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
  });

  it("renders authoritative engagement without the processing warning", () => {
    render(
      <AdminOverview
        data={{
          ...data,
          profileAnalytics: {
            views: { value: 1234, previous: 1000, changePercent: 23.4 },
            outboundActions: {
              value: 321,
              previous: 300,
              changePercent: 7,
            },
            uniqueVisitors: null,
            state: "available",
          },
        }}
      />,
    );

    expect(screen.getByText("1,234")).toBeTruthy();
    expect(screen.getByText("321")).toBeTruthy();
    expect(screen.queryByText(/aggregates are processing/)).toBeNull();
    expect(screen.getByText(/unique visitors remain unavailable/)).toBeTruthy();
  });
});
