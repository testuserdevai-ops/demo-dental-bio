import { afterEach, describe, expect, it, mock } from "bun:test";

const resetPasswordForEmail = mock(async () => ({ error: null }));
const verifyOtp = mock(async () => ({ error: null }));
const getUser = mock<
  () => Promise<{ data: { user: { id: string } | null }; error?: unknown }>
>(async () => ({ data: { user: { id: "user-1" } } }));
const updateUser = mock(async () => ({ error: null }));
const createClient = mock(async () => ({
  auth: { resetPasswordForEmail, verifyOtp, getUser, updateUser },
}));

mock.module("@/app/forgot-password/server-dependencies", () => ({
  createClient,
  headers: async () => new Headers({ host: "coach.bio" }),
  getDomainConfig: () => ({ baseUrl: "https://coach.bio" }),
}));

const recoveryActionModule = "./actions.ts?recovery-action-test";
const { requestPasswordReset, updateRecoveryPassword, verifyRecoveryOtp } =
  await import(recoveryActionModule);

afterEach(() => {
  createClient.mockClear();
  resetPasswordForEmail.mockClear();
  verifyOtp.mockClear();
  getUser.mockClear();
  updateUser.mockClear();
});

describe("recovery server actions", () => {
  it("rejects invalid recovery requests before Supabase", async () => {
    const result = await requestPasswordReset({ email: "not-an-email" });

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses the configured brand recovery callback and returns a generic success", async () => {
    const result = await requestPasswordReset({ email: " OWNER@EXAMPLE.COM " });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("owner@example.com", {
      redirectTo: "https://coach.bio/forgot-password",
    });
  });

  it("validates the OTP before asking Supabase to establish a recovery session", async () => {
    const result = await verifyRecoveryOtp({
      email: "owner@example.com",
      otp: "not-a-code",
    });

    expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("requires a validated recovery session before updating the password", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await updateRecoveryPassword({
      password: "GoodPass1!",
      confirmPassword: "GoodPass1!",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "RECOVERY_SESSION_REQUIRED",
    });
    expect(updateUser).not.toHaveBeenCalled();
  });
});
