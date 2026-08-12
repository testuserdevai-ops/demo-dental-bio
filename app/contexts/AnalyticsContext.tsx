"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  analyticsEventSchema,
  ANALYTICS_SCHEMA_VERSION,
  type ConsentState,
  type PublicRenderContext,
  type ReportableRenderContext,
  type TrackableAction,
} from "@/lib/analytics/contract";
import {
  DisabledAnalyticsTransport,
  KeepaliveAnalyticsTransport,
  type AnalyticsTransport,
} from "@/lib/analytics/transport";

type AnalyticsContextValue = {
  track: (actions: TrackableAction | readonly TrackableAction[]) => void;
  renderContext: PublicRenderContext;
};

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(
  undefined,
);
const disabledTransport = new DisabledAnalyticsTransport();
const productionTransport = new KeepaliveAnalyticsTransport(
  "/api/analytics/events",
);

export type AnalyticsProviderProps = {
  children: React.ReactNode;
  profileId: string;
  renderContext: PublicRenderContext;
  consent?: ConsentState;
  transport?: AnalyticsTransport;
  createEventId?: () => string;
  now?: () => Date;
};

export function AnalyticsProvider({
  children,
  profileId,
  renderContext,
  consent = "not_required",
  transport,
  createEventId = () => crypto.randomUUID(),
  now = () => new Date(),
}: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(() => {
    const selectedTransport =
      transport ??
      (renderContext.kind === "public"
        ? productionTransport
        : disabledTransport);
    return {
      renderContext,
      track(actions) {
        if (renderContext.kind === "excluded") return;

        for (const descriptor of Array.isArray(actions) ? actions : [actions]) {
          const parsed = analyticsEventSchema.safeParse({
            schemaVersion: ANALYTICS_SCHEMA_VERSION,
            eventId: createEventId(),
            eventType: "public_action",
            occurredAt: now().toISOString(),
            profileId,
            section: descriptor.section,
            position: descriptor.position,
            renderContext: renderContext satisfies ReportableRenderContext,
            consent,
            client: { deviceClass: "unknown" },
            action: descriptor.action,
          });

          if (parsed.success)
            void selectedTransport.send(parsed.data).catch(() => undefined);
        }
      },
    };
  }, [consent, createEventId, now, profileId, renderContext, transport]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useTrackedAction() {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("Missing analytics provider");
  return context.track;
}

export function useAnalyticsRenderContext() {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("Missing analytics provider");
  return context.renderContext;
}

export function useLegacyCounterAllowed() {
  return useAnalyticsRenderContext().kind === "public";
}
