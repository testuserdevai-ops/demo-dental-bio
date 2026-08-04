import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let singleResult: {
  data: { id: string } | null;
  error: { message: string } | null;
};
let maybeSingleResult: {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};
let selectedColumns: string[];
let filters: Array<[string, string, unknown]>;

const single = mock(async () => singleResult);
const maybeSingle = mock(async () => maybeSingleResult);
const query = {
  eq: mock((column: string, value: unknown) => {
    filters.push(["eq", column, value]);
    return query;
  }),
  is: mock((column: string, value: unknown) => {
    filters.push(["is", column, value]);
    return query;
  }),
  select: mock((columns: string) => {
    selectedColumns.push(columns);
    return query;
  }),
  single,
  maybeSingle,
};
const update = mock(() => query);
const from = mock(() => ({ update, select: query.select }));
const rpc = mock(
  async (
    _functionName?: string,
    _parameters?: unknown,
  ): Promise<{ data: unknown; error: { message: string } | null }> => ({
    data: "processed",
    error: null,
  }),
);

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from, rpc },
}));

const authorityWriteModule =
  "./authority-write.ts?authority-write-round-2-test";
const authority = await import(authorityWriteModule);

describe("dashboard authority writes", () => {
  beforeEach(() => {
    from.mockClear();
    update.mockClear();
    query.eq.mockClear();
    query.is.mockClear();
    query.select.mockClear();
    single.mockClear();
    rpc.mockClear();
    rpc.mockResolvedValue({ data: "processed", error: null });
    filters = [];
    selectedColumns = [];
    singleResult = { data: { id: "user-1" }, error: null };
    maybeSingleResult = {
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        subscription_status: "PRO",
      },
      error: null,
    };
  });

  it("uses exact minimal selectors for every exported one-user writer", async () => {
    await authority.saveVeriffSession("user-1", {
      sessionId: "veriff-1",
      sessionUrl: "https://example.test/session",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setUserVerification("user-1", true);
    expect(selectedColumns).toEqual(["id, isVerified"]);

    selectedColumns = [];
    filters = [];
    await authority.setUserVerificationForVeriffSession("veriff-1");
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setUserVerificationForOwnedVeriffSession(
      "user-1",
      "veriff-1",
    );
    expect(filters).toContainEqual(["eq", "id", "user-1"]);
    expect(filters).toContainEqual(["eq", "session_id", "veriff-1"]);
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setStripeCustomerId("user-1", "cus_1");
    expect(filters).toContainEqual(["is", "customer_id", null]);
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setCustomDomainAuthority("user-1", "example.test", false);
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setCustomDomainVerification("user-1", true);
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.setDentalBrandAuthority("user-1", false);
    expect(selectedColumns).toEqual(["id, use_dental_brand"]);

    selectedColumns = [];
    filters = [];
    await authority.updateSubscriptionAuthority("user-1", {
      subscription_status: "FREE",
    });
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.updateSubscriptionAuthorityForStripeCustomer("cus_1", {
      subscription_status: "PRO",
    });
    expect(filters).toContainEqual(["eq", "customer_id", "cus_1"]);
    expect(selectedColumns).toEqual(["id"]);
  });

  it("keeps each writer payload closed to its authority fields", async () => {
    await authority.saveVeriffSession("user-1", {
      sessionId: "veriff-1",
      sessionUrl: "https://example.test/session",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    expect(update).toHaveBeenLastCalledWith({
      session_id: "veriff-1",
      veriff_session_url: "https://example.test/session",
      session_created_at: "2026-08-04T00:00:00.000Z",
    });

    await authority.setUserVerification("user-1", false);
    expect(update).toHaveBeenLastCalledWith({ isVerified: false });

    await authority.setUserVerificationForVeriffSession("veriff-1");
    expect(update).toHaveBeenLastCalledWith({ isVerified: true });

    await authority.setUserVerificationForOwnedVeriffSession(
      "user-1",
      "veriff-1",
    );
    expect(update).toHaveBeenLastCalledWith({ isVerified: true });

    await authority.setStripeCustomerId("user-1", "cus_1");
    expect(update).toHaveBeenLastCalledWith({ customer_id: "cus_1" });

    await authority.setCustomDomainAuthority("user-1", "example.test", false);
    expect(update).toHaveBeenLastCalledWith({
      domain: "example.test",
      domain_verified: false,
    });

    await authority.setCustomDomainVerification("user-1", true);
    expect(update).toHaveBeenLastCalledWith({ domain_verified: true });

    await authority.setDentalBrandAuthority("user-1", false);
    expect(update).toHaveBeenLastCalledWith({ use_dental_brand: false });

    await authority.updateSubscriptionAuthority("user-1", {
      subscription_status: "FREE",
    });
    expect(update).toHaveBeenLastCalledWith({
      subscription_status: "FREE",
    });

    await authority.updateSubscriptionAuthorityForStripeCustomer("cus_1", {
      subscription_status: "PRO",
    });
    expect(update).toHaveBeenLastCalledWith({ subscription_status: "PRO" });
  });

  it("reads Stripe subscription authority through the controlled service RPC", async () => {
    const authorityRow = {
      user_id: "00000000-0000-4000-8000-000000000001",
      subscription_id: "sub_1",
      pending_subscription_id: null,
      subscription_status: "PRO",
      current_period_end: null,
      plan_id: "price_1",
      trial_end: null,
      billing_cycle: "monthly",
    };
    rpc.mockResolvedValueOnce({ data: authorityRow, error: null });
    const result =
      await authority.getSubscriptionAuthorityForStripeCustomer("cus_1");

    expect(rpc).toHaveBeenCalledWith(
      "get_subscription_authority_for_stripe_customer",
      { p_customer_id: "cus_1" },
    );
    expect(result).toEqual(authorityRow);

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "read failed" },
    });
    await expect(
      authority.getSubscriptionAuthorityForStripeCustomer("cus_1"),
    ).rejects.toThrow("Authority read failed: read failed");
  });

  it("reads only the target fields needed for dental branding entitlement", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";

    await expect(
      authority.getDentalBrandEntitlementAuthority(userId),
    ).resolves.toEqual({ id: userId, subscription_status: "PRO" });
    expect(from).toHaveBeenCalledWith("users");
    expect(selectedColumns).toEqual(["id, subscription_status"]);
    expect(filters).toEqual([["eq", "id", userId]]);

    maybeSingleResult = { data: null, error: null };
    await expect(
      authority.getDentalBrandEntitlementAuthority(userId),
    ).resolves.toBeNull();

    maybeSingleResult = { data: null, error: { message: "denied" } };
    await expect(
      authority.getDentalBrandEntitlementAuthority(userId),
    ).rejects.toThrow("Authority read failed: denied");
  });

  it("rejects database errors and zero-row writes for every writer", async () => {
    const writes = [
      () =>
        authority.saveVeriffSession("user-1", {
          sessionId: "veriff-1",
          sessionUrl: "https://example.test/session",
          createdAt: "2026-08-04T00:00:00.000Z",
        }),
      () => authority.setUserVerification("user-1", true),
      () => authority.setUserVerificationForVeriffSession("veriff-1"),
      () =>
        authority.setUserVerificationForOwnedVeriffSession(
          "user-1",
          "veriff-1",
        ),
      () => authority.setStripeCustomerId("user-1", "cus_1"),
      () => authority.setCustomDomainAuthority("user-1", "example.test", false),
      () => authority.setCustomDomainVerification("user-1", true),
      () => authority.setDentalBrandAuthority("user-1", false),
      () =>
        authority.updateSubscriptionAuthority("user-1", {
          subscription_status: "FREE",
        }),
      () =>
        authority.updateSubscriptionAuthorityForStripeCustomer("cus_1", {
          subscription_status: "PRO",
        }),
    ];

    for (const write of writes) {
      singleResult = { data: null, error: { message: "denied" } };
      await expect(write()).rejects.toThrow("Authority write failed: denied");
      singleResult = { data: null, error: null };
      await expect(write()).rejects.toThrow("user was not found");
    }
  });

  it("processes Stripe customer deletion through the atomic service RPC", async () => {
    await expect(
      authority.processStripeCustomerDeletion("cus_1"),
    ).resolves.toBe("processed");
    expect(rpc).toHaveBeenCalledWith("process_stripe_customer_deletion", {
      p_customer_id: "cus_1",
    });

    rpc.mockResolvedValueOnce({ data: "already_processed", error: null });
    await expect(
      authority.processStripeCustomerDeletion("cus_1"),
    ).resolves.toBe("already_processed");

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Stripe customer is not linked to a user" },
    });
    await expect(
      authority.processStripeCustomerDeletion("cus_unknown"),
    ).rejects.toThrow("Stripe customer is not linked to a user");
  });

  it("routes private cancellation and subscription CAS through controlled service RPCs", async () => {
    const userId = "00000000-0000-4000-8000-000000000001";
    rpc.mockImplementation(async (functionName?: string) => {
      if (functionName === "get_subscription_authority_for_user") {
        return {
          data: {
            user_id: userId,
            subscription_id: "sub_1",
            pending_subscription_id: null,
            subscription_status: "PRO",
            current_period_end: "2026-09-01T00:00:00.000Z",
            plan_id: "price_1",
            trial_end: null,
            billing_cycle: "monthly",
          },
          error: null,
        };
      }
      if (functionName === "begin_subscription_cancellation") {
        return {
          data: { result: "begun", subscription_id: "sub_1" },
          error: null,
        };
      }
      if (functionName === "finish_subscription_cancellation") {
        return { data: "restored", error: null };
      }
      if (functionName === "apply_stripe_subscription_update") {
        return { data: "applied", error: null };
      }
      if (functionName === "process_stripe_subscription_deletion") {
        return { data: "pending_cleared", error: null };
      }
      return { data: null, error: { message: "unexpected RPC" } };
    });

    await authority.getSubscriptionAuthorityForUser(userId);
    expect(rpc).toHaveBeenLastCalledWith(
      "get_subscription_authority_for_user",
      { p_user_id: userId },
    );

    await authority.beginSubscriptionCancellation({
      userId,
      expectedSubscriptionId: "sub_1",
      expectedPendingSubscriptionId: null,
      subscriptionStatus: "FREE",
      currentPeriodEnd: null,
    });
    expect(rpc).toHaveBeenLastCalledWith("begin_subscription_cancellation", {
      p_input: {
        user_id: userId,
        expected_subscription_id: "sub_1",
        expected_pending_subscription_id: null,
        subscription_status: "FREE",
        current_period_end: null,
      },
    });

    rpc.mockResolvedValueOnce({
      data: { result: "applied", subscription_id: null },
      error: null,
    });
    await expect(
      authority.beginSubscriptionCancellation({
        userId,
        expectedSubscriptionId: null,
        expectedPendingSubscriptionId: null,
        subscriptionStatus: "PREMIUM PRO",
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
      }),
    ).resolves.toEqual({ result: "applied", subscription_id: null });

    await authority.finishSubscriptionCancellation(userId, "sub_1", "restore");
    expect(rpc).toHaveBeenLastCalledWith("finish_subscription_cancellation", {
      p_user_id: userId,
      p_subscription_id: "sub_1",
      p_outcome: "restore",
    });

    await authority.applySubscriptionUpdateCas({
      customerId: "cus_1",
      expectedSubscriptionId: "sub_1",
      expectedPendingSubscriptionId: null,
      subscriptionId: "sub_2",
      planId: "price_2",
      subscriptionStatus: "PRO",
      currentPeriodEnd: "2026-10-01T00:00:00.000Z",
      trialEnd: null,
      billingCycle: "monthly",
    });
    expect(rpc).toHaveBeenLastCalledWith("apply_stripe_subscription_update", {
      p_input: {
        customer_id: "cus_1",
        expected_subscription_id: "sub_1",
        expected_pending_subscription_id: null,
        subscription_id: "sub_2",
        plan_id: "price_2",
        subscription_status: "PRO",
        current_period_end: "2026-10-01T00:00:00.000Z",
        trial_end: null,
        billing_cycle: "monthly",
      },
    });

    await authority.processStripeSubscriptionDeletion("cus_1", "sub_1");
    expect(rpc).toHaveBeenLastCalledWith(
      "process_stripe_subscription_deletion",
      { p_customer_id: "cus_1", p_subscription_id: "sub_1" },
    );

    rpc.mockResolvedValueOnce({
      data: "cancellation_completed",
      error: null,
    });
    await expect(
      authority.processStripeSubscriptionDeletion("cus_1", "sub_old"),
    ).resolves.toBe("cancellation_completed");
  });
});
