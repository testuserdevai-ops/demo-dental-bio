import { InfoIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import type { AnalyticsMetric } from "@/lib/analytics/dashboard-contract";
import { formatNumber, formatPercent } from "./format";

function MetricValue({ metric }: { metric: AnalyticsMetric }) {
  if (metric.availability !== "available" || metric.value === null) {
    return (
      <div>
        <span className="text-3xl font-bold text-foreground">—</span>
        <p className="mt-1 text-xs text-muted-foreground">
          {metric.availability === "suppressed"
            ? "Hidden for privacy"
            : "Not available"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-3xl font-bold tabular-nums text-foreground">
        {metric.format === "percent"
          ? formatPercent(metric.value)
          : formatNumber(metric.value)}
      </span>
      {metric.change !== null ? (
        <p
          className={`mt-1 text-xs font-semibold ${metric.change >= 0 ? "text-emerald-700" : "text-red-700"}`}
        >
          {metric.change >= 0 ? "+" : ""}
          {formatPercent(metric.change)} vs previous period
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No comparison</p>
      )}
    </div>
  );
}

export function MetricCardGrid({
  metrics,
  showConversionGate = false,
}: {
  metrics: AnalyticsMetric[];
  showConversionGate?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Key metrics">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="min-w-0 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold leading-5 text-muted-foreground">
              {metric.label}
            </h2>
            <span title={metric.definition} aria-label={metric.definition}>
              <InfoIcon aria-hidden="true" size={16} />
            </span>
          </div>
          <MetricValue metric={metric} />
        </article>
      ))}
      {showConversionGate ? (
        <article className="col-span-2 flex min-h-28 items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-5 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-card text-primary">
            <LockSimpleIcon aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Conversion insights
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Upgrade to Pro to see conversion totals, rate, and funnel.
            </p>
          </div>
        </article>
      ) : null}
    </div>
  );
}
