import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAnalyticsCsv,
  type AnalyticsExportDataset,
  type AnalyticsExportRows,
} from "@/lib/analytics/csv-export";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  readOwnerAnalyticsAudience,
  readOwnerAnalyticsContent,
  readOwnerAnalyticsSummary,
  readOwnerCampaignPerformance,
  readOwnerConversionGoalPerformance,
  recordOwnerAnalyticsExport,
  type AnalyticsDateRange,
} from "@/lib/analytics/repository";
import {
  parseAnalyticsQuery,
  rangesForPlan,
} from "@/app/dashboard/analytics/_lib/query";
import {
  analyticsPlanFromSubscription,
  resolveAnalyticsDateRanges,
} from "@/app/dashboard/analytics/_lib/repository";

const requestSchema = z.object({
  dataset: z.enum([
    "overview",
    "content",
    "conversions",
    "campaigns",
    "audience",
  ]),
  range: z.enum(["7d", "30d", "90d", "365d"]),
  timezone: z.literal("UTC"),
  userId: z.string().uuid().optional(),
});

async function readDataset<D extends AnalyticsExportDataset>(
  dataset: D,
  profileId: string,
  range: AnalyticsDateRange,
): Promise<AnalyticsExportRows[D]> {
  switch (dataset) {
    case "overview":
      return (await readOwnerAnalyticsSummary(
        profileId,
        range,
      )) as AnalyticsExportRows[D];
    case "content":
      return (await readOwnerAnalyticsContent(
        profileId,
        range,
      )) as AnalyticsExportRows[D];
    case "conversions":
      return (await readOwnerConversionGoalPerformance(
        profileId,
        range,
      )) as AnalyticsExportRows[D];
    case "campaigns":
      return (await readOwnerCampaignPerformance(
        profileId,
        range,
      )) as AnalyticsExportRows[D];
    case "audience":
      return (await readOwnerAnalyticsAudience(profileId, range))
        .rows as AnalyticsExportRows[D];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = requestSchema.safeParse({
    dataset: url.searchParams.get("dataset"),
    range: url.searchParams.get("range"),
    timezone: url.searchParams.get("timezone"),
    userId: url.searchParams.get("userId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid export request" },
      { status: 400 },
    );
  }
  try {
    const identity = await resolveDashboardIdentity(parsed.data.userId);
    const plan = analyticsPlanFromSubscription(
      identity.shell.subscriptionStatus,
    );
    if (plan !== "premium") {
      return NextResponse.json(
        { error: "Export is available on Premium" },
        { status: 403 },
      );
    }
    const query = parseAnalyticsQuery({ range: parsed.data.range }, plan);
    if (!rangesForPlan(plan).includes(query.range)) {
      return NextResponse.json({ error: "Range unavailable" }, { status: 403 });
    }
    const range = resolveAnalyticsDateRanges(query.range, new Date()).current;
    const rows = await readDataset(
      parsed.data.dataset,
      identity.scope.effectiveUserId,
      range,
    );
    const generatedAt = new Date().toISOString();
    const csv = createAnalyticsCsv({
      dataset: parsed.data.dataset,
      profileId: identity.scope.effectiveUserId,
      startDate: range.startDate,
      endDate: range.endDate,
      timezone: parsed.data.timezone,
      generatedAt,
      rows,
    });
    await recordOwnerAnalyticsExport({
      profileId: identity.scope.effectiveUserId,
      dataset: parsed.data.dataset,
      range,
      timezone: parsed.data.timezone,
      rowCount: rows.length,
    });
    const filename = `dentalbio-${parsed.data.dataset}-${range.startDate}-${range.endDate}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Export unavailable" }, { status: 403 });
  }
}
