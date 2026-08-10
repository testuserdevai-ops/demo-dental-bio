"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useField } from "./field-context";

export const FieldLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, htmlFor, ...props }, ref) => {
  const field = useField();
  return (
    <LabelPrimitive.Root
      ref={ref}
      htmlFor={htmlFor ?? field.id}
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";
