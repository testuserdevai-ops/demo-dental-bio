import * as React from "react";

import { cn } from "@/lib/utils";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none", className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

export { AlertTitle };
