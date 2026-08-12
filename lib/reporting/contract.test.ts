import { describe, expect, test } from "bun:test";

import {
  addReportNoteSchema,
  formatReportReference,
  moderateProfileReportSchema,
  reportListQuerySchema,
  submitProfileReportSchema,
} from "./contract";

const profileId = "00000000-0000-4000-8000-000000000001";

describe("reporting contracts", () => {
  test("normalizes a valid public report and rejects extra fields", () => {
    expect(
      submitProfileReportSchema.parse({
        profileId,
        category: "spam_or_scam",
        details: "  Repeated financial solicitations.  ",
        reporterEmail: "  REPORTER@EXAMPLE.COM ",
      }),
    ).toEqual({
      profileId,
      category: "spam_or_scam",
      details: "Repeated financial solicitations.",
      reporterEmail: "reporter@example.com",
    });

    expect(
      submitProfileReportSchema.safeParse({
        profileId,
        category: "spam_or_scam",
        unexpected: true,
      }).success,
    ).toBe(false);
  });

  test("requires useful context for the catch-all category", () => {
    const result = submitProfileReportSchema.safeParse({
      profileId,
      category: "other",
      details: "",
    });
    expect(result.success).toBe(false);
  });

  test("bounds list filters and defaults stable queue ordering", () => {
    expect(reportListQuerySchema.parse({})).toMatchObject({
      page: 1,
      limit: 25,
      sort: "created_at",
      direction: "desc",
    });
    expect(reportListQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  test("requires an outcome and reason before closure", () => {
    const base = {
      id: profileId,
      expectedVersion: 1,
      status: "resolved",
      priority: "high",
      assignedTo: null,
      outcome: null,
      outcomeReason: null,
    } as const;
    expect(moderateProfileReportSchema.safeParse(base).success).toBe(false);
    expect(
      moderateProfileReportSchema.safeParse({
        ...base,
        outcome: "content_review_requested",
        outcomeReason: "Escalated to the content safety review team.",
      }).success,
    ).toBe(true);
  });

  test("bounds internal notes and formats public references", () => {
    expect(addReportNoteSchema.safeParse({ note: "x" }).success).toBe(false);
    expect(formatReportReference(profileId)).toBe("RPT-00000000");
  });
});
