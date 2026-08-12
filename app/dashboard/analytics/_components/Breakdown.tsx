import type { BreakdownRow } from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";
import { formatNumber, formatPercent } from "./format";

export function Breakdown({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: BreakdownRow[];
}) {
  return (
    <AnalyticsSurface title={title} description={description}>
      <div className="space-y-3" aria-hidden="true">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate font-medium text-foreground">
                {row.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.availability === "suppressed" || row.count === null
                  ? "Privacy protected"
                  : formatNumber(row.count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${row.availability === "suppressed" ? 0 : (row.percentage ?? 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title} data</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Count</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th>{row.label}</th>
              <td>
                {row.availability === "suppressed" || row.count === null
                  ? "Privacy protected"
                  : formatNumber(row.count)}
              </td>
              <td>
                {row.percentage === null ? "—" : formatPercent(row.percentage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AnalyticsSurface>
  );
}
