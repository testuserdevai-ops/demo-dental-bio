import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyStateAction } from "./empty-state-action";
import { EmptyStateDescription } from "./empty-state-description";
import { EmptyStateIcon } from "./empty-state-icon";
import { EmptyStateTitle } from "./empty-state-title";

const EmptyState = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <section
    ref={ref}
    className={cn(
      "flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-border bg-card px-6 py-10 text-center",
      className,
    )}
    {...props}
  />
));
EmptyState.displayName = "EmptyState";
export {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
};
