import Link from "next/link";
import type {
  CampaignPerformanceRow,
  ConversionGoalPerformanceRow,
} from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";

const format = (value: number | null, suffix = "") =>
  value === null ? "—" : `${value.toLocaleString()}${suffix}`;

export function ConversionGoalTable({
  rows,
  targetUserId,
}: {
  rows: ConversionGoalPerformanceRow[];
  targetUserId?: string;
}) {
  const href = targetUserId
    ? `/dashboard/analytics/goals?userId=${encodeURIComponent(targetUserId)}`
    : "/dashboard/analytics/goals";
  return (
    <AnalyticsSurface
      title="Conversion goals"
      description="An accepted event counts only when it matches an enabled goal created before that event."
    >
      <div className="mb-4 flex justify-end">
        <Link
          href={href}
          className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Manage goals
        </Link>
      </div>
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{row.name}</p>
              {row.isPrimary ? (
                <span className="rounded-full bg-primary-5 px-2 py-0.5 text-xs font-semibold text-primary">
                  Primary
                </span>
              ) : null}
              {!row.enabled ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  Disabled
                </span>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Conversions</dt>
                <dd className="font-semibold">{format(row.conversions)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Unique</dt>
                <dd className="font-semibold">
                  {format(row.uniqueConverters)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rate</dt>
                <dd className="font-semibold">
                  {format(row.conversionRate, "%")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Event</dt>
                <dd className="break-words font-medium">
                  {row.eventType.replace(/_/g, " ")}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Goal</th>
              <th className="px-3 py-3 font-medium">Event</th>
              <th className="px-3 py-3 text-right font-medium">Conversions</th>
              <th className="px-3 py-3 text-right font-medium">Unique</th>
              <th className="px-3 py-3 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-3 font-semibold">
                  {row.name}
                  {row.isPrimary ? " · Primary" : ""}
                  {!row.enabled ? " · Disabled" : ""}
                </td>
                <td className="px-3 py-3">
                  {row.eventType.replace(/_/g, " ")}
                </td>
                <td className="px-3 py-3 text-right">
                  {format(row.conversions)}
                </td>
                <td className="px-3 py-3 text-right">
                  {format(row.uniqueConverters)}
                </td>
                <td className="px-3 py-3 text-right">
                  {format(row.conversionRate, "%")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalyticsSurface>
  );
}

export function CampaignPerformanceTable({
  rows,
}: {
  rows: CampaignPerformanceRow[];
}) {
  return (
    <AnalyticsSurface
      title="Campaign performance"
      description="Last non-direct DentalBio touch within each goal's attribution window. Direct visits do not overwrite a known eligible campaign."
    >
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border p-4">
            <p className="break-words font-semibold">{row.campaign}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.source} / {row.medium}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Visitors</dt>
                <dd className="font-semibold">{format(row.visitors)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Clicks</dt>
                <dd className="font-semibold">{format(row.clicks)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CTR</dt>
                <dd className="font-semibold">{format(row.ctr, "%")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Conversions</dt>
                <dd className="font-semibold">{format(row.conversions)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Conversion rate</dt>
                <dd className="font-semibold">
                  {format(row.conversionRate, "%")}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Campaign</th>
              <th className="px-3 py-3 font-medium">Source / medium</th>
              <th className="px-3 py-3 text-right font-medium">Visitors</th>
              <th className="px-3 py-3 text-right font-medium">Clicks</th>
              <th className="px-3 py-3 text-right font-medium">CTR</th>
              <th className="px-3 py-3 text-right font-medium">Conversions</th>
              <th className="px-3 py-3 text-right font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-3 py-3 font-semibold">{row.campaign}</td>
                <td className="px-3 py-3">
                  {row.source} / {row.medium}
                </td>
                <td className="px-3 py-3 text-right">{format(row.visitors)}</td>
                <td className="px-3 py-3 text-right">{format(row.clicks)}</td>
                <td className="px-3 py-3 text-right">{format(row.ctr, "%")}</td>
                <td className="px-3 py-3 text-right">
                  {format(row.conversions)}
                </td>
                <td className="px-3 py-3 text-right">
                  {format(row.conversionRate, "%")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalyticsSurface>
  );
}
