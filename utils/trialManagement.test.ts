import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const referrerUserId = "9250a849-9eb9-4986-b785-0dfe52a4cd5e";
const staleLocalEnd = "2030-01-15T00:00:00.000Z";
let stripeTrialEnd = Math.floor(new Date(staleLocalEnd).getTime() / 1000);
const stripeTargets: number[] = [];
const entitlementTargets = new Map<
  string,
  { status: "processing" | "applied"; targetEnd: string }
>();

const retrieveSubscription = mock(async () => ({
  id: "sub_referrer",
  customer: "cus_referrer",
  status: "trialing",
  trial_end: stripeTrialEnd,
  current_period_end: stripeTrialEnd,
  metadata: {},
}));
const updateSubscription = mock(
  async (_subscriptionId: string, update: { trial_end: number }) => {
    stripeTrialEnd = update.trial_end;
    stripeTargets.push(update.trial_end);
    return { id: "sub_referrer" };
  },
);

mock.module("stripe", () => ({
  default: class StripeMock {
    subscriptions = {
      retrieve: retrieveSubscription,
      update: updateSubscription,
      search: mock(async () => ({ data: [] })),
      create: mock(async () => ({
        id: "sub_created",
        customer: "cus_referrer",
      })),
    };
    customers = {
      search: mock(async () => ({ data: [] })),
      create: mock(async () => ({ id: "cus_referrer" })),
    };
  },
}));

