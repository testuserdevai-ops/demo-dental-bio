import * as React from "react";
import { Spinner as SpinnerIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export const DisabledButtonChild = React.forwardRef<
  HTMLSpanElement,
  {
    child: React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;
    className: string;
    isPending: boolean;
    props: Record<string, unknown>;
  }
>(({ child, className, isPending, props }, ref) => {
  const childAria = Object.fromEntries(
    Object.entries(child.props).filter(([name]) => name.startsWith("aria-")),
  );

  return (
    <span
      ref={ref}
      className={cn(className, child.props.className)}
      {...childAria}
      {...props}
      aria-disabled="true"
      aria-busy={isPending || undefined}
      tabIndex={-1}
      data-disabled=""
    >
      {isPending && (
        <SpinnerIcon
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      )}
      {child.props.children}
    </span>
  );
});

DisabledButtonChild.displayName = "DisabledButtonChild";
