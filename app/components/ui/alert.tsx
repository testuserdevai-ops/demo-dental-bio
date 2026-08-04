import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertDescription } from "./alert-description";
import { AlertTitle } from "./alert-title";

const alertVariants = cva(
  "relative w-full rounded-[var(--radius-md)] border p-4 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        success: "border-success bg-card text-foreground",
        warning: "border-warning bg-card text-foreground",
        destructive: "border-destructive bg-card text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";
export { Alert, AlertDescription, AlertTitle, alertVariants };
