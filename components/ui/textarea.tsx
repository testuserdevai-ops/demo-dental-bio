import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControlProps } from "./field";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(({ className, ...props }, ref) => {
  const controlProps = useFieldControlProps(props);
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-28 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-base text-foreground placeholder:text-placeholder transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive motion-reduce:transition-none",
        className,
      )}
      {...controlProps}
    />
  );
});
Textarea.displayName = "Textarea";
export { Textarea };
