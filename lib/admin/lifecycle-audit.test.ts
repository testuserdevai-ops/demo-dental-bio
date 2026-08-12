import { describe, expect, it } from "bun:test";

import {
  filterLifecycleAuditEvents,
  parseLifecycleAuditFilters,
} from "./lifecycle-audit";

describe("lifecycle audit contract", () => {
  it("accepts only an owner UUID and controlled display filters", () => {
    expect(
      parseLifecycleAuditFilters({
        owner: "11111111-1111-4111-8111-111111111111",
        campaign: "weekly_performance",
        outcome: "sent",
        limit: "25",
      }),
    ).toEqual({
      ownerId: "11111111-1111-4111-8111-111111111111",
      invalidOwnerId: false,
      campaign: "weekly_performance",
      outcome: "sent",
      limit: 25,
    });
  });

  it("rejects identifiers that could put PII in the URL and defaults unknown enums", () => {
    expect(
      parseLifecycleAuditFilters({
        owner: "owner@example.com",
        campaign: "arbitrary-campaign",
        outcome: "opened",
        limit: "500",
      }),
    ).toEqual({
      ownerId: null,
      invalidOwnerId: true,
      campaign: "all",
      outcome: "all",
      limit: 50,
    });
  });

  it("parses the strict RPC vocabulary before applying local display filters", () => {
    const filters = parseLifecycleAuditFilters({
      owner: "11111111-1111-4111-8111-111111111111",
      campaign: "weekly_performance",
      outcome: "sent",
      limit: "25",
    });
    expect(
      filterLifecycleAuditEvents(
        [
          {
            audit_id: 2,
            campaign: "weekly_performance",
            outcome: "sent",
            reason_code: "provider_accepted",
            occurred_at: "2026-08-12T05:00:00.000Z",
          },
          {
            audit_id: 1,
            campaign: "zero_traffic",
            outcome: "claimed",
            reason_code: null,
            occurred_at: "2026-08-12T04:00:00.000Z",
          },
        ] as unknown[],
        filters,
      ),
    ).toEqual([
      {
        id: 2,
        campaign: "weekly_performance",
        outcome: "sent",
        reasonCode: "provider_accepted",
        occurredAt: "2026-08-12T05:00:00.000Z",
      },
    ]);
    expect(() =>
      filterLifecycleAuditEvents(
        [
          {
            audit_id: 3,
            campaign: "weekly_performance",
            outcome: "email_opened",
            reason_code: null,
            occurred_at: "2026-08-12T06:00:00.000Z",
          },
        ],
        filters,
      ),
    ).toThrow();
  });
});
