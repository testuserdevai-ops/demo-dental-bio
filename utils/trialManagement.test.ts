import { describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const trialManagementModulePath =
  "./trialManagement.ts?trial-management-pure-test";
const {
  buildStripeIdempotencyKey,
  createOrExtendStripeTrial,
  shouldDisableExternalProvidersForLocalE2E,
} = await import(trialManagementModulePath);

describe("buildStripeIdempotencyKey", () => {
  const userId = "9250a849-9eb9-4986-b785-0dfe52a4cd5e";

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
