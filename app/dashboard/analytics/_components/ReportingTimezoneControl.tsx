"use client";

import { useState, useTransition } from "react";
import { saveAnalyticsTimezone } from "../actions";

const TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export function ReportingTimezoneControl({
  timezone,
  targetUserId,
}: {
  timezone: string;
  targetUserId?: string;
}) {
  const [selected, setSelected] = useState(timezone);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const options = TIMEZONES.includes(timezone as (typeof TIMEZONES)[number])
    ? TIMEZONES
    : ([timezone, ...TIMEZONES] as readonly string[]);

  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-semibold text-foreground">
        Reporting timezone
        <select
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setMessage("");
          }}
          className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={isPending || selected === timezone}
        onClick={() => {
          setMessage("");
          startTransition(async () => {
            const result = await saveAnalyticsTimezone(targetUserId, selected);
            setMessage(
              result.ok ? "Reporting timezone saved." : result.message,
            );
          });
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {isPending ? "Saving…" : "Save timezone"}
      </button>
      <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
        Timestamps use this setting. Daily totals and date-range boundaries use
        UTC so historical reports reconcile consistently.
      </p>
      <p
        className="min-h-5 text-xs font-medium text-muted-foreground sm:col-span-2"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
