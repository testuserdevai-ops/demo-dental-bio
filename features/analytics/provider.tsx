"use client";

import React, { createContext, useContext, useMemo } from "react";
import {
  analyticsEventSchema,
  ANALYTICS_SCHEMA_VERSION,
  type ConsentState,
  type PublicRenderContext,
  type TrackableAction,
} from "./contract";
import {
  DisabledAnalyticsTransport,
  type AnalyticsTransport,
} from "./transport";

type AnalyticsContextValue = {
  track: (actions: TrackableAction | readonly TrackableAction[]) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  track: () => undefined,
});
const disabledTransport = new DisabledAnalyticsTransport();

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
  consent = "unknown",
  transport = disabledTransport,
  createEventId = () => crypto.randomUUID(),
  now = () => new Date(),
}: AnalyticsProviderProps) {
  const value = useMemo<AnalyticsContextValue>(
    () => ({
      track(actions) {
        for (const descriptor of Array.isArray(actions) ? actions : [actions]) {
          const parsed = analyticsEventSchema.safeParse({
            schemaVersion: ANALYTICS_SCHEMA_VERSION,
            eventId: createEventId(),
            eventType: "public_action",
            occurredAt: now().toISOString(),
            profileId,
            section: descriptor.section,
            position: descriptor.position,
            renderContext,
            consent,
            client: { deviceClass: "unknown" },
            action: descriptor.action,
          });

          if (parsed.success)
            void transport.send(parsed.data).catch(() => undefined);
        }
      },
    }),
    [consent, createEventId, now, profileId, renderContext, transport],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useTrackedAction() {
  return useContext(AnalyticsContext).track;
}
