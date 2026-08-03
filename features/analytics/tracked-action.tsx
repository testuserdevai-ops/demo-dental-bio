"use client";

import React, { forwardRef } from "react";
import type { TrackableAction } from "./contract";
import { useTrackedAction } from "./provider";

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

export const PublicAction = TrackedButton;
