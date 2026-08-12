import type { OwnerAnalyticsViewModel } from "@/lib/analytics/dashboard-contract";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsHeader } from "./AnalyticsHeader";
import {
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsProcessingState,
  AnalyticsUnavailableState,
} from "./AnalyticsState";
import { AnalyticsTabs } from "./AnalyticsTabs";
import { AnalyticsTrendChart } from "./AnalyticsTrendChart";
import { Breakdown } from "./Breakdown";
import { ConversionFunnel } from "./ConversionFunnel";
import { ContentDrilldown } from "./ContentDrilldown";
import {
  CampaignPerformanceTable,
  ConversionGoalTable,
} from "./ConversionPerformance";
import { MetricCardGrid } from "./MetricCardGrid";
import { PlanGate } from "./PlanGate";
import { TopContentTable } from "./TopContentTable";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { analyticsActionClassName } from "./action-style";

function AnalyticsInsight({ model }: { model: OwnerAnalyticsViewModel }) {
  if (!model.insight) return null;
  return (
    <Alert variant="warning">
      <AlertTitle>{model.insight.title}</AlertTitle>
      <AlertDescription>{model.insight.description}</AlertDescription>
      <Link
        className={`${analyticsActionClassName} mt-4`}
        href={model.insight.actionHref}
      >
        {model.insight.actionLabel}
      </Link>
    </Alert>
  );
}

