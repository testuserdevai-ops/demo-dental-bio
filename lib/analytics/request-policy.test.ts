import { describe, expect, test } from "bun:test";

import { evaluateAnalyticsRequest } from "./request-policy";
import type { AnalyticsEvent } from "./contract";

const event = {
  schemaVersion: 1,
  eventId: "11111111-1111-4111-8111-111111111111",
  eventType: "public_action",
  occurredAt: "2026-08-12T00:00:00.000Z",
  profileId: "22222222-2222-4222-8222-222222222222",
  section: "share",
  renderContext: { kind: "public" },
  consent: "granted",
  client: {
    anonymousVisitorId: "visitor_123456789",
    sessionId: "session_123456789",
    deviceClass: "mobile",
  },
  action: { type: "share_open" },
} as const satisfies AnalyticsEvent;

function browserHeaders(extra: Record<string, string> = {}) {
  return new Headers({
    "user-agent": "Mozilla/5.0 DentalBio browser",
    "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    ...extra,
  });
}

describe("analytics ingestion request policy", () => {
  test("accepts only a strict public event and extracts one ephemeral rate identity", () => {
    expect(evaluateAnalyticsRequest(event, browserHeaders())).toEqual({
      accepted: true,
      event,
      requestIdentity: "203.0.113.10",
    });
  });

  test("fails closed for preview, test, and admin contexts", () => {
    for (const renderContext of [
      {
        kind: "preview",
        verification: "authenticated_profile_owner",
      },
      { kind: "test", verification: "signed_test_context" },
      { kind: "admin_preview", verification: "authenticated_admin" },
    ]) {
      expect(
        evaluateAnalyticsRequest({ ...event, renderContext }, browserHeaders()),
      ).toEqual({ accepted: false, reason: "context" });
    }
  });

  test("rejects unknown or denied consent and honors global privacy signals", () => {
    for (const consent of ["unknown", "denied"]) {
      expect(
        evaluateAnalyticsRequest({ ...event, consent }, browserHeaders()),
      ).toEqual({ accepted: false, reason: "consent" });
    }
    expect(
      evaluateAnalyticsRequest(event, browserHeaders({ "sec-gpc": "1" })),
    ).toEqual({ accepted: false, reason: "privacy_signal" });
  });

  test("does not accept identifiers under the identifier-free not-required policy", () => {
    expect(
      evaluateAnalyticsRequest(
        { ...event, consent: "not_required" },
        browserHeaders(),
      ),
    ).toEqual({ accepted: false, reason: "consent" });
    expect(
      evaluateAnalyticsRequest(
        {
          ...event,
          consent: "not_required",
          client: { deviceClass: "mobile" },
        },
        browserHeaders(),
      ).accepted,
    ).toBe(true);
  });

  test("excludes recognizable bots and clients without a user agent", () => {
    expect(
      evaluateAnalyticsRequest(
        event,
        browserHeaders({ "user-agent": "Googlebot/2.1" }),
      ),
    ).toEqual({ accepted: false, reason: "bot" });
    expect(evaluateAnalyticsRequest(event, new Headers())).toEqual({
      accepted: false,
      reason: "bot",
    });
  });

  test("rejects extra fields before they can reach storage", () => {
    expect(
      evaluateAnalyticsRequest(
        { ...event, destinationUrl: "https://private.example.test" },
        browserHeaders(),
      ),
    ).toEqual({ accepted: false, reason: "invalid" });
  });
});
