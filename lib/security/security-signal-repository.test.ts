import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

mock.module("server-only", () => ({}));

const single = mock(
  async (): Promise<{ data: object | null; error: Error | null }> => ({
    data: null,
    error: null,
  }),
);
const eq = mock(() => ({ single }));
const select = mock(() => ({ eq }));
const upsert = mock(async (): Promise<{ data: null; error: Error | null }> => ({
  data: null,
  error: null,
}));
const insert = mock(async (): Promise<{ data: null; error: Error | null }> => ({
  data: null,
  error: null,
}));
const from = mock(() => ({ select, upsert, insert }));

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from },
}));

const {
  insertSecurityLogEntry,
  lookupBlockedFingerprint,
  lookupBlockedIp,
  upsertUserFingerprintSignal,
  upsertUserIpSignal,
} = await import("./security-signal-repository");
const { getClientIp, isBlockedIp, storeUserIp } =
  await import("../../utils/blockedIps");
const { isBlockedFingerprint, storeDeviceFingerprint } =
  await import("../../utils/blockedFingerprints");
const { getRequestMeta, logSecurityEvent } =
  await import("../../utils/securityLogger");

beforeEach(() => {
  from.mockClear();
  select.mockClear();
  eq.mockClear();
  single.mockReset();
  single.mockResolvedValue({ data: null, error: null });
  upsert.mockReset();
  upsert.mockResolvedValue({ data: null, error: null });
  insert.mockReset();
  insert.mockResolvedValue({ data: null, error: null });
});

