import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import type { LifecycleAuditModel } from "@/lib/admin/lifecycle-audit";

import { LifecycleOperatorAudit } from "./LifecycleOperatorAudit";

const filters = {
  ownerId: "11111111-1111-4111-8111-111111111111",
  invalidOwnerId: false,
  campaign: "all" as const,
  outcome: "all" as const,
  limit: 50 as const,
};
const data: LifecycleAuditModel = {
  ownerId: filters.ownerId,
  filters,
  fetchedEventCount: 2,
  preferences: {
    lifecycleEmailsEnabled: true,
    weeklySummaryEnabled: true,
    milestoneEmailsEnabled: false,
    promotionalUnsubscribedAt: null,
    permanentDeliveryFailureAt: null,
    supportPausedUntil: null,
    revision: 3,
    updatedAt: "2026-08-12T04:00:00.000Z",
  },
  events: [
    {
      id: 9,
      campaign: "weekly_performance",
      outcome: "sent",
      reasonCode: "provider_accepted",
      occurredAt: "2026-08-12T05:00:00.000Z",
    },
  ],
};

describe("LifecycleOperatorAudit", () => {
  it("renders a privacy-safe filter surface and truthful source window", () => {
    render(
      <LifecycleOperatorAudit
        filters={filters}
        state={{ kind: "ready", data }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Owner lifecycle audit" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Owner ID").getAttribute("name")).toBe(
      "owner",
    );
    expect(screen.getByRole("combobox", { name: "Campaign" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Outcome" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect" })).toBeTruthy();
    expect(screen.getByText(/maximum window of 100/)).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("shows preferences, controlled audit vocabulary, and reason code", () => {
    render(
      <LifecycleOperatorAudit
        filters={filters}
        state={{ kind: "ready", data }}
      />,
    );

    expect(screen.getByText("Lifecycle email enabled")).toBeTruthy();
    expect(screen.getAllByText("Weekly performance")).toHaveLength(2);
    expect(screen.getAllByText("Sent")).toHaveLength(2);
    expect(screen.getByText("provider_accepted")).toBeTruthy();
  });

  it("does not turn an unavailable audit into an empty history", () => {
    render(
      <LifecycleOperatorAudit
        filters={filters}
        state={{ kind: "unavailable" }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "No status is inferred",
    );
    expect(screen.queryByRole("heading", { name: "Audit events" })).toBeNull();
  });
});
