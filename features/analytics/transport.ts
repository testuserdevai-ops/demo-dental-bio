import { analyticsEventSchema, type AnalyticsEvent } from "./contract";

export type AnalyticsTransportResult =
  | { status: "accepted"; eventId: string }
  | {
      status: "rejected";
      eventId?: string;
      reason: "disabled" | "invalid" | "transport_error";
    };

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): Promise<AnalyticsTransportResult>;
}

export class DisabledAnalyticsTransport implements AnalyticsTransport {
  async send(event: AnalyticsEvent): Promise<AnalyticsTransportResult> {
    return { status: "rejected", eventId: event.eventId, reason: "disabled" };
  }
}

export class MemoryAnalyticsTransport implements AnalyticsTransport {
  readonly events: AnalyticsEvent[] = [];

  async send(event: AnalyticsEvent): Promise<AnalyticsTransportResult> {
    const parsed = analyticsEventSchema.safeParse(event);
    if (!parsed.success) return { status: "rejected", reason: "invalid" };
    this.events.push(parsed.data);
    return { status: "accepted", eventId: parsed.data.eventId };
  }
}

/**
 * Future endpoint adapter. It is intentionally never selected by the production
 * provider in Phase 4; downstream work must review consent, ownership, limits,
 * retention, and storage before constructing it.
 */
export class KeepaliveAnalyticsTransport implements AnalyticsTransport {
  constructor(private readonly endpoint: string) {}

  async send(event: AnalyticsEvent): Promise<AnalyticsTransportResult> {
    const parsed = analyticsEventSchema.safeParse(event);
    if (!parsed.success) return { status: "rejected", reason: "invalid" };

    try {
      const body = JSON.stringify(parsed.data);
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const accepted = navigator.sendBeacon(
          this.endpoint,
          new Blob([body], { type: "application/json" }),
        );
        return accepted
          ? { status: "accepted", eventId: parsed.data.eventId }
          : {
              status: "rejected",
              eventId: parsed.data.eventId,
              reason: "transport_error",
            };
      }

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        credentials: "same-origin",
      });
      return response.ok
        ? { status: "accepted", eventId: parsed.data.eventId }
        : {
            status: "rejected",
            eventId: parsed.data.eventId,
            reason: "transport_error",
          };
    } catch {
      return {
        status: "rejected",
        eventId: parsed.data.eventId,
        reason: "transport_error",
      };
    }
  }
}
