import { analyticsEventSchema, type AnalyticsEvent } from "./contract";

export type AnalyticsTransportResult =
  | { status: "queued" | "dispatched"; eventId: string }
  | {
      status: "rejected";
      eventId?: string;
      reason: "disabled" | "invalid" | "transport_error";
    };

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): Promise<AnalyticsTransportResult>;
}

// Non-public render contexts select this transport and fail closed.

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
    return { status: "dispatched", eventId: parsed.data.eventId };
  }
}

/**
 * Same-origin endpoint adapter selected only for server-verified public
 * contexts. The ingestion boundary independently revalidates every event.
 */
export class KeepaliveAnalyticsTransport implements AnalyticsTransport {
  constructor(private readonly endpoint: string) {}

  async send(event: AnalyticsEvent): Promise<AnalyticsTransportResult> {
    const parsed = analyticsEventSchema.safeParse(event);
    if (!parsed.success) return { status: "rejected", reason: "invalid" };

    try {
      const body = JSON.stringify(parsed.data);
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const queued = navigator.sendBeacon(
          this.endpoint,
          new Blob([body], { type: "application/json" }),
        );
        return queued
          ? { status: "queued", eventId: parsed.data.eventId }
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
        ? { status: "dispatched", eventId: parsed.data.eventId }
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
