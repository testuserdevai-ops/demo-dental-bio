import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const { AdminAuthorizationError, authorizeAdminActor } =
  await import("./authorization");
import type { AdminCapability } from "./authorization";

const admin = {
  id: "00000000-0000-4000-8000-000000000001",
  role: "admin",
  isBlocked: false,
};
const securityAdmin = {
  id: "00000000-0000-4000-8000-000000000002",
  role: "security_admin",
  isBlocked: false,
};

describe("admin capability authorization", () => {
  it("rejects anonymous, ordinary, and blocked actors explicitly", () => {
    expect(() => authorizeAdminActor(null, "security:audit:read")).toThrow(
      new AdminAuthorizationError("UNAUTHENTICATED"),
    );
    expect(() =>
      authorizeAdminActor({ ...admin, role: "user" }, "security:audit:read"),
    ).toThrow(new AdminAuthorizationError("FORBIDDEN"));
    expect(() =>
      authorizeAdminActor({ ...admin, isBlocked: true }, "security:audit:read"),
    ).toThrow(new AdminAuthorizationError("BLOCKED"));
  });

  it("preserves the security-admin read-only capability boundary", () => {
    expect(authorizeAdminActor(securityAdmin, "console:security")).toEqual({
      id: securityAdmin.id,
      role: "security_admin",
    });
    expect(authorizeAdminActor(securityAdmin, "security:audit:read")).toEqual({
      id: securityAdmin.id,
      role: "security_admin",
    });
    expect(authorizeAdminActor(securityAdmin, "security:users:read")).toEqual({
      id: securityAdmin.id,
      role: "security_admin",
    });
    expect(authorizeAdminActor(securityAdmin, "security:read")).toEqual({
      id: securityAdmin.id,
      role: "security_admin",
    });
    expect(authorizeAdminActor(securityAdmin, "reports:moderate")).toEqual({
      id: securityAdmin.id,
      role: "security_admin",
    });
    expect(() => authorizeAdminActor(securityAdmin, "security:manage")).toThrow(
      new AdminAuthorizationError("FORBIDDEN"),
    );
  });

  it("allows an unblocked admin every controlled capability", () => {
    const capabilities: AdminCapability[] = [
      "console:admin",
      "console:security",
      "security:audit:read",
      "security:users:read",
      "security:read",
      "security:manage",
      "users:manage",
      "marketing:manage",
      "billing:read",
      "reports:moderate",
      "verification:manage",
    ];

    for (const capability of capabilities) {
      expect(authorizeAdminActor(admin, capability)).toEqual({
        id: admin.id,
        role: "admin",
      });
    }
  });
});
