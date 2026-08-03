import { describe, expect, test } from "bun:test";
import {
  ANALYTICS_SCHEMA_VERSION,
  analyticsEventSchema,
  publicActionSchema,
} from "./contract";

const event = {
  schemaVersion: ANALYTICS_SCHEMA_VERSION,
  eventId: "11111111-1111-4111-8111-111111111111",
  eventType: "public_action",
  occurredAt: "2026-08-03T20:00:00.000Z",
  profileId: "22222222-2222-4222-8222-222222222222",
  section: "links",
  position: 1,
  renderContext: { kind: "public" },
  consent: "granted",
  client: { deviceClass: "desktop" },
  action: {
    type: "link_click",
    linkId: "33333333-3333-4333-8333-333333333333",
  },
} as const;

describe("public analytics event contract", () => {
  test("accepts the minimal privacy-safe public action envelope", () => {
    expect(analyticsEventSchema.parse(event)).toEqual(event);
  });

  test("accepts only controlled action discriminants and enum values", () => {
    expect(
      publicActionSchema.safeParse({
        type: "social_click",
        platform: "instagram",
      }).success,
    ).toBe(true);
    expect(
      publicActionSchema.safeParse({
        type: "social_click",
        platform: "mastodon",
      }).success,
    ).toBe(false);
    expect(
      publicActionSchema.safeParse({ type: "free_text_event" }).success,
    ).toBe(false);
    expect(
      publicActionSchema.safeParse({ type: "blog_click", blogId: 42 }).success,
    ).toBe(true);
  });

  test("rejects missing required identifiers and invalid render contexts", () => {
    const missingLinkId = { ...event, action: { type: "link_click" } };
    expect(analyticsEventSchema.safeParse(missingLinkId).success).toBe(false);
    expect(
      analyticsEventSchema.safeParse({
        ...event,
        renderContext: { kind: "preview" },
      }).success,
    ).toBe(false);
  });

  test("rejects extra fields that could carry personal data or destinations", () => {
    for (const prohibitedField of [
      "email",
      "phone",
      "username",
      "url",
      "ip",
      "userAgent",
      "referrer",
      "title",
      "freeText",
    ]) {
      expect(
        analyticsEventSchema.safeParse({
          ...event,
          [prohibitedField]: "not-allowed@example.test",
        }).success,
      ).toBe(false);
    }
    expect(
      analyticsEventSchema.safeParse({
        ...event,
        action: { ...event.action, destinationUrl: "https://example.test" },
      }).success,
    ).toBe(false);
  });
});
