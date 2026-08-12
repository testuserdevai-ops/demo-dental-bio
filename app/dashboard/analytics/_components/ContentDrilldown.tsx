import Link from "next/link";
import type { OwnerAnalyticsViewModel } from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";
import { formatDateTime, formatNumber, formatPercent } from "./format";

export function ContentDrilldown({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  if (!model.query.content) return null;
  const selection = model.query.content;
  const row = model.content.find(
    (candidate) =>
      candidate.actionType === selection.actionType &&
      candidate.entityId === selection.entityId,
  );
  const backParams = new URLSearchParams({
    tab: "content",
    range: model.query.range,
  });
  if (targetUserId) backParams.set("userId", targetUserId);

  return (
    <AnalyticsSurface
      title={row?.title ?? "Content analytics"}
      description={
        row
          ? `Performance for this ${row.type.toLowerCase()} in the selected UTC date range.`
          : "This content has no accepted activity in the selected UTC date range."
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {row?.deleted ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Deleted · historical activity
          </span>
        ) : null}
        <Link
          href={`/dashboard/analytics?${backParams.toString()}`}
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to all content
        </Link>
        {selection.actionType === "link_click" ? (
          <Link
            href={
              targetUserId
                ? `/dashboard/links?userId=${encodeURIComponent(targetUserId)}`
                : "/dashboard/links"
            }
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Manage links
          </Link>
        ) : null}
      </div>
      {row ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted p-4">
            <dt className="text-xs font-semibold text-muted-foreground">
              Clicks
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {formatNumber(row.clicks)}
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <dt className="text-xs font-semibold text-muted-foreground">
              Unique clickers
            </dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {row.uniqueClickers === null
                ? "—"
                : formatNumber(row.uniqueClickers)}
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <dt className="text-xs font-semibold text-muted-foreground">CTR</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">
              {row.ctr === null ? "—" : formatPercent(row.ctr)}
            </dd>
          </div>
          <div className="rounded-xl bg-muted p-4">
            <dt className="text-xs font-semibold text-muted-foreground">
              Last active
            </dt>
            <dd className="mt-1 text-sm font-bold text-foreground">
              {row.lastActiveAt
                ? formatDateTime(row.lastActiveAt, model.query.timezone)
                : "—"}
            </dd>
          </div>
        </dl>
      ) : null}
    </AnalyticsSurface>
  );
}
