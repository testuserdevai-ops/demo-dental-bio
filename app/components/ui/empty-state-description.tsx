import * as React from "react";

import { cn } from "@/lib/utils";

export const EmptyStateDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mt-1 max-w-md text-sm text-muted-foreground", className)}
    {...props}
  />
));

EmptyStateDescription.displayName = "EmptyStateDescription";
