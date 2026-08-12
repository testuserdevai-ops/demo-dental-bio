import { describe, expect, it } from "bun:test";

import {
  parsePlatformFunnelFilters,
  percentage,
  platformFunnelPayloadSchema,
  toPlatformFunnelModel,
} from "./platform-funnel";

const payload = platformFunnelPayloadSchema.parse({
  schemaVersion: 1,
  cohortSize: 10,
  stages: [
    ["registered", "Registered", 10, null],
    ["verified", "Email verified", 8, 12],
    ["onboarding_completed", "Onboarding complete", 6, null],
    ["profile_published", "Profile published", 5, 180],
    ["first_view", "First qualified view", 4, 60],
    ["first_action", "First outbound action", 2, 5],
  ].map(([id, label, count, medianMinutesFromPrevious]) => ({
    id,
    label,
    count,
    medianMinutesFromPrevious,
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
    analyticsCoverageStartedAt: "2026-08-12T00:00:00.000Z",
    zeroTraffic: 1,
    zeroTrafficEligible: 5,
    viewedNoAction: 2,
  },
  moduleAdoption: [{ id: "links", label: "Links", count: 5 }],
  unavailable: [{ id: "paid", reason: "No paid timestamp." }],
});

describe("platform funnel contract", () => {
  it("parses bounded explicit dates and controlled dimensions", () => {
    expect(
      parsePlatformFunnelFilters(
        {
          start: "2026-08-01",
          end: "2026-08-12",
          plan: "premium",
          domain: "Dental.Bio",
          cohort: "referred",
        },
        new Date("2026-08-12T18:00:00.000Z"),
      ),
    ).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      plan: "premium",
      domain: "dental.bio",
      cohort: "referred",
    });
  });

  it("falls back as one unit for impossible, future, or oversized dates", () => {
    expect(
      parsePlatformFunnelFilters(
        {
          start: "2026-08-20",
          end: "2026-08-10",
          plan: "enterprise",
          domain: "https://bad.example/path",
          cohort: "unknown",
        },
        new Date("2026-08-12T18:00:00.000Z"),
      ),
    ).toEqual({
      startDate: "2026-07-14",
      endDate: "2026-08-12",
      plan: "all",
      domain: "all",
      cohort: "all",
    });
  });

  it("derives rates without presenting an empty denominator as zero", () => {
    expect(percentage(2, 8)).toBe(25);
    expect(percentage(0, 0)).toBeNull();

    const model = toPlatformFunnelModel(payload, {
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      plan: "all",
      domain: "all",
      cohort: "all",
    });
    expect(model.stages[1]?.cohortRate).toBe(80);
    expect(model.stages[1]?.previousStageRate).toBe(80);
    expect(model.stages[5]?.previousStageRate).toBe(50);
    expect(model.moduleAdoption[0]?.rate).toBe(50);
  });

  it("rejects missing unavailable-state explanations", () => {
    expect(
      platformFunnelPayloadSchema.safeParse({ ...payload, unavailable: [] })
        .success,
    ).toBe(true);
    expect(
      platformFunnelPayloadSchema.safeParse({
        ...payload,
        unavailable: [{ id: "paid", reason: "" }],
      }).success,
    ).toBe(false);
  });
});
