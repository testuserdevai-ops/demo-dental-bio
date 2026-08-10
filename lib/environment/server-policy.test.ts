import { describe, expect, test } from "bun:test";

import {
  assertExternalMutationAllowed,
  assertStagingEnvironmentSafety,
  getStagingEnvironmentErrors,
  StagingExternalMutationError,
} from "./policy";

function safeStagingEnvironment(): Record<string, string> {
  return {
    APP_ENV: "staging",
    APP_URL: "https://staging.dental.bio",
    NEXT_PUBLIC_BASE_URL: "https://staging.dental.bio",
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
    STAGING_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    STRIPE_SECRET_KEY: "rk_live_read_only",
    EMAIL_DELIVERY_MODE: "redirect",
    EMAIL_REDIRECT_TO: "rameznoshy@gmail.com",
    EMAIL_SUBJECT_PREFIX: "[STAGING]",
    RESEND_API_KEY: "re_staging",
  };
}

describe("staging environment policy", () => {
  test("accepts an isolated fail-closed staging configuration", () => {
    expect(getStagingEnvironmentErrors(safeStagingEnvironment())).toEqual([]);
    expect(() =>
      assertStagingEnvironmentSafety(safeStagingEnvironment()),
    ).not.toThrow();
  });

  test("rejects production Supabase and mutation-capable provider secrets", () => {
    const environment = {
      ...safeStagingEnvironment(),
      NEXT_PUBLIC_SUPABASE_URL: "https://cxqkuqtwrtgvoorxidvn.supabase.co",
      STAGING_SUPABASE_PROJECT_REF: "cxqkuqtwrtgvoorxidvn",
      STRIPE_SECRET_KEY: "sk_live_unrestricted",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_browser_writes",
      STRIPE_WEBHOOK_SECRET: "whsec_live",
      VERCEL_API_KEY: "vercel-live",
      VERIFF_API_KEY: "veriff-live",
    };

    expect(getStagingEnvironmentErrors(environment)).toEqual(
      expect.arrayContaining([
        "The production Supabase project is forbidden in staging.",
        "STRIPE_SECRET_KEY must be a restricted rk_ key in staging.",
        "A live Stripe publishable key is forbidden in staging.",
        "STRIPE_WEBHOOK_SECRET must not be configured in staging.",
        "VERCEL_API_KEY must not be configured in staging.",
        "VERIFF_API_KEY must not be configured in staging.",
      ]),
    );
  });

  test("blocks every external mutation provider in staging", () => {
    for (const provider of [
      "cron",
      "stripe",
      "stripe_webhook",
      "vercel",
      "veriff",
    ] as const) {
      expect(() =>
        assertExternalMutationAllowed(provider, safeStagingEnvironment()),
      ).toThrow(StagingExternalMutationError);
    }
  });

  test("does not change production defaults", () => {
    expect(getStagingEnvironmentErrors({ NODE_ENV: "production" })).toEqual([]);
    expect(() =>
      assertExternalMutationAllowed("stripe", { NODE_ENV: "production" }),
    ).not.toThrow();
  });
});
