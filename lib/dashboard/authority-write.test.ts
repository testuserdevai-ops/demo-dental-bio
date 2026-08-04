import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

let singleResult: {
  data: { id: string } | null;
  error: { message: string } | null;
};
let maybeSingleResult: {
  data: {
    id: string;
    subscription_id: string | null;
    subscription_status: string | null;
  } | null;
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

mock.module("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from },
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
    filters = [];
    selectedColumns = [];
    singleResult = { data: { id: "user-1" }, error: null };
    maybeSingleResult = {
      data: {
        id: "user-1",
        subscription_id: "sub_1",
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

    selectedColumns = [];
    filters = [];
    await authority.clearSubscriptionAuthorityForStripeCustomer(
      "cus_1",
      "sub_1",
    );
    expect(filters).toContainEqual(["eq", "customer_id", "cus_1"]);
    expect(filters).toContainEqual(["eq", "subscription_id", "sub_1"]);
    expect(selectedColumns).toEqual(["id"]);

    selectedColumns = [];
    filters = [];
    await authority.clearStripeCustomerAuthority("cus_1");
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

    await authority.updateSubscriptionAuthority("user-1", {
      subscription_status: "FREE",
    });
    expect(update).toHaveBeenLastCalledWith({ subscription_status: "FREE" });

    await authority.updateSubscriptionAuthorityForStripeCustomer("cus_1", {
      subscription_status: "PRO",
    });
    expect(update).toHaveBeenLastCalledWith({ subscription_status: "PRO" });

    await authority.clearSubscriptionAuthorityForStripeCustomer(
      "cus_1",
      "sub_1",
    );
    expect(update).toHaveBeenLastCalledWith({
      subscription_id: null,
      plan_id: null,
      subscription_status: "FREE",
      current_period_end: null,
      trial_end: null,
    });

    await authority.clearStripeCustomerAuthority("cus_1");
    expect(update).toHaveBeenLastCalledWith({
      subscription_id: null,
      plan_id: null,
      subscription_status: "FREE",
      current_period_end: null,
      trial_end: null,
      customer_id: null,
    });
  });

  it("reads only minimal Stripe subscription authority by exact customer", async () => {
    const result =
      await authority.getSubscriptionAuthorityForStripeCustomer("cus_1");

    expect(selectedColumns).toEqual([
      "id, subscription_id, subscription_status",
    ]);
    expect(filters).toEqual([["eq", "customer_id", "cus_1"]]);
    expect(result).toEqual(maybeSingleResult.data);

    maybeSingleResult = { data: null, error: { message: "read failed" } };
    await expect(
      authority.getSubscriptionAuthorityForStripeCustomer("cus_1"),
    ).rejects.toThrow("Authority read failed: read failed");
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
      () =>
        authority.updateSubscriptionAuthority("user-1", {
          subscription_status: "FREE",
        }),
      () =>
        authority.updateSubscriptionAuthorityForStripeCustomer("cus_1", {
          subscription_status: "PRO",
        }),
      () =>
        authority.clearSubscriptionAuthorityForStripeCustomer("cus_1", "sub_1"),
      () => authority.clearStripeCustomerAuthority("cus_1"),
    ];

    for (const write of writes) {
      singleResult = { data: null, error: { message: "denied" } };
      await expect(write()).rejects.toThrow("Authority write failed: denied");
      singleResult = { data: null, error: null };
      await expect(write()).rejects.toThrow("user was not found");
    }
  });
});
