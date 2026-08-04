"use client";

import { CaretDown } from "@phosphor-icons/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControlProps } from "../field";

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const controlProps = useFieldControlProps(props);
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-[var(--focus-ring-width)] focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-placeholder aria-[invalid=true]:border-destructive motion-reduce:transition-none",
        className,
      )}
      {...controlProps}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <CaretDown aria-hidden="true" size={16} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
