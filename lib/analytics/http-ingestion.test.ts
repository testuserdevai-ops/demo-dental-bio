import { describe, expect, mock, test } from "bun:test";

import {
  ANALYTICS_MAX_BODY_BYTES,
  handleAnalyticsEventRequest,
} from "./http-ingestion";

const event = {
  schemaVersion: 1,
  eventId: "11111111-1111-4111-8111-111111111111",
  eventType: "public_action",
  occurredAt: "2026-08-12T00:00:00.000Z",
  profileId: "22222222-2222-4222-8222-222222222222",
  section: "profile",
  renderContext: { kind: "public" },
  consent: "not_required",
  client: { deviceClass: "mobile" },
  action: { type: "profile_view" },
};

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 DentalBio browser",
      ...headers,
    },
    body,
  });
}

describe("analytics event HTTP boundary", () => {
  test("accepts and acknowledges a validated event", async () => {
    const ingest = mock(async () => "accepted" as const);
    const response = await handleAnalyticsEventRequest(
      request(JSON.stringify(event)),
      ingest,
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      eventId: event.eventId,
      status: "accepted",
    });
    expect(ingest).toHaveBeenCalledTimes(1);
  });

  test("maps duplicate and rate-limited storage outcomes", async () => {
    const duplicate = await handleAnalyticsEventRequest(
      request(JSON.stringify(event)),
      async () => "duplicate",
    );
    expect(duplicate.status).toBe(200);

    const limited = await handleAnalyticsEventRequest(
      request(JSON.stringify(event)),
      async () => "rate_limited",
    );
    expect(limited.status).toBe(429);
  });

  test("excludes bot traffic before storage", async () => {
    const ingest = mock(async () => "accepted" as const);
    const response = await handleAnalyticsEventRequest(
      request(JSON.stringify(event), { "user-agent": "Googlebot/2.1" }),
      ingest,
    );
    expect(response.status).toBe(204);
    expect(ingest).not.toHaveBeenCalled();
  });

  test("bounds declared and actual payload bytes", async () => {
    const ingest = mock(async () => "accepted" as const);
    const declaredRequest = {
      headers: new Headers({
        "content-length": String(ANALYTICS_MAX_BODY_BYTES + 1),
      }),
      text: async () => "{}",
    } as Request;
    const declared = await handleAnalyticsEventRequest(declaredRequest, ingest);
    expect(declared.status).toBe(413);

    const actual = await handleAnalyticsEventRequest(
      request(
        JSON.stringify({ padding: "x".repeat(ANALYTICS_MAX_BODY_BYTES) }),
      ),
      ingest,
    );
    expect(actual.status).toBe(413);
    expect(ingest).not.toHaveBeenCalled();
  });
});
