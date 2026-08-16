"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProviderContext = React.createContext(false);

export function TooltipProvider({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipProviderContext.Provider value>
      <TooltipPrimitive.Provider {...props}>
        {children}
      </TooltipPrimitive.Provider>
    </TooltipProviderContext.Provider>
  );
}

export function Tooltip(
  props: React.ComponentProps<typeof TooltipPrimitive.Root>,
) {
  const hasProvider = React.useContext(TooltipProviderContext);
  if (hasProvider) return <TooltipPrimitive.Root {...props} />;

  return (
    <TooltipPrimitive.Provider disableHoverableContent>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
}

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-64 rounded-[var(--radius-sm)] bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-md data-[state=delayed-open]:animate-fade-in-short data-[state=closed]:animate-fade-out-short motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-foreground" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
