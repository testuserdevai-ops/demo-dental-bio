import { ClockIcon, DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/app/components/ui/button";
import type { OwnerAnalyticsViewModel } from "@/lib/analytics/dashboard-contract";
import { formatDateTime } from "./format";

export function AnalyticsHeader({ model }: { model: OwnerAnalyticsViewModel }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-primary-5 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            {model.plan}
          </span>
          {model.stale ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Processing
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Analytics
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
          See how patients discover and act on your profile.
        </p>
        {model.dataThrough ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon aria-hidden="true" size={15} />
            Data through{" "}
            {formatDateTime(model.dataThrough, model.query.timezone)}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={model.plan !== "premium"}
        title={
          model.plan !== "premium"
            ? "Export is available on Premium"
            : undefined
        }
        className="min-h-11 w-full sm:w-auto"
      >
        <DownloadSimpleIcon aria-hidden="true" size={18} />
        Export
      </Button>
    </header>
  );
}
