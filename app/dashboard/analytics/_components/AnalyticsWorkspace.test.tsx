import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { OwnerAnalyticsViewModel } from "@/lib/analytics/dashboard-contract";
import { AnalyticsWorkspace } from "./AnalyticsWorkspace";

const base: OwnerAnalyticsViewModel = {
  profileId: "00000000-0000-4000-8000-000000000001",
  plan: "pro",
  state: "ready",
  query: { tab: "overview", range: "30d", timezone: "Africa/Cairo" },
  permittedRanges: ["7d", "30d", "90d", "365d"],
  dataThrough: "2026-08-12T18:00:00.000Z",
  lastUpdatedAt: "2026-08-12T18:04:00.000Z",
  stale: false,
  metrics: [
    {
      id: "views",
      label: "Views",
      value: 30,
      format: "number",
      change: 10,
      availability: "available",
      definition: "Accepted profile views during this date range.",
    },
    {
      id: "uniqueVisitors",
      label: "Unique visitors",
      value: 20,
      format: "number",
      change: null,
      availability: "available",
      definition: "Distinct privacy-safe visitors.",
    },
    {
      id: "clicks",
      label: "Clicks",
      value: 10,
      format: "number",
      change: -5,
      availability: "available",
      definition: "Accepted counted actions.",
    },
    {
      id: "clickRate",
      label: "Profile click rate",
      value: 35,
      format: "percent",
      change: 2,
      availability: "available",
      definition: "Unique clickers divided by visitors.",
    },
    {
      id: "conversions",
      label: "Conversions",
      value: 2,
      format: "number",
      change: null,
      availability: "available",
      definition: "Configured accepted conversion events.",
    },
    {
      id: "conversionRate",
      label: "Conversion rate",
      value: 10,
      format: "percent",
      change: null,
      availability: "available",
      definition: "Converting visitors divided by visitors.",
    },
  ],
  trend: [
    {
      bucket: "2026-08-11",
      views: 12,
      uniqueVisitors: 8,
      clicks: 3,
      conversions: 1,
    },
    {
      bucket: "2026-08-12",
      views: 18,
      uniqueVisitors: 12,
      clicks: 7,
      conversions: 1,
    },
  ],
  patientIntent: [
    { id: "booking", label: "Booking clicks", count: 6, percentage: 60 },
    { id: "phone", label: "Phone taps", count: 4, percentage: 40 },
  ],
  content: [
    {
      id: "second",
      title: "Second link",
      type: "Link",
      section: "Links",
      position: 2,
      clicks: 4,
      uniqueClickers: 3,
      ctr: 15,
      conversions: 0,
      lastActiveAt: "2026-08-11",
    },
    {
      id: "first",
      title: "First link",
      type: "Link",
      section: "Links",
      position: 1,
      clicks: 6,
      uniqueClickers: 5,
      ctr: 25,
      conversions: 2,
      lastActiveAt: "2026-08-12",
    },
  ],
  funnel: [
    {
      id: "visitors",
      label: "Unique profile visitors",
      count: 20,
      previousStepRate: null,
    },
    {
      id: "engaged",
      label: "Engaged visitors",
      count: 7,
      previousStepRate: 35,
    },
  ],
  referrers: [
    { id: "direct", label: "Direct / Unknown", count: 12, percentage: 60 },
  ],
  devices: [{ id: "mobile", label: "Mobile", count: 15, percentage: 75 }],
  geography: [
    { id: "gb", label: "United Kingdom", count: 14, percentage: 70 },
    {
      id: "small",
      label: "Other countries",
      count: null,
      percentage: null,
      availability: "suppressed",
    },
  ],
};

describe("AnalyticsWorkspace", () => {
  afterEach(cleanup);

  it("preserves range and dashboard target while switching tabs", () => {
    render(
      <AnalyticsWorkspace
        model={base}
        username="owner"
        targetUserId="00000000-0000-4000-8000-000000000009"
      />,
    );
    const content = screen.getByRole("link", { name: "Content" });
    expect(content.getAttribute("href")).toContain("tab=content");
    expect(content.getAttribute("href")).toContain("range=30d");
    expect(content.getAttribute("href")).toContain(
      "userId=00000000-0000-4000-8000-000000000009",
    );
    expect(screen.getAllByText("Views").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "A booking click is patient intent, not a completed appointment.",
      ),
    ).toBeTruthy();
  });

  it("renders privacy suppression without turning it into zero", () => {
    render(
      <AnalyticsWorkspace
        model={{
          ...base,
          query: { ...base.query, tab: "audience" },
          referrers: [
            ...(base.referrers ?? []),
            {
              id: "small",
              label: "Other",
              count: null,
              percentage: null,
              availability: "suppressed",
            },
          ],
        }}
        username="owner"
      />,
    );
    expect(screen.getAllByText("Privacy protected").length).toBeGreaterThan(0);
    expect(screen.queryByText("0", { exact: true })).toBeNull();
  });

  it("uses compact content cards and supports deterministic sorting", () => {
    render(
      <AnalyticsWorkspace
        model={{ ...base, query: { ...base.query, tab: "content" } }}
        username="owner"
      />,
    );
    expect(screen.getAllByText("First link").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "CTR" }));
    expect(
      screen.getByRole("button", { name: "CTR" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("keeps gated Free data absent from the rendered response", () => {
    const free: OwnerAnalyticsViewModel = {
      ...base,
      plan: "free",
      permittedRanges: ["7d"],
      query: { ...base.query, tab: "audience", range: "7d" },
      metrics: base.metrics.slice(0, 4),
      referrers: undefined,
      devices: undefined,
      geography: undefined,
      funnel: undefined,
      trend: base.trend.map(({ conversions: _conversions, ...point }) => point),
      content: base.content.map(({ conversions: _conversions, ...row }) => row),
    };
    render(<AnalyticsWorkspace model={free} username="owner" />);
    expect(screen.getByText("Meet your audience")).toBeTruthy();
    expect(screen.queryByText("Direct / Unknown")).toBeNull();
    expect(screen.queryByText("United Kingdom")).toBeNull();
  });

  it("does not upsell Pro for audience data the backend cannot supply", () => {
    render(
      <AnalyticsWorkspace
        model={{
          ...base,
          query: { ...base.query, tab: "audience" },
          referrers: undefined,
          devices: undefined,
          geography: undefined,
        }}
        username="owner"
      />,
    );
    expect(screen.getByText("Referrer data is unavailable")).toBeTruthy();
    expect(screen.getByText("Device data is unavailable")).toBeTruthy();
    expect(screen.getByText("Geography is unavailable")).toBeTruthy();
    expect(screen.queryByText("Explore Pro analytics")).toBeNull();
  });
});
