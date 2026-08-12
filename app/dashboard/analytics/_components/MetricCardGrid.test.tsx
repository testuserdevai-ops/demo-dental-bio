import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import type { AnalyticsMetric } from "@/lib/analytics/dashboard-contract";
import { MetricCardGrid } from "./MetricCardGrid";

const metrics: AnalyticsMetric[] = [
  {
    id: "conversions",
    label: "Conversions",
    value: 1,
    format: "number",
    change: null,
    availability: "available",
    definition: "Configured conversions.",
  },
  {
    id: "uniqueConverters",
    label: "Unique converters",
    value: 1,
    format: "number",
    change: null,
    availability: "available",
    definition: "Distinct converters.",
  },
];

describe("MetricCardGrid", () => {
  it("gives repeated values stable metric-card labels", () => {
    render(<MetricCardGrid metrics={metrics} />);

    expect(screen.getByLabelText("Conversions metric").textContent).toContain(
      "1",
    );
    expect(
      screen.getByLabelText("Unique converters metric").textContent,
    ).toContain("1");
  });
});
