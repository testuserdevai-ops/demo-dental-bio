import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  analyticsActionClassName,
  analyticsOutlineActionClassName,
} from "./action-style";

export function AnalyticsLoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading analytics" aria-busy="true">
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}

export function AnalyticsEmptyState({ username }: { username: string }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
      <span
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-full bg-primary-5 text-lg font-bold text-primary"
      >
        ↗
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">
        Your analytics will appear here
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Share your public profile to start collecting real visitor activity.
        Dashboard previews are excluded.
      </p>
      <Link
        href="/dashboard/share"
        className={`${analyticsActionClassName} mt-5`}
      >
        Share profile
      </Link>
      <Link
        href={`/${username}`}
        className={`${analyticsOutlineActionClassName} ml-2 mt-5`}
      >
        View public profile
      </Link>
    </section>
  );
}

export function AnalyticsErrorState({ message }: { message?: string }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Analytics could not be loaded</AlertTitle>
      <AlertDescription>
        {message ??
          "Your filters are still selected. Try loading the data again."}
      </AlertDescription>
      <Link
        href="/dashboard/analytics"
        className={`${analyticsOutlineActionClassName} mt-4`}
      >
        Retry
      </Link>
    </Alert>
  );
}

export function AnalyticsProcessingState() {
  return (
    <Alert variant="warning">
      <AlertTitle>Recent activity is still processing</AlertTitle>
      <AlertDescription>
        Totals show the last completed aggregate. New activity is not shown as
        zero.
      </AlertDescription>
    </Alert>
  );
}

export function AnalyticsUnavailableState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Alert>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
