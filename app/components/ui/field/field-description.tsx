"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useField } from "./field-context";

export const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"p">
>(({ className, id, ...props }, ref) => {
  const field = useField();
  return (
    <p
      ref={ref}
      id={id ?? field.descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";
