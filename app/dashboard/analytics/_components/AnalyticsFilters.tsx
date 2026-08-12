import { Button } from "@/app/components/ui/button";
import type {
  AnalyticsRange,
  OwnerAnalyticsViewModel,
} from "@/lib/analytics/dashboard-contract";

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
    <form
      method="get"
      className="grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      aria-label="Analytics filters"
    >
      <input type="hidden" name="tab" value={model.query.tab} />
      {targetUserId ? (
        <input type="hidden" name="userId" value={targetUserId} />
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
      <label className="grid gap-1.5 text-sm font-semibold text-foreground">
        Reporting timezone
        <input
          readOnly
          value={model.query.timezone.replace("_", " ")}
          className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-muted-foreground"
        />
      </label>
      <Button type="submit" variant="secondary" className="min-h-11">
        Apply
      </Button>
    </form>
  );
}
