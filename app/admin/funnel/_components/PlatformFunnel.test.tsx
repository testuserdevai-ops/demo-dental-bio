import { describe, expect, it } from "bun:test";
import { render, screen, within } from "@testing-library/react";

import {
  platformFunnelPayloadSchema,
  toPlatformFunnelModel,
} from "@/lib/admin/platform-funnel";

import { PlatformFunnel } from "./PlatformFunnel";

const data = toPlatformFunnelModel(
  platformFunnelPayloadSchema.parse({
    schemaVersion: 1,
    cohortSize: 10,
    stages: [
      ["registered", "Registered", 10, null],
      ["verified", "Email verified", 8, 60],
      ["onboarding_completed", "Onboarding complete", 6, null],
      ["profile_published", "Profile published", 5, 180],
      ["first_view", "First qualified view", 4, 30],
      ["first_action", "First outbound action", 2, 5],
    ].map(([id, label, count, medianMinutesFromPrevious]) => ({
      id,
      label,
      count,
      medianMinutesFromPrevious,
      ...(id === "profile_published"
        ? { elapsedDefinition: "registration_to_publish" }
        : {}),
    })),
    registrationCoverage: { completed: 7, cohort: 10 },
    onboardingStarted: 7,
    completionDistribution: [
      ["0", "Not started", 3],
      ["1-25", "1–25%", 1],
      ["26-50", "26–50%", 0],
      ["51-74", "51–74%", 0],
      ["75-99", "75–99%", 0],
      ["100", "Complete", 6],
    ].map(([id, label, count]) => ({ id, label, count })),
    trafficGaps: {
      analyticsCoverageStartedAt: "2026-08-01T00:00:00.000Z",
      zeroTraffic: 1,
      zeroTrafficEligible: 5,
      viewedNoAction: 2,
    },
    moduleAdoption: [
      { id: "links", label: "Links", count: 7 },
      { id: "locations", label: "Locations", count: 5 },
    ],
    unavailable: [
      {
        id: "trial_and_paid_conversion",
        reason: "Current entitlements do not prove paid conversion.",
      },
      {
        id: "historical_backfill",
        reason: "Earlier traffic is not inferred.",
      },
    ],
  }),
  {
    startDate: "2026-08-01",
    endDate: "2026-08-12",
    plan: "all",
    domain: "all",
    cohort: "all",
  },
);

describe("PlatformFunnel", () => {
  it("renders the ordered stage chain with rates and honest elapsed states", () => {
    render(<PlatformFunnel data={data} />);

    expect(
      screen.getByRole("heading", { name: "Signup and activation funnel" }),
    ).toBeTruthy();
    const funnel = screen
      .getByRole("heading", {
        name: "Authoritative stage chain",
      })
      .closest("section");
    expect(funnel).toBeTruthy();
    expect(within(funnel!).getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getAllByText("80% from previous stage").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Elapsed time unavailable").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Registration → publish/)).toBeTruthy();
  });

  it("keeps all product filters native and URL-submittable", () => {
    render(<PlatformFunnel data={data} />);

    expect(screen.getByLabelText("Registered from").getAttribute("name")).toBe(
      "start",
    );
    expect(screen.getByLabelText("Registered to").getAttribute("name")).toBe(
      "end",
    );
    expect(screen.getByRole("combobox", { name: "Plan now" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Domain now" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Signup cohort" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
  });

  it("shows traffic denominators, module adoption, and unsupported scope", () => {
    render(<PlatformFunnel data={data} />);

    expect(
      screen.getByText("Of 5 profiles published after collection began."),
    ).toBeTruthy();
    expect(screen.getByText("Links")).toBeTruthy();
    expect(
      screen.getByText((_, node) => node?.textContent === "7 · 70%"),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Remaining measurement scope" }),
    ).toBeTruthy();
    expect(screen.getByText("trial and paid conversion")).toBeTruthy();
    expect(screen.getByText("historical backfill")).toBeTruthy();
  });
});
