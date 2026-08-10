import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const rpc = mock(async (): Promise<{ data: unknown; error: Error | null }> => ({
  data: null,
  error: null,
}));
mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { rpc },
}));

const repositoryModulePath =
  "./referral-entitlement-repository.ts?referral-entitlement-repository-test";
const { claimReferralEntitlement, finishReferralEntitlement } = await import(
  repositoryModulePath
);

const USER_ID = "9250a849-9eb9-4986-b785-0dfe52a4cd5e";
const claimInput = {
  userId: USER_ID,
  operationKey: "referred-registration-one",
  additionalMonths: 2,
  providerPeriodEnd: "2030-01-15T00:00:00.000Z",
  isTrial: true,
};

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("referral entitlement repository", () => {
  test("claims with the exact RPC payload and parses the controlled result", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        claim_status: "claimed",
        target_end: "2030-03-15T00:00:00.000Z",
        is_trial: true,
      },
      error: null,
    });

    expect(await claimReferralEntitlement(claimInput)).toEqual({
      claim_status: "claimed",
      target_end: "2030-03-15T00:00:00.000Z",
      is_trial: true,
    });
    expect(rpc).toHaveBeenCalledWith("claim_referral_entitlement", {
      p_user_id: USER_ID,
      p_operation_key: "referred-registration-one",
      p_additional_months: 2,
      p_provider_period_end: "2030-01-15T00:00:00.000Z",
      p_is_trial: true,
    });
  });

  test("preserves already-applied and busy claim statuses", async () => {
    rpc.mockResolvedValueOnce({
      data: { claim_status: "already_applied" },
      error: null,
    });
    expect(await claimReferralEntitlement(claimInput)).toEqual({
      claim_status: "already_applied",
    });

    rpc.mockResolvedValueOnce({
      data: { claim_status: "busy" },
      error: null,
    });
    expect(await claimReferralEntitlement(claimInput)).toEqual({
      claim_status: "busy",
    });
  });

  test("rejects RPC and invalid-result failures with a bounded claim error", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("provider detail"),
    });
    await expect(claimReferralEntitlement(claimInput)).rejects.toThrow(
      "Referral entitlement claim failed",
    );

    rpc.mockRejectedValueOnce(new Error("network provider detail"));
    await expect(claimReferralEntitlement(claimInput)).rejects.toThrow(
      "Referral entitlement claim failed",
    );

    rpc.mockResolvedValueOnce({
      data: { claim_status: "unexpected", provider_detail: "secret" },
      error: null,
    });
    await expect(claimReferralEntitlement(claimInput)).rejects.toThrow(
      "Referral entitlement claim failed",
    );
  });

  test("finishes with the exact success/failure payload and returns presence", async () => {
    rpc.mockResolvedValueOnce({
      data: { operation_key: "referred-registration-one" },
      error: null,
    });
    expect(
      await finishReferralEntitlement({
        userId: USER_ID,
        operationKey: "referred-registration-one",
        succeeded: true,
      }),
    ).toBe(true);
    expect(rpc).toHaveBeenLastCalledWith("finish_referral_entitlement", {
      p_user_id: USER_ID,
      p_operation_key: "referred-registration-one",
      p_succeeded: true,
    });

    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(
      await finishReferralEntitlement({
        userId: USER_ID,
        operationKey: "referred-registration-one",
        succeeded: false,
      }),
    ).toBe(false);
  });

  test("rejects finish errors without leaking provider details", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: new Error("provider detail"),
    });

    await expect(
      finishReferralEntitlement({
        userId: USER_ID,
        operationKey: "referred-registration-one",
        succeeded: false,
      }),
    ).rejects.toThrow("Referral entitlement finish failed");

    rpc.mockRejectedValueOnce(new Error("network provider detail"));
    await expect(
      finishReferralEntitlement({
        userId: USER_ID,
        operationKey: "referred-registration-one",
        succeeded: false,
      }),
    ).rejects.toThrow("Referral entitlement finish failed");
  });
});
