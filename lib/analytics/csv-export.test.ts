import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
const { analyticsExportColumns, createAnalyticsCsv, PROHIBITED_EXPORT_FIELDS } =
  await import("./csv-export");

describe("analytics CSV export", () => {
  it("uses stable documented campaign columns and UTF-8 metadata", () => {
    const csv = createAnalyticsCsv({
      dataset: "campaigns",
      profileId: "00000000-0000-4000-8000-000000000001",
      startDate: "2026-08-01",
      endDate: "2026-08-12",
      timezone: "UTC",
      generatedAt: "2026-08-12T10:00:00.000Z",
      rows: [
        {
          campaignId: null,
          source: "google",
          medium: "cpc",
          campaign: "summer, smiles",
          profileViews: 10,
          uniqueVisitors: 8,
          clicks: 4,
          uniqueClickers: 3,
          ctr: 37.5,
          conversions: 2,
          uniqueConverters: 2,
          conversionRate: 25,
          lastConversionAt: "2026-08-12T09:00:00.000Z",
        },
      ],
    });
    expect(csv.startsWith("\uFEFF# schema_version=1\r\n")).toBe(true);
    expect(csv).toContain("# timezone=UTC");
    expect(csv).toContain('google,cpc,"summer, smiles"');
  });

  it("never exposes prohibited fields in any dataset schema", () => {
    const allColumns: string[] = [
      "overview",
      "content",
      "conversions",
      "campaigns",
      "audience",
    ].flatMap((dataset) =>
      analyticsExportColumns(
        dataset as Parameters<typeof analyticsExportColumns>[0],
      ),
    );
    expect(
      PROHIBITED_EXPORT_FIELDS.filter((field) =>
        allColumns.includes(field as string),
      ),
    ).toEqual([]);
  });
});
