"use client";

import { useMemo, useState } from "react";
import type { AnalyticsTrendPoint } from "@/lib/analytics/dashboard-contract";
import { AnalyticsSurface } from "./AnalyticsSurface";
import { formatDate, formatNumber } from "./format";

type TrendMetric = "views" | "uniqueVisitors" | "clicks" | "conversions";

const METRICS: Array<{
  id: TrendMetric;
  label: string;
  color: string;
  dash?: string;
}> = [
  { id: "views", label: "Views", color: "#5046db" },
  {
    id: "uniqueVisitors",
    label: "Unique visitors",
    color: "#0f766e",
    dash: "8 5",
  },
  { id: "clicks", label: "Clicks", color: "#b45309" },
  {
    id: "conversions",
    label: "Conversions",
    color: "#be185d",
    dash: "3 4",
  },
];

function metricValue(point: AnalyticsTrendPoint, metric: TrendMetric) {
  return point[metric] ?? 0;
}

function buildPoints(
  points: AnalyticsTrendPoint[],
  metric: TrendMetric,
  maximum: number,
) {
  return points
    .map((point, index) => {
      const x =
        points.length === 1 ? 300 : 20 + (index / (points.length - 1)) * 560;
      const y = 160 - (metricValue(point, metric) / maximum) * 140;
      return `${x},${y}`;
    })
    .join(" ");
}

export function AnalyticsTrendChart({
  points,
}: {
  points: AnalyticsTrendPoint[];
}) {
  const availableMetrics = METRICS.filter(
    (metric) =>
      (metric.id !== "conversions" ||
        points.some((point) => point.conversions !== undefined)) &&
      (metric.id !== "uniqueVisitors" ||
        points.every((point) => point.uniqueVisitors !== null)),
  );
  const [selected, setSelected] = useState<TrendMetric[]>(["views", "clicks"]);
  const maximum = useMemo(
    () =>
      Math.max(
        1,
        ...points.flatMap((point) =>
          availableMetrics.map((metric) => metricValue(point, metric.id)),
        ),
      ),
    [availableMetrics, points],
  );

  const toggle = (metric: TrendMetric) => {
    setSelected((current) =>
      current.includes(metric)
        ? current.length === 1
          ? current
          : current.filter((value) => value !== metric)
        : [...current, metric],
    );
  };

  const summary = selected
    .map((metric) => {
      const label = METRICS.find((item) => item.id === metric)?.label ?? metric;
      const total = points.reduce(
        (sum, point) => sum + metricValue(point, metric),
        0,
      );
      return `${label}: ${formatNumber(total)}`;
    })
    .join(". ");

  return (
    <AnalyticsSurface
      title="Reach and action trend"
      description="Daily activity for the selected range. Choose at least one metric."
    >
      <fieldset className="mb-4 flex flex-wrap gap-2">
        <legend className="sr-only">Trend metrics</legend>
        {availableMetrics.map((metric) => {
          const active = selected.includes(metric.id);
          return (
            <label
              key={metric.id}
              className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${active ? "border-primary bg-primary-5 text-primary" : "border-border text-muted-foreground"}`}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={active}
                onChange={() => toggle(metric.id)}
              />
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </label>
          );
        })}
      </fieldset>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
      <div className="overflow-hidden rounded-xl bg-muted/50 p-2">
        <svg
          viewBox="0 0 600 180"
          className="h-auto w-full"
          role="img"
          aria-label={`Analytics trend. ${summary}`}
        >
          {[20, 90, 160].map((y) => (
            <line
              key={y}
              x1="20"
              x2="580"
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
            />
          ))}
          {availableMetrics
            .filter((metric) => selected.includes(metric.id))
            .map((metric) => (
              <polyline
                key={metric.id}
                points={buildPoints(points, metric.id, maximum)}
                fill="none"
                stroke={metric.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={metric.dash}
              />
            ))}
        </svg>
      </div>
      <details className="mt-3 rounded-xl border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          View trend as a table
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <caption className="sr-only">Daily analytics trend values</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Date</th>
                {availableMetrics.map((metric) => (
                  <th
                    key={metric.id}
                    className="px-3 py-2 text-right font-semibold"
                  >
                    {metric.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.bucket} className="border-b border-border/60">
                  <th className="py-2 pr-3 font-medium">
                    {formatDate(point.bucket)}
                  </th>
                  {availableMetrics.map((metric) => (
                    <td
                      key={metric.id}
                      className="px-3 py-2 text-right tabular-nums"
                    >
                      {metric.id === "uniqueVisitors" &&
                      point.uniqueVisitors === null
                        ? "—"
                        : formatNumber(metricValue(point, metric.id))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </AnalyticsSurface>
  );
}
