import Link from "next/link";
import type {
  AnalyticsTab,
  OwnerAnalyticsViewModel,
} from "@/lib/analytics/dashboard-contract";
import { cn } from "@/lib/utils";

const LABELS: Record<AnalyticsTab, string> = {
  overview: "Overview",
  content: "Content",
  audience: "Audience",
  conversions: "Conversions",
};

export function AnalyticsTabs({
  model,
  targetUserId,
}: {
  model: OwnerAnalyticsViewModel;
  targetUserId?: string;
}) {
  return (
    <nav aria-label="Analytics sections" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-2xl bg-muted p-1">
        {(Object.keys(LABELS) as AnalyticsTab[]).map((tab) => {
          const params = new URLSearchParams({ tab, range: model.query.range });
          if (targetUserId) params.set("userId", targetUserId);
          const active = model.query.tab === tab;
          return (
            <Link
              key={tab}
              href={`/dashboard/analytics?${params.toString()}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-11 rounded-xl px-4 py-3 text-center text-sm font-semibold no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {LABELS[tab]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
