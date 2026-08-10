import * as React from "react";

import { cn } from "@/lib/utils";

export function EmptyStateAction({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}
