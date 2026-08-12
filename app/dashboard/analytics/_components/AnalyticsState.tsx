import Link from "next/link";
import {
  ArrowClockwiseIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { buttonVariants } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-5 text-primary">
        <ShareNetworkIcon aria-hidden="true" size={24} />
      </span>
      <h2 className="mt-4 text-xl font-bold text-foreground">
        Your analytics will appear here
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Share your public profile to start collecting real visitor activity.
        Dashboard previews are excluded.
      </p>
      <Link
        href={`/${username}`}
        className={cn(buttonVariants(), "mt-5 min-h-11 no-underline")}
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
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-4 min-h-11 no-underline",
        )}
      >
        <ArrowClockwiseIcon aria-hidden="true" size={18} />
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
