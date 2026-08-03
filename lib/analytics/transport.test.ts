import { afterEach, describe, expect, mock, test } from "bun:test";
import type { AnalyticsEvent } from "./contract";
import {
  DisabledAnalyticsTransport,
  KeepaliveAnalyticsTransport,
  MemoryAnalyticsTransport,
} from "./transport";

const event: AnalyticsEvent = {
  schemaVersion: 1,
  eventId: "11111111-1111-4111-8111-111111111111",
  eventType: "public_action",
  occurredAt: "2026-08-03T20:00:00.000Z",
  profileId: "22222222-2222-4222-8222-222222222222",
  section: "links",
  renderContext: { kind: "public" },
  consent: "granted",
  client: { deviceClass: "unknown" },
  action: {
    type: "link_click",
    linkId: "33333333-3333-4333-8333-333333333333",
  },
};

const originalFetch = globalThis.fetch;
const originalSendBeacon = navigator.sendBeacon;

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: originalSendBeacon,
  });
});

describe("public analytics transports", () => {
  test("Disabled transport deterministically rejects without retaining data", async () => {
    await expect(new DisabledAnalyticsTransport().send(event)).resolves.toEqual(
      {
        status: "rejected",
        eventId: event.eventId,
        reason: "disabled",
      },
    );
  });

  test("Memory transport validates and preserves only valid events", async () => {
    const transport = new MemoryAnalyticsTransport();
    await expect(transport.send(event)).resolves.toEqual({
      status: "accepted",
      eventId: event.eventId,
    });
    await expect(
      transport.send({
        ...event,
        action: { type: "link_click" },
      } as AnalyticsEvent),
    ).resolves.toEqual({ status: "rejected", reason: "invalid" });
    expect(transport.events).toEqual([event]);
  });

  test("Keepalive transport uses beacon with the exact JSON event", async () => {
    const beacon = mock(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: beacon,
    });
    const transport = new KeepaliveAnalyticsTransport("/api/analytics/events");

    await expect(transport.send(event)).resolves.toEqual({
      status: "accepted",
      eventId: event.eventId,
    });
    expect(beacon).toHaveBeenCalledTimes(1);
    const [endpoint, body] = beacon.mock.calls[0] as unknown as [string, Blob];
    expect(endpoint).toBe("/api/analytics/events");
    expect(body.type).toStartWith("application/json");
    expect(JSON.parse(await body.text())).toEqual(event);
  });

  test("Keepalive transport falls back to same-origin keepalive fetch and absorbs failure", async () => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });
    const fetchMock = mock(async () => new Response(null, { status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const transport = new KeepaliveAnalyticsTransport("/api/analytics/events");

    await expect(transport.send(event)).resolves.toEqual({
      status: "rejected",
      eventId: event.eventId,
      reason: "transport_error",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
      credentials: "same-origin",
    });

    globalThis.fetch = mock(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    await expect(transport.send(event)).resolves.toMatchObject({
      status: "rejected",
      reason: "transport_error",
    });
  });
});
