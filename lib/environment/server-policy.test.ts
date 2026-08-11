import { describe, expect, test } from "bun:test";

import {
  assertStagingEnvironmentSafety,
  getStagingEnvironmentErrors,
  STAGING_APP_URL,
  STAGING_VERCEL_PROJECT_ID,
  STAGING_VERCEL_TEAM_ID,
} from "./policy";

function safeStagingEnvironment(): Record<string, string> {
  return {
    APP_ENV: "staging",
    APP_URL: STAGING_APP_URL,
    NEXT_PUBLIC_BASE_URL: STAGING_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "staging-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "staging-service-key",
    STAGING_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    STRIPE_SECRET_KEY: "sk_test_staging",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_staging",
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

  test("rejects production Supabase and live Stripe credentials", () => {
    const environment = {
      ...safeStagingEnvironment(),
      NEXT_PUBLIC_SUPABASE_URL: "https://cxqkuqtwrtgvoorxidvn.supabase.co",
      STAGING_SUPABASE_PROJECT_REF: "cxqkuqtwrtgvoorxidvn",
      STRIPE_SECRET_KEY: "sk_live_unrestricted",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_browser_writes",
    };

    expect(getStagingEnvironmentErrors(environment)).toEqual(
      expect.arrayContaining([
        "The production Supabase project is forbidden in staging.",
        "STRIPE_SECRET_KEY must be a Stripe test-mode key in staging.",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a Stripe test-mode key in staging.",
      ]),
    );
  });

  test("rejects an unverified custom domain in staging", () => {
    expect(
      getStagingEnvironmentErrors({
        ...safeStagingEnvironment(),
        APP_URL: "https://staging.dental.bio",
        NEXT_PUBLIC_BASE_URL: "https://staging.dental.bio",
      }),
    ).toEqual(
      expect.arrayContaining([
        `APP_URL must be ${STAGING_APP_URL} in staging.`,
        `NEXT_PUBLIC_BASE_URL must be ${STAGING_APP_URL} in staging.`,
      ]),
    );
  });

  test("allows provider credentials but pins Vercel mutations to staging", () => {
    const environment = {
      ...safeStagingEnvironment(),
      CRON_SECRET_KEY: "reused-production-secret",
      STRIPE_WEBHOOK_SECRET: "whsec_test_endpoint",
      VERIFF_API_KEY: "production-capable-key",
      VERCEL_API_KEY: "production-capable-key",
      VERCEL_PROJECT_ID: STAGING_VERCEL_PROJECT_ID,
      VERCEL_TEAM_ID: STAGING_VERCEL_TEAM_ID,
    };

    expect(getStagingEnvironmentErrors(environment)).toEqual([]);

    expect(
      getStagingEnvironmentErrors({
        ...environment,
        VERCEL_PROJECT_ID: "prj_production",
      }),
    ).toContain(
      "VERCEL_PROJECT_ID must identify the isolated staging project when VERCEL_API_KEY is configured.",
    );
  });

  test("does not change production defaults", () => {
    expect(getStagingEnvironmentErrors({ NODE_ENV: "production" })).toEqual([]);
  });
});
