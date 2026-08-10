"use client";

import React, { forwardRef } from "react";

import { useTrackedAction } from "@/app/contexts/AnalyticsContext";
import type { TrackableAction } from "@/lib/analytics/contract";

type TrackingProps = {
  analytics: TrackableAction | readonly TrackableAction[];
};

export type TrackedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  TrackingProps;

export const TrackedButton = forwardRef<HTMLButtonElement, TrackedButtonProps>(
  function TrackedButton(
    { analytics, onClick, type = "button", ...props },
    ref,
  ) {
    const track = useTrackedAction();

    return (
      <button
        {...props}
        ref={ref}
        type={type}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) track(analytics);
        }}
      />
    );
  },
);
