import { describe, expect, it } from "bun:test";
import { parseAdminUserListResponse } from "./UsersManagement";

describe("admin user-list response", () => {
  it("accepts the paginated user-list contract", () => {
    expect(
      parseAdminUserListResponse({ data: [{ id: "user-1" }], count: 1 }),
    ).toEqual({ data: [{ id: "user-1" }], count: 1 });
  });

  it("rejects an error envelope instead of crashing the table", () => {
    expect(() =>
      parseAdminUserListResponse({ error: "Database unavailable" }),
    ).toThrow("invalid response");
  });
});
