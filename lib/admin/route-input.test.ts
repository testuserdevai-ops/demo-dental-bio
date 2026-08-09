import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { incomeQuerySchema, securityUsersRequestSchema } =
  await import("./route-input");

describe("admin user list input", () => {
  it("accepts the complete controlled filter set used by user management", () => {
    expect(
      securityUsersRequestSchema.parse({
        page: 1,
        limit: 10,
        filters: {
          email: "",
          first_name: "Dental",
          middle_name: "Practice",
          last_name: "Owner",
          username: "owner",
          country: "Egypt",
          subscription_status: "PRO",
          isVerified: false,
        },
      }),
    ).toEqual({
      page: 1,
      limit: 10,
      filters: {
        first_name: "Dental",
        middle_name: "Practice",
        last_name: "Owner",
        username: "owner",
        country: "Egypt",
        subscription_status: "PRO",
        isVerified: false,
      },
    });
  });

  it("continues to reject unknown filter authority", () => {
    expect(
      securityUsersRequestSchema.safeParse({
        page: 1,
        limit: 10,
        filters: { role: "admin" },
      }).success,
    ).toBe(false);
  });
});

describe("admin income date range", () => {
  it("accepts an empty query or a complete ordered ISO date range", () => {
    expect(incomeQuerySchema.parse({})).toEqual({});
    expect(
      incomeQuerySchema.parse({
        startDate: "2026-07-01",
        endDate: "2026-07-31",
      }),
    ).toEqual({ startDate: "2026-07-01", endDate: "2026-07-31" });
  });

  it("rejects partial, impossible, reversed, and unknown query values", () => {
    for (const input of [
      { startDate: "2026-07-01" },
      { startDate: "2026-02-30", endDate: "2026-03-01" },
      { startDate: "2026-08-01", endDate: "2026-07-01" },
      { startDate: "2026-07-01", endDate: "2026-07-31", customerId: "x" },
    ]) {
      expect(incomeQuerySchema.safeParse(input).success).toBe(false);
    }
  });
});