function OverviewTab({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  return (
    <div className="space-y-4">
      <MetricCardGrid
        metrics={model.metrics}
        showConversionGate={model.plan === "free"}
      />
      <AnalyticsTrendChart points={model.trend} />
      <Breakdown
        title="Patient intent"
        description="Configured actions patients used from your profile."
        rows={model.patientIntent}
      />
      {model.funnel ? (
        <ConversionFunnel stages={model.funnel} />
      ) : model.plan !== "free" ? (
        <AnalyticsUnavailableState
          title="Conversion funnel unavailable"
          description="A reliable funnel needs privacy-safe visitor identifiers. Conversion counts are not shown as a false funnel when that identity is absent."
        />
      ) : (
        <PlanGate
          title="Understand the path to enquiry"
          description="Pro shows how visitors move from a profile view to engagement, primary CTA clicks, and enquiries."
          targetUserId={targetUserId}
        />
      )}
    </div>
  );
}

function ContentTab({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  const topContent = model.content.slice(0, 5).map((row) => ({
    id: row.id,
    label: row.title,
    count: row.clicks,
    percentage:
      model.content[0]?.clicks > 0
        ? Number(((row.clicks / model.content[0].clicks) * 100).toFixed(1))
        : 0,
  }));
  const positions = model.content
    .filter((row) => row.position !== null)
    .map((row) => ({
      id: row.id,
      label: `Visible position ${row.position}`,
      count: row.uniqueClickers,
      percentage: row.ctr,
    }));

  return (
    <div className="space-y-4">
      <ContentDrilldown model={model} targetUserId={targetUserId} />
      <Breakdown
        title="Top-content clicks"
        description="Relative click volume for your five most active items."
        rows={topContent}
      />
      <TopContentTable
        rows={model.content}
        range={model.query.range}
        targetUserId={targetUserId}
      />
      <Breakdown
        title="Performance by visible position"
        description="Observed click rate by position; this does not prove that position caused the result."
        rows={positions}
      />
    </div>
  );
}

function AudienceTab({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  if (model.plan === "free") {
    return (
      <PlanGate
        title="Meet your audience"
        description="Pro unlocks privacy-safe referrer, device, and country breakdowns for the selected date range."
        targetUserId={targetUserId}
      />
    );
  }

  return (
    <div className="space-y-4">
      {model.referrers?.length ? (
        <Breakdown title="Referrers" rows={model.referrers} />
      ) : (
        <AnalyticsUnavailableState
          title="Referrer data is unavailable"
          description="No privacy-safe referrer aggregate is available for this range."
        />
      )}
      {model.devices?.length ? (
        <Breakdown title="Devices" rows={model.devices} />
      ) : (
        <AnalyticsUnavailableState
          title="Device data is unavailable"
          description="No privacy-safe device aggregate is available for this range."
        />
      )}
      <AnalyticsUnavailableState
        title="Geography is unavailable"
        description="Precise visitor geography is not collected by the current privacy-safe reporting source."
      />
    </div>
  );
}

function ConversionsTab({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  if (model.plan === "free") {
    return (
      <PlanGate
        title="Measure patient intent"
        description="Pro unlocks conversion totals, trends, action breakdowns, and the visitor-to-enquiry funnel."
        targetUserId={targetUserId}
      />
    );
  }
  const conversionMetrics = model.metrics.filter(
    (metric) =>
      metric.id === "conversions" ||
      metric.id === "uniqueConverters" ||
      metric.id === "conversionRate" ||
      metric.id === "primaryConversions" ||
      metric.id === "primaryConversionRate",
  );
  const conversionActions = model.content
    .filter((row) => row.conversions !== undefined)
    .map((row) => ({
      id: row.id,
      label: row.title,
      count: row.conversions ?? 0,
      percentage:
        (model.metrics.find((metric) => metric.id === "conversions")?.value ??
          0) > 0
          ? Number(
              (
                ((row.conversions ?? 0) /
                  (model.metrics.find((metric) => metric.id === "conversions")
                    ?.value ?? 1)) *
                100
              ).toFixed(1),
            )
          : 0,
    }));

  return (
    <div className="space-y-4">
      <MetricCardGrid metrics={conversionMetrics} />
      <AnalyticsTrendChart points={model.trend} />
      {model.funnel ? (
        <ConversionFunnel stages={model.funnel} />
      ) : (
        <AnalyticsUnavailableState
          title="Conversion funnel unavailable"
          description="Conversion events exist, but a reliable visitor funnel needs privacy-safe visitor identifiers."
        />
      )}
      <Breakdown title="Conversions by action" rows={conversionActions} />
      {model.conversionGoals?.length ? (
        <ConversionGoalTable
          rows={model.conversionGoals}
          targetUserId={targetUserId}
        />
      ) : (
        <AnalyticsUnavailableState
          title="No conversion goals are configured"
          description="Set up a supported conversion goal to classify future events. Historical events are not reclassified."
        />
      )}
      {model.campaigns?.length ? (
        <CampaignPerformanceTable rows={model.campaigns} />
      ) : (
        <AnalyticsUnavailableState
          title="No attributed campaigns yet"
          description="Add campaign tracking to a link or share a supported tagged profile URL. Visits without an eligible identifier remain unattributed."
        />
      )}
      {model.referrers ? (
        <Breakdown
          title="Conversions by source"
          description="Source reporting is shown only when attribution data is present."
          rows={model.referrers}
        />
      ) : null}
    </div>
  );
}

export function AnalyticsWorkspace({
  model,
  username,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  username: string;
  targetUserId?: string;
}) {
  return (
    <div className="min-w-0 max-w-full space-y-5 pb-12">
      <AnalyticsHeader model={model} targetUserId={targetUserId} />
      <AnalyticsFilters model={model} targetUserId={targetUserId} />
      <AnalyticsTabs model={model} targetUserId={targetUserId} />
      <AnalyticsInsight model={model} />
      {model.stale || model.state === "processing" ? (
        <AnalyticsProcessingState />
      ) : null}
      {model.state === "empty" &&
      !model.query.content &&
      model.query.tab !== "conversions" ? (
        <AnalyticsEmptyState username={username} />
      ) : model.state === "error" ? (
        <AnalyticsErrorState message={model.errorMessage} />
      ) : model.query.tab === "content" ? (
        <ContentTab model={model} targetUserId={targetUserId} />
      ) : model.query.tab === "audience" ? (
        <AudienceTab model={model} targetUserId={targetUserId} />
      ) : model.query.tab === "conversions" ? (
        <ConversionsTab model={model} targetUserId={targetUserId} />
      ) : (
        <OverviewTab model={model} targetUserId={targetUserId} />
      )}
    </div>
  );
}
