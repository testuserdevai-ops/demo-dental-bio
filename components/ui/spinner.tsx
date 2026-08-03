import { Spinner as SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.ComponentPropsWithoutRef<"span"> {
  label?: string;
  size?: number;
}

export function Spinner({
  className,
  label = "Loading",
  size = 20,
  ...props
}: SpinnerProps) {
  return (
    <span
      className={cn("inline-flex", className)}
      role="status"
      aria-label={label}
      {...props}
    >
      <SpinnerIcon
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
        size={size}
      />
    </span>
  );
}
