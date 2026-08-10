import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { securityUsersRequestSchema } = await import("./route-input");

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
