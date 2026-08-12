"use client";

import { useEffect, useRef } from "react";

import {
  useAnalyticsRenderContext,
  useTrackedAction,
} from "@/app/contexts/AnalyticsContext";

export function PublicProfileViewTracker({ profileId }: { profileId: string }) {
  const track = useTrackedAction();
  const renderContext = useAnalyticsRenderContext();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || renderContext.kind !== "public") return;
    attempted.current = true;

    const key = `dentalbio:analytics:view:${profileId}`;
    try {
      if (window.sessionStorage.getItem(key) === "1") return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // The mounted-navigation guard still prevents React effect duplication.
    }

    track({ section: "profile", action: { type: "profile_view" } });
  }, [profileId, renderContext.kind, track]);

  return null;
}
