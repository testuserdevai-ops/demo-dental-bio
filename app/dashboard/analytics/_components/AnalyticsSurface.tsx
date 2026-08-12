import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AnalyticsSurface({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 max-w-full overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
