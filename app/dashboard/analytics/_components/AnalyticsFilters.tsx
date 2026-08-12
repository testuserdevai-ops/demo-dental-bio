import type {
  AnalyticsRange,
  OwnerAnalyticsViewModel,
} from "@/lib/analytics/dashboard-contract";
import { ReportingTimezoneControl } from "./ReportingTimezoneControl";

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last 365 days",
};

export function AnalyticsFilters({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto] sm:items-end"
        aria-label="Analytics filters"
      >
        <input type="hidden" name="tab" value={model.query.tab} />
        {targetUserId ? (
          <input type="hidden" name="userId" value={targetUserId} />
        ) : null}
        {model.query.content ? (
          <>
            <input
              type="hidden"
              name="contentAction"
              value={model.query.content.actionType}
            />
            <input
              type="hidden"
              name="contentId"
              value={model.query.content.entityId}
            />
          </>
        ) : null}
        <label className="grid gap-1.5 text-sm font-semibold text-foreground">
          Date range
          <select
            name="range"
            defaultValue={model.query.range}
            className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {model.permittedRanges.map((range) => (
              <option key={range} value={range}>
                {RANGE_LABELS[range]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-bold text-secondary-foreground hover:bg-primary-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Apply
        </button>
      </form>
      <ReportingTimezoneControl
        timezone={model.query.timezone}
        targetUserId={targetUserId}
      />
    </div>
  );
}
