import { describe, expect, it } from "bun:test";
import {
  adminUserFilterSchema,
  emptyAdminUserFilters,
  planChangeSchema,
  resolvePlanEndDate,
  toAdminUserFilterPayload,
} from "./user-management-schema";

describe("admin user-management schemas", () => {
  it("converts controlled filter choices to the existing API payload", () => {
    const filters = adminUserFilterSchema.parse({
      ...emptyAdminUserFilters,
      email: " owner@example.com ",
      isVerified: "false",
      subscription_status: "PRO",
    });

    expect(toAdminUserFilterPayload(filters)).toEqual({
      email: "owner@example.com",
      first_name: "",
      middle_name: "",
      last_name: "",
      username: "",
      country: "",
      subscription_status: "PRO",
      isVerified: false,
    });
  });

  it("preserves the existing plan end-date payload behavior", () => {
    expect(
      resolvePlanEndDate({ plan: "FREE", period_end: "2027-01-01" }),
    ).toBeNull();
    expect(
      resolvePlanEndDate({ plan: "PRO", period_end: "" })?.toISOString(),
    ).toBe(new Date("9999-12-31").toISOString());
  });

  it("rejects impossible plan dates while preserving the blank sentinel", () => {
    expect(
      planChangeSchema.safeParse({ plan: "PRO", period_end: "2026-02-31" })
        .success,
    ).toBe(false);
    expect(
      planChangeSchema.safeParse({ plan: "PRO", period_end: "" }).success,
    ).toBe(true);
  });
});
