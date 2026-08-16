"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { DialogOverlay } from "./dialog-overlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[var(--radius-lg)] bg-popover p-6 text-popover-foreground shadow-xl duration-[var(--duration-fast)] data-[state=open]:animate-fade-in-short data-[state=closed]:animate-fade-out-short focus:outline-none motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-[var(--radius-sm)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring disabled:pointer-events-none"
        aria-label="Close dialog"
        title="Close dialog"
      >
        <X aria-hidden="true" size={20} />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;
