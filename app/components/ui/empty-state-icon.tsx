import * as React from "react";

import { cn } from "@/lib/utils";

export function EmptyStateIcon({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("mb-3 text-muted-foreground", className)}
      {...props}
    />
  );
}
