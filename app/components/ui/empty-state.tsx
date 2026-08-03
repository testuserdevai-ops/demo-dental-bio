import * as React from "react";
import { cn } from "@/lib/utils";

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
const EmptyStateIcon = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    aria-hidden="true"
    className={cn("mb-3 text-muted-foreground", className)}
    {...props}
  />
);
const EmptyStateTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
EmptyStateTitle.displayName = "EmptyStateTitle";
const EmptyStateDescription = React.forwardRef<
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
const EmptyStateAction = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4", className)} {...props} />
);
export {
  EmptyState,
  EmptyStateAction,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
};
