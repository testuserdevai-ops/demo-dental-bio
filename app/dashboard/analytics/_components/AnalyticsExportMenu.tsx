"use client";

import { useState } from "react";
import type { OwnerAnalyticsViewModel } from "@/lib/analytics/dashboard-contract";
import { Button } from "@/app/components/ui/button";

const DATASETS = [
  ["overview", "Overview by day"],
  ["content", "Content performance"],
  ["conversions", "Conversion goals"],
  ["campaigns", "Campaign performance"],
  ["audience", "Audience aggregates"],
] as const;

export function AnalyticsExportMenu({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dataset, setDataset] =
    useState<(typeof DATASETS)[number][0]>("overview");
  if (model.plan !== "premium") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        title="Export is available on Premium"
        className="w-full sm:w-auto"
      >
        Export CSV
      </Button>
    );
  }
  const params = new URLSearchParams({
    dataset,
    range: model.query.range,
    timezone: model.query.timezone,
  });
  if (targetUserId) params.set("userId", targetUserId);
  return (
    <div className="relative w-full sm:w-auto">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        aria-expanded={open}
        aria-controls="analytics-export-options"
        onClick={() => setOpen((current) => !current)}
      >
        Export CSV
      </Button>
      {open ? (
        <div
          id="analytics-export-options"
          className="mt-2 w-full space-y-3 rounded-xl border bg-white p-3 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:w-72"
        >
          <label
            className="block text-sm font-semibold"
            htmlFor="export-dataset"
          >
            Dataset
          </label>
          <select
            id="export-dataset"
            value={dataset}
            onChange={(event) =>
              setDataset(event.target.value as typeof dataset)
            }
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 text-sm"
          >
            {DATASETS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <a
            href={`/api/dashboard/analytics/export?${params.toString()}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Download CSV
          </a>
          <p className="text-xs leading-4 text-muted-foreground">
            Uses the active range and UTC reporting timezone. Visitor IDs,
            contact details, enquiry text, and clinical information are never
            exported.
          </p>
        </div>
      ) : null}
    </div>
  );
}
