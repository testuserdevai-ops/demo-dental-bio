"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TopContentRow } from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";
import { formatDate, formatNumber, formatPercent } from "./format";

type Sort = "clicks" | "ctr" | "conversions";

export function TopContentTable({
  rows,
  range,
  targetUserId,
}: {
  rows: TopContentRow[];
  range: string;
  targetUserId?: string;
}) {
  const [sort, setSort] = useState<Sort>("clicks");
  const sortedRows = useMemo(
    () =>
      [...rows].sort(
        (left, right) =>
          (right[sort] ?? Number.NEGATIVE_INFINITY) -
          (left[sort] ?? Number.NEGATIVE_INFINITY),
      ),
    [rows, sort],
  );

  const drilldownHref = (row: TopContentRow) => {
    const params = new URLSearchParams({
      tab: "content",
      range,
      link: row.id,
    });
    if (targetUserId) params.set("userId", targetUserId);
    return `/dashboard/analytics?${params.toString()}`;
  };

  return (
    <AnalyticsSurface
      title="Top content"
      description="Select a row for a stable, shareable content drill-down."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sort by
        </span>
        {(["clicks", "ctr", "conversions"] as Sort[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            aria-pressed={sort === value}
            className={`min-h-10 rounded-full border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${sort === value ? "border-primary bg-primary-5 text-primary" : "border-border text-muted-foreground"}`}
          >
            {value === "ctr"
              ? "CTR"
              : value.charAt(0).toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {sortedRows.map((row) => (
          <Link
            key={row.id}
            href={drilldownHref(row)}
            className="block rounded-2xl border border-border p-3 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {row.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.type} · {row.section}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                {row.position === null ? "Removed" : `#${row.position}`}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Clicks</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatNumber(row.clicks)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Clickers</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatNumber(row.uniqueClickers)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">CTR</dt>
                <dd className="mt-0.5 font-bold tabular-nums text-foreground">
                  {formatPercent(row.ctr)}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Content performance ordered by {sort}
          </caption>
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-3 pr-3 font-semibold">Content</th>
              <th className="px-3 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 text-right font-semibold">Position</th>
              <th className="px-3 py-3 text-right font-semibold">Clicks</th>
              <th className="px-3 py-3 text-right font-semibold">Clickers</th>
              <th className="px-3 py-3 text-right font-semibold">CTR</th>
              <th className="px-3 py-3 text-right font-semibold">
                Conversions
              </th>
              <th className="pl-3 py-3 text-right font-semibold">
                Last active
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-b border-border/60">
                <th className="py-3 pr-3 font-medium">
                  <Link
                    href={drilldownHref(row)}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                </th>
                <td className="px-3 py-3 text-muted-foreground">{row.type}</td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.position ?? "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.clicks)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.uniqueClickers)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatPercent(row.ctr)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {row.conversions === undefined
                    ? "—"
                    : formatNumber(row.conversions)}
                </td>
                <td className="pl-3 py-3 text-right text-muted-foreground">
                  {row.lastActiveAt ? formatDate(row.lastActiveAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AnalyticsSurface>
  );
}
