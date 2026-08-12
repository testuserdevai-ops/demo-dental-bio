import { describe, expect, it } from "bun:test";

import { comparisonMetric, parseAdminOverviewFilters } from "./overview";

describe("admin overview metrics", () => {
  it("calculates comparable changes without inventing an infinite percentage", () => {
    expect(comparisonMetric(12, 8).changePercent).toBe(50);
    expect(comparisonMetric(0, 0).changePercent).toBe(0);
    expect(comparisonMetric(4, 0).changePercent).toBeNull();
  });

  it("accepts only controlled ranges, plans, and bounded domains", () => {
    expect(
      parseAdminOverviewFilters({
        days: "7",
        plan: "premium",
        domain: "Dental.Bio",
      }),
    ).toEqual({ days: 7, plan: "premium", domain: "dental.bio" });
    expect(
      parseAdminOverviewFilters({
        days: "365",
        plan: "root",
        domain: "https://bad.example/path",
      }),
    ).toEqual({ days: 30, plan: "all", domain: "all" });
  });
});
