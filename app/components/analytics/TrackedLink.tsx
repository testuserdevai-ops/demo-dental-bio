"use client";

import React, { forwardRef } from "react";

import { useTrackedAction } from "@/app/contexts/AnalyticsContext";
import type { TrackableAction } from "@/lib/analytics/contract";

type TrackingProps = {
  analytics: TrackableAction | readonly TrackableAction[];
};

export type TrackedLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> &
  TrackingProps;

export const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(
  function TrackedLink({ analytics, onClick, ...props }, ref) {
    const track = useTrackedAction();

    return (
      <a
        {...props}
        ref={ref}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) track(analytics);
        }}
      />
    );
  },
);