mock.module("@/utils/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              trial_end: staleLocalEnd,
              current_period_end: staleLocalEnd,
              subscription_id: "sub_referrer",
              email: "referrer@example.test",
              first_name: "Referrer",
              last_name: "Owner",
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

const referralEntitlementRpc = mock(
  async (functionName: string, params: Record<string, unknown>) => {
    const operationKey = String(params.p_operation_key);
    if (functionName === "claim_referral_entitlement") {
      const existing = entitlementTargets.get(operationKey);
      if (existing) {
        return {
          data: {
            claim_status:
              existing.status === "applied" ? "already_applied" : "busy",
            target_end: existing.targetEnd,
            is_trial: true,
          },
          error: null,
        };
      }

      const providerEnd = new Date(String(params.p_provider_period_end));
      const latestTarget = [...entitlementTargets.values()].at(-1)?.targetEnd;
      const base = latestTarget ? new Date(latestTarget) : providerEnd;
      base.setUTCMonth(base.getUTCMonth() + Number(params.p_additional_months));
      const targetEnd = base.toISOString();
      entitlementTargets.set(operationKey, {
        status: "processing",
        targetEnd,
      });
      return {
        data: {
          claim_status: "claimed",
          target_end: targetEnd,
          is_trial: true,
        },
        error: null,
      };
    }

    if (functionName === "finish_referral_entitlement") {
      const existing = entitlementTargets.get(operationKey);
      if (!existing) return { data: null, error: new Error("missing claim") };
      existing.status = "applied";
      return { data: { operation_key: operationKey }, error: null };
    }

    throw new Error(`Unexpected RPC: ${functionName}`);
  },
);

mock.module("@/utils/supabase/supabaseAdmin", () => ({
  default: { rpc: referralEntitlementRpc },
}));

const trialManagementModulePath =
  "./trialManagement.ts?trial-management-pure-test";
const {
  buildStripeIdempotencyKey,
  createOrExtendStripeTrial,
  extendPaidPeriodOrTrial,
  shouldDisableExternalProvidersForLocalE2E,
} = await import(trialManagementModulePath);

beforeEach(() => {
  stripeTrialEnd = Math.floor(new Date(staleLocalEnd).getTime() / 1000);
  stripeTargets.length = 0;
  entitlementTargets.clear();
  retrieveSubscription.mockClear();
  updateSubscription.mockClear();
  referralEntitlementRpc.mockClear();
});

describe("buildStripeIdempotencyKey", () => {
  const userId = referrerUserId;

  test("returns the same opaque key for the same logical operation", () => {
    const first = buildStripeIdempotencyKey(
      "subscription",
      userId,
      "registration-v1",
    );
    const retry = buildStripeIdempotencyKey(
      "subscription",
      userId,
      "registration-v1",
    );

    expect(retry).toBe(first);
    expect(first).toMatch(
      /^dentalbio:registration:v1:subscription:[a-f0-9]{64}$/,
    );
    expect(first).not.toContain(userId);
  });

  test("separates customer, subscription, and referral operations", () => {
    const customer = buildStripeIdempotencyKey(
      "customer",
      userId,
      "registration-v1",
    );
    const subscription = buildStripeIdempotencyKey(
      "subscription",
      userId,
      "registration-v1",
    );
    const referral = buildStripeIdempotencyKey(
      "referral-extension",
      userId,
      "referring-registration-id",
    );

    expect(new Set([customer, subscription, referral]).size).toBe(3);
  });

  test("separates distinct referral grants for the same referrer", () => {
    const firstReferral = buildStripeIdempotencyKey(
      "referral-extension",
      userId,
      "registration-one",
    );
    const secondReferral = buildStripeIdempotencyKey(
      "referral-extension",
      userId,
      "registration-two",
    );

    expect(firstReferral).not.toBe(secondReferral);
  });
});

describe("extendPaidPeriodOrTrial", () => {
  test("accumulates distinct referral operations and replays one operation once", async () => {
    const first = await extendPaidPeriodOrTrial(referrerUserId, 1, {
      operationKey: "referred-registration-one",
    });
    const second = await extendPaidPeriodOrTrial(referrerUserId, 1, {
      operationKey: "referred-registration-two",
    });
    const replay = await extendPaidPeriodOrTrial(referrerUserId, 1, {
      operationKey: "referred-registration-one",
    });

    expect(first).toEqual({ ok: true, code: "UPDATED" });
    expect(second).toEqual({ ok: true, code: "UPDATED" });
    expect(replay).toEqual({ ok: true, code: "REUSED" });
    expect(
      stripeTargets.map((timestamp) =>
        new Date(timestamp * 1000).toISOString(),
      ),
    ).toEqual(["2030-02-15T00:00:00.000Z", "2030-03-15T00:00:00.000Z"]);
  });
});

describe("shouldDisableExternalProvidersForLocalE2E", () => {
  test("allows provider skipping only for explicit loopback test runs", () => {
    expect(
      shouldDisableExternalProvidersForLocalE2E({
        disableExternals: "1",
        supabaseUrl: "http://127.0.0.1:54321",
      }),
    ).toBe(true);
    expect(
      shouldDisableExternalProvidersForLocalE2E({
        disableExternals: "1",
        supabaseUrl: "http://localhost:54321",
      }),
    ).toBe(true);
  });

  test("never skips providers for a remote Supabase project", () => {
    expect(
      shouldDisableExternalProvidersForLocalE2E({
        disableExternals: "1",
        supabaseUrl: "https://project.supabase.co",
      }),
    ).toBe(false);
    expect(
      shouldDisableExternalProvidersForLocalE2E({
        disableExternals: undefined,
        supabaseUrl: "http://127.0.0.1:54321",
      }),
    ).toBe(false);
  });

  test("returns an explicit non-provider result for a loopback E2E run", async () => {
    const previousDisableExternals = process.env.E2E_DISABLE_EXTERNALS;
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.E2E_DISABLE_EXTERNALS = "1";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";

    try {
      expect(
        await createOrExtendStripeTrial({
          userId: "9250a849-9eb9-4986-b785-0dfe52a4cd5e",
          email: "local-e2e@example.test",
          name: "Local E2E",
          priceId: "price_not_sent_to_stripe",
          months: 1,
          operationKey: "registration-v1",
        }),
      ).toEqual({
        ok: true,
        code: "SKIPPED_LOCAL_TEST",
        subscription: null,
        customerId: null,
      });
    } finally {
      if (previousDisableExternals === undefined) {
        delete process.env.E2E_DISABLE_EXTERNALS;
      } else {
        process.env.E2E_DISABLE_EXTERNALS = previousDisableExternals;
      }
      if (previousSupabaseUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
      }
    }
  });
});
