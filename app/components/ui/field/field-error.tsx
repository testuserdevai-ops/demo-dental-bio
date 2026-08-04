"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useField } from "./field-context";

export interface FieldErrorProps extends React.ComponentPropsWithoutRef<"p"> {
  assertive?: boolean;
}

export const FieldError = React.forwardRef<
  HTMLParagraphElement,
  FieldErrorProps
>(({ className, id, assertive = false, ...props }, ref) => {
  const field = useField();
  return (
    <p
      ref={ref}
      id={id ?? field.errorId}
      role={assertive ? "alert" : undefined}
      className={cn("text-sm text-destructive", className)}
      {...props}
    />
  );
});
FieldError.displayName = "FieldError";