describe("security signal repository", () => {
  test("looks up a blocked IP with the exact projection and value", async () => {
    single.mockResolvedValueOnce({
      data: { ip_address: "203.0.113.10" },
      error: null,
    });

    expect(await lookupBlockedIp("203.0.113.10")).toBe(true);
    expect(from).toHaveBeenCalledWith("blocked_ips");
    expect(select).toHaveBeenCalledWith("ip_address");
    expect(eq).toHaveBeenCalledWith("ip_address", "203.0.113.10");
  });

  test("looks up a blocked fingerprint with the exact projection and value", async () => {
    single.mockResolvedValueOnce({
      data: { fingerprint: "fingerprint-1" },
      error: null,
    });

    expect(await lookupBlockedFingerprint("fingerprint-1")).toBe(true);
    expect(from).toHaveBeenCalledWith("blocked_fingerprints");
    expect(select).toHaveBeenCalledWith("fingerprint");
    expect(eq).toHaveBeenCalledWith("fingerprint", "fingerprint-1");
  });

  test("preserves false results for resolved lookup errors and propagates rejection", async () => {
    single.mockResolvedValueOnce({
      data: null,
      error: new Error("resolved PostgREST error"),
    });
    expect(await lookupBlockedIp("203.0.113.10")).toBe(false);

    single.mockRejectedValueOnce(new Error("network failure"));
    await expect(lookupBlockedFingerprint("fingerprint-1")).rejects.toThrow(
      "network failure",
    );
  });

  test("upserts exact user signal rows and conflict targets", async () => {
    await upsertUserIpSignal(
      "00000000-0000-4000-8000-000000000001",
      "203.0.113.10",
      "2026-08-10T03:00:00.000Z",
    );
    expect(from).toHaveBeenCalledWith("user_ips");
    expect(upsert).toHaveBeenLastCalledWith(
      {
        user_id: "00000000-0000-4000-8000-000000000001",
        ip_address: "203.0.113.10",
        last_seen_at: "2026-08-10T03:00:00.000Z",
      },
      { onConflict: "user_id,ip_address" },
    );

    await upsertUserFingerprintSignal(
      "00000000-0000-4000-8000-000000000001",
      "fingerprint-1",
      "2026-08-10T03:00:01.000Z",
    );
    expect(from).toHaveBeenCalledWith("user_device_fingerprints");
    expect(upsert).toHaveBeenLastCalledWith(
      {
        user_id: "00000000-0000-4000-8000-000000000001",
        fingerprint: "fingerprint-1",
        last_seen_at: "2026-08-10T03:00:01.000Z",
      },
      { onConflict: "user_id,fingerprint" },
    );
  });

  test("preserves resolved upsert errors and rejected-call propagation", async () => {
    upsert.mockResolvedValueOnce({
      data: null,
      error: new Error("resolved PostgREST error"),
    });
    await expect(
      upsertUserIpSignal("user-1", "203.0.113.10", "timestamp"),
    ).resolves.toBeUndefined();

    upsert.mockRejectedValueOnce(new Error("network failure"));
    await expect(
      upsertUserFingerprintSignal("user-1", "fingerprint-1", "timestamp"),
    ).rejects.toThrow("network failure");
  });

  test("inserts only the allowlisted security log entry", async () => {
    const entry = {
      event_type: "blocked_user" as const,
      email: "owner@example.com",
      route: "/login",
      details: { blocked_user_id: "user-1" },
    };

    await insertSecurityLogEntry(entry);

    expect(from).toHaveBeenCalledWith("security_logs");
    expect(insert).toHaveBeenCalledWith(entry);
  });

  test("utility blank signals short-circuit before repository access", async () => {
    expect(await isBlockedIp(null)).toBe(false);
    expect(await isBlockedIp("")).toBe(false);
    expect(await isBlockedFingerprint(undefined)).toBe(false);
    expect(await isBlockedFingerprint("")).toBe(false);
    await storeUserIp("user-1", null);
    await storeDeviceFingerprint("user-1", "");

    expect(from).not.toHaveBeenCalled();
  });

  test("utility lookups and stores preserve exact rejected-call propagation", async () => {
    single.mockRejectedValueOnce(new Error("lookup network failure"));
    await expect(isBlockedIp("203.0.113.10")).rejects.toThrow(
      "lookup network failure",
    );

    upsert.mockRejectedValueOnce(new Error("upsert network failure"));
    await expect(
      storeDeviceFingerprint("user-1", "fingerprint-1"),
    ).rejects.toThrow("upsert network failure");
  });

  test("utility stores generate ISO timestamps", async () => {
    await storeUserIp("user-1", "203.0.113.10");
    await storeDeviceFingerprint("user-1", "fingerprint-1");

    expect(upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        user_id: "user-1",
        ip_address: "203.0.113.10",
        last_seen_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
      { onConflict: "user_id,ip_address" },
    );
    expect(upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: "user-1",
        fingerprint: "fingerprint-1",
        last_seen_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
      { onConflict: "user_id,fingerprint" },
    );
  });

  test("security logger forwards entries and swallows rejected inserts", async () => {
    const entry = {
      event_type: "blocked_ip" as const,
      route: "/login",
      details: { blocked_ip: "203.0.113.10" },
    };
    await logSecurityEvent(entry);
    expect(insert).toHaveBeenCalledWith(entry);

    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    insert.mockRejectedValueOnce(new Error("network failure"));
    await expect(logSecurityEvent(entry)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to log security event:",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  test("request metadata preserves forwarded-first and direct-IP semantics", () => {
    const forwarded = new Request("https://dental.test", {
      headers: {
        "x-forwarded-for": " 203.0.113.10, 198.51.100.3",
        "x-real-ip": "192.0.2.4",
        "user-agent": "Dental Test",
      },
    });
    expect(getClientIp(forwarded)).toBe("203.0.113.10");
    expect(getRequestMeta(forwarded)).toEqual({
      ip_address: "203.0.113.10",
      user_agent: "Dental Test",
    });

    const direct = new Request("https://dental.test", {
      headers: { "x-real-ip": "192.0.2.4" },
    });
    expect(getClientIp(direct)).toBe("192.0.2.4");
    expect(getRequestMeta(direct)).toEqual({
      ip_address: "192.0.2.4",
      user_agent: undefined,
    });
    expect(getClientIp(new Request("https://dental.test"))).toBeNull();
  });
});
