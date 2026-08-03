import * as React from "react";
import { cn } from "@/lib/utils";
import { useFieldControlProps } from "./field";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(({ className, type = "text", ...props }, ref) => {
  const controlProps = useFieldControlProps(props);
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[var(--radius-md)] border border-border bg-input px-3 py-2 text-base text-foreground placeholder:text-placeholder transition-colors duration-[var(--duration-fast)] file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive motion-reduce:transition-none",
        className,
      )}
      {...controlProps}
    />
  );
});
Input.displayName = "Input";
export { Input };
