import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));
mock.module("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

const { adminUserExportSelect, adminUserSelect, securityUserSelect } =
  await import("./security-repository");

describe("privileged user repository projections", () => {
  it("keeps security-admin reads to the visible security dashboard fields", () => {
    expect(securityUserSelect).toContain("user_device_fingerprints");
    expect(securityUserSelect).toContain("user_ips");
    for (const sensitiveField of [
      "session_id",
      "veriff_session_url",
      "domain_verification_code",
      "customer_id",
      "subscription_id",
      "pending_subscription_id",
    ]) {
      expect(securityUserSelect).not.toContain(sensitiveField);
    }
  });

  it("uses explicit admin table and export projections instead of users.*", () => {
    expect(adminUserSelect).not.toContain("*");
    expect(adminUserExportSelect).not.toContain("*");
    expect(adminUserSelect).toContain("subscription_status");
    expect(adminUserSelect).toContain("dentistries(dentistry_id)");
    expect(adminUserSelect).not.toContain("dentistries(id)");
    expect(adminUserExportSelect).toContain("isVerified");
  });
});
