import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

import type { LifecycleDeliveryCandidate } from "./delivery";

const { deliverLifecycleMessages, lifecycleMessageContent } =
  await import("./delivery");

const candidate: LifecycleDeliveryCandidate = {
  userId: "00000000-0000-4000-8000-000000000101",
  email: "owner@example.test",
  firstName: "Alex",
  username: "alex",
  campaign: "weekly_performance",
  claimKey: "weekly:2026-33",
  reasonCode: "weekly_activity_available",
  qualifiedViews: 20,
  contactActions: 3,
  previousQualifiedViews: 10,
  previousContactActions: 1,
};

describe("lifecycle delivery", () => {
  test("rechecks eligibility through the claim before sending", async () => {
    let sends = 0;
    const result = await deliverLifecycleMessages(
      { now: new Date("2026-08-12T09:00:00Z"), limit: 10 },
      {
        listCandidates: async () => [candidate],
        claim: async () => ({ claimId: null, claimed: false }),
        complete: async () => undefined,
        send: async () => {
          sends += 1;
        },
      },
    );

    expect(sends).toBe(0);
    expect(result).toEqual({
      considered: 1,
      sent: 0,
      suppressed: 1,
      failed: 0,
    });
  });

  test("records accepted and failed provider outcomes", async () => {
    const outcomes: string[] = [];
    const sent = await deliverLifecycleMessages(
      {},
      {
        listCandidates: async () => [candidate],
        claim: async () => ({ claimId: "claim-1", claimed: true }),
        complete: async (_claim, outcome, reason) => {
          outcomes.push(`${outcome}:${reason}`);
        },
        send: async () => undefined,
      },
    );
    expect(sent.sent).toBe(1);

    const failed = await deliverLifecycleMessages(
      {},
      {
        listCandidates: async () => [candidate],
        claim: async () => ({ claimId: "claim-2", claimed: true }),
        complete: async (_claim, outcome, reason) => {
          outcomes.push(`${outcome}:${reason}`);
        },
        send: async () => {
          throw new Error("provider down");
        },
      },
    );
    expect(failed.failed).toBe(1);
    expect(outcomes).toEqual([
      "sent:provider_accepted",
      "failed:provider_error",
    ]);
  });

  test("renders exact aggregates and never claims a confirmed booking", () => {
    const message = lifecycleMessageContent(candidate);
    expect(message.body).toContain("20");
    expect(message.body).toContain("3");
    expect(message.body).toContain("100% vs last week");
    expect(message.body.toLowerCase()).not.toContain("booking confirmed");
  });
});
