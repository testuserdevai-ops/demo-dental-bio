import { describe, expect, it } from "bun:test";
import { readAdminDashboardUser } from "./admin-user-read";

const admin = { id: "00000000-0000-4000-8000-000000000001", role: "admin" };
const ordinaryUser = {
  id: "00000000-0000-4000-8000-000000000002",
  role: "user",
};

describe("admin dashboard user read", () => {
  it("rejects anonymous and ordinary actors before looking up a target", async () => {
    const lookup = async () => {
      throw new Error("must not query");
    };

    await expect(
      readAdminDashboardUser(null, null, lookup),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    await expect(
      readAdminDashboardUser(ordinaryUser, admin.id, lookup),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects malformed target hints and returns only the admin-read DTO", async () => {
    await expect(
      readAdminDashboardUser(admin, "not-a-uuid", async () => null),
    ).rejects.toMatchObject({ code: "INVALID_TARGET" });

    const user = await readAdminDashboardUser(admin, null, async () => ({
      id: admin.id,
      username: "owner",
      email: "owner@example.test",
      isVerified: true,
      role: "admin",
      session_id: "must-not-leak",
    }));

    expect(user).toEqual({
      id: admin.id,
      username: "owner",
      email: "owner@example.test",
      isVerified: true,
      role: "admin",
    });
  });
});
