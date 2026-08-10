import "server-only";

import { createHash } from "node:crypto";
import {
  claimReferralEntitlement,
  finishReferralEntitlement,
} from "@/lib/subscription/referral-entitlement-repository";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const pricePro = process.env.PRICE_PRO_MONTHLY!;

const REGISTRATION_METADATA_KEY = "dentalbio_registration_key";
const CUSTOMER_METADATA_KEY = "dentalbio_customer_key";

export type StripeRegistrationOperation =
  "customer" | "subscription" | "referral-extension" | "subscription-extension";

export type TrialProviderFailureCode =
  "INVALID_INPUT" | "NOT_ELIGIBLE" | "USER_LOOKUP_FAILED" | "PROVIDER_ERROR";

export type TrialProviderResult =
  | {
      ok: true;
      code: "CREATED" | "REUSED";
      subscription: Stripe.Subscription;
      customerId: string;
    }
  | {
      ok: true;
      code: "SKIPPED_LOCAL_TEST";
      subscription: null;
      customerId: null;
    }
  | {
      ok: false;
      code: TrialProviderFailureCode;
      retryable: boolean;
    };

export type ProviderOperationResult =
  | { ok: true; code: "UPDATED" | "REUSED" | "SKIPPED_LOCAL_TEST" }
  | {
      ok: false;
      code: TrialProviderFailureCode;
      retryable: boolean;
    };

export function buildStripeIdempotencyKey(
  operation: StripeRegistrationOperation,
  userId: string,
  subjectId = "default",
): string {
  const digest = createHash("sha256")
    .update(`dentalbio\0${operation}\0${userId}\0${subjectId}`)
    .digest("hex");

  return `dentalbio:registration:v1:${operation}:${digest}`;
}

export function shouldDisableExternalProvidersForLocalE2E({
  disableExternals = process.env.E2E_DISABLE_EXTERNALS,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
}: {
  disableExternals?: string;
  supabaseUrl?: string;
} = {}): boolean {
  if (disableExternals !== "1" || !supabaseUrl) return false;

  try {
    const { hostname, protocol } = new URL(supabaseUrl);
    return (
      protocol === "http:" &&
      (hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]")
    );
  } catch {
    return false;
  }
}

function providerFailure(
  code: TrialProviderFailureCode,
  retryable: boolean,
): Extract<TrialProviderResult, { ok: false }> {
  return { ok: false, code, retryable };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function stripeMetadataQuery(key: string, value: string): string {
  return `metadata['${key}']:'${value}'`;
}

export interface TrialInfo {
  isInTrial: boolean;
  trialEndDate: Date | null;
  daysRemaining: number;
  trialType: "standard" | "student_offer" | "referral" | "none";
  baseTrialMonths: number;
  referralBonusMonths: number;
  totalTrialMonths: number;
}

export interface TrialStatus {
  isActive: boolean;
  isExpired: boolean;
  isEndingSoon: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
}

/**
 * Get the user's current Stripe subscription (if any)
 */
export async function getUserStripeSubscription(
  userId: string,
): Promise<Stripe.Subscription | null> {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("subscription_id")
    .eq("id", userId)
    .single();
  if (!user?.subscription_id) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(
      user.subscription_id,
    );
    return subscription as Stripe.Subscription;
  } catch {
    return null;
  }
}

/**
 * Check if user is eligible for a trial (no active paid sub, no previous trial)
 */
export async function isEligibleForTrial(userId: string): Promise<boolean> {
  const subscription = await getUserStripeSubscription(userId);
  if (!subscription) return true; // No sub, eligible
  if (subscription.status === "active" || subscription.status === "trialing") {
    return false;
  }
  return true;
}

/**
 * Creates a registration trial with a deterministic provider identity.
 *
 * Stripe idempotency keys have a finite retention window. The matching opaque
 * metadata search makes later retries converge when Stripe committed a request
 * before this application persisted the returned provider IDs.
 */
export async function createOrExtendStripeTrial({
  userId,
  email,
  name,
  priceId,
  months,
  metadata = {},
  operationKey,
}: {
  userId: string;
  email: string;
  name: string;
  priceId: string;
  months: number;
  metadata?: Record<string, string>;
  operationKey?: string;
}): Promise<TrialProviderResult> {
  if (shouldDisableExternalProvidersForLocalE2E()) {
    return {
      ok: true,
      code: "SKIPPED_LOCAL_TEST",
      subscription: null,
      customerId: null,
    };
  }

  if (
    !isUuid(userId) ||
    !email.trim() ||
    !priceId.trim() ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 24 ||
    (operationKey !== undefined && !operationKey.trim())
  ) {
    return providerFailure("INVALID_INPUT", false);
  }

  const operationScope = operationKey ?? `${priceId}:${months}`;
  const customerKey = buildStripeIdempotencyKey("customer", userId, "account");
  const subscriptionKey = buildStripeIdempotencyKey(
    "subscription",
    userId,
    operationScope,
  );
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("subscription_id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return providerFailure("USER_LOOKUP_FAILED", true);
  }

  try {
    if (user.subscription_id) {
      const storedSubscription = await stripe.subscriptions.retrieve(
        user.subscription_id,
      );
      if (
        storedSubscription.metadata[REGISTRATION_METADATA_KEY] ===
        subscriptionKey
      ) {
        return {
          ok: true,
          code: "REUSED",
          subscription: storedSubscription,
          customerId:
            typeof storedSubscription.customer === "string"
              ? storedSubscription.customer
              : storedSubscription.customer.id,
        };
      }
      if (
        storedSubscription.status === "active" ||
        storedSubscription.status === "trialing"
      ) {
        return providerFailure("NOT_ELIGIBLE", false);
      }
    }

    const matchingSubscriptions = await stripe.subscriptions.search({
      query: stripeMetadataQuery(REGISTRATION_METADATA_KEY, subscriptionKey),
      limit: 1,
    });
    const matchingSubscription = matchingSubscriptions.data[0];
    if (matchingSubscription) {
      if (matchingSubscription.status === "canceled") {
        return providerFailure("NOT_ELIGIBLE", false);
      }
      return {
        ok: true,
        code: "REUSED",
        subscription: matchingSubscription,
        customerId:
          typeof matchingSubscription.customer === "string"
            ? matchingSubscription.customer
            : matchingSubscription.customer.id,
      };
    }

    const matchingCustomers = await stripe.customers.search({
      query: stripeMetadataQuery(CUSTOMER_METADATA_KEY, customerKey),
      limit: 1,
    });
    const existingCustomer = matchingCustomers.data[0];
    const customerId = existingCustomer
      ? existingCustomer.id
      : (
          await stripe.customers.create(
            {
              email,
              name,
              metadata: { [CUSTOMER_METADATA_KEY]: customerKey },
            },
            { idempotencyKey: customerKey },
          )
        ).id;

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: months * 30,
        metadata: {
          ...metadata,
          [REGISTRATION_METADATA_KEY]: subscriptionKey,
        },
      },
      { idempotencyKey: subscriptionKey },
    );

    return {
      ok: true,
      code: "CREATED",
      subscription,
      customerId,
    };
  } catch {
    return providerFailure("PROVIDER_ERROR", true);
  }
}

/**
 * Get comprehensive trial information for a user
 */
export async function getTrialInfo(userId: string): Promise<TrialInfo | null> {
  const supabase = await createClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("trial_end, subscription_id, subscription_status")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return null;
  }

  const now = new Date();
  const trialEndDate = user.trial_end ? new Date(user.trial_end) : null;
  const isInTrial = trialEndDate ? trialEndDate > now : false;
  const daysRemaining = trialEndDate
    ? Math.ceil(
        (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  // Get trial metadata from Stripe if available
  let trialType: "standard" | "student_offer" | "referral" | "none" = "none";
  let baseTrialMonths = 0;
  let referralBonusMonths = 0;
  let totalTrialMonths = 0;

  if (user.subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        user.subscription_id,
      );
      const metadata = subscription.metadata;

      trialType = (metadata.trial_type as any) || "none";
      baseTrialMonths = parseInt(metadata.base_trial_months || "0");
      referralBonusMonths = parseInt(metadata.referral_bonus_months || "0");
      totalTrialMonths = parseInt(metadata.total_trial_months || "0");
    } catch (error) {
      console.error("Error retrieving subscription metadata:", error);
    }
  }

  return {
    isInTrial,
    trialEndDate,
    daysRemaining,
    trialType,
    baseTrialMonths,
    referralBonusMonths,
    totalTrialMonths,
  };
}

export async function getTrialStatus(
  userId: string,
): Promise<TrialStatus | null> {
  const trialInfo = await getTrialInfo(userId);
  if (!trialInfo) return null;
  const isActive = trialInfo.isInTrial;
  const isExpired = !isActive && trialInfo.trialEndDate !== null;
  const isEndingSoon = isActive && trialInfo.daysRemaining <= 3;
  return {
    isActive,
    isExpired,
    isEndingSoon,
    daysRemaining: trialInfo.daysRemaining,
    trialEndDate: trialInfo.trialEndDate,
  };
}

export async function isEligibleForTrialExtension(
  userId: string,
): Promise<boolean> {
  // Only allow extension if user has a paid Premium Pro plan
  const supabase = await createClient();

  // Get user's subscription status from database
  const { data: user, error } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  if (error || !user) return false;

  // Only allow trial extension for Premium Pro users
  return user.subscription_status === "PREMIUM PRO";
}

export async function extendTrial(
  userId: string,
  additionalMonths: number,
): Promise<boolean> {
  const supabase = await createClient();
  try {
    // Get current user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("trial_end, current_period_end, subscription_id")
      .eq("id", userId)
      .single();
    if (userError || !user) return false;
    const now = new Date();
    let currentEndDate: Date;
    if (user.trial_end && new Date(user.trial_end) > now) {
      currentEndDate = new Date(user.trial_end);
    } else if (user.current_period_end) {
      currentEndDate = new Date(user.current_period_end);
    } else {
      currentEndDate = now;
    }
    // Add additional months
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);
    // Update Stripe subscription if it exists and is in trial
    if (user.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.subscription_id,
        );
        if (subscription.status === "trialing") {
          const extendedEndDate = Math.floor(newEndDate.getTime() / 1000);
          await stripe.subscriptions.update(user.subscription_id, {
            trial_end: extendedEndDate,
            proration_behavior: "none",
          });
          return true;
        }
      } catch (stripeError) {
        console.error("Error updating Stripe subscription:", stripeError);
      }
    }
    return false;
  } catch (error) {
    console.error("Error extending trial:", error);
    return false;
  }
}

/**
 * Extend either the trial period (if in trial) or the paid period (if paid) for a user.
 * If in trial, extends trial_end. If paid, extends current_period_end (billing_cycle_anchor).
 * Returns true if successful.
 */
export async function extendPaidPeriodOrTrial(
  userId: string,
  additionalMonths: number,
  options: { operationKey?: string } = {},
): Promise<ProviderOperationResult> {
  if (shouldDisableExternalProvidersForLocalE2E()) {
    return { ok: true, code: "SKIPPED_LOCAL_TEST" };
  }
  if (
    !isUuid(userId) ||
    !Number.isInteger(additionalMonths) ||
    additionalMonths < 1 ||
    additionalMonths > 24 ||
    !options.operationKey?.trim() ||
    options.operationKey.trim().length > 255
  ) {
    return { ok: false, code: "INVALID_INPUT", retryable: false };
  }

  const supabase = await createClient();
  const operationKey = options.operationKey.trim();
  let entitlementClaimed = false;
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_id")
      .eq("id", userId)
      .single();
    if (userError || !user) {
      return { ok: false, code: "USER_LOOKUP_FAILED", retryable: true };
    }
    if (!user.subscription_id) {
      return { ok: false, code: "NOT_ELIGIBLE", retryable: false };
    }
    const subscription = await stripe.subscriptions.retrieve(
      user.subscription_id,
    );
    if (
      subscription.status !== "trialing" &&
      subscription.status !== "active"
    ) {
      return { ok: false, code: "NOT_ELIGIBLE", retryable: false };
    }

    const isTrial = subscription.status === "trialing";
    const providerPeriodEnd = isTrial
      ? subscription.trial_end
      : subscription.current_period_end;
    if (!providerPeriodEnd) {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }

    const claim = await claimReferralEntitlement({
      userId,
      operationKey,
      additionalMonths,
      providerPeriodEnd: new Date(providerPeriodEnd * 1000).toISOString(),
      isTrial,
    });

    const claimStatus = claim.claim_status;
    if (claimStatus === "already_applied") {
      return { ok: true, code: "REUSED" };
    }
    if (claimStatus !== "claimed") {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }

    const targetEnd = claim.target_end;
    const targetTimestamp =
      typeof targetEnd === "string"
        ? Math.floor(new Date(targetEnd).getTime() / 1000)
        : Number.NaN;
    if (!Number.isSafeInteger(targetTimestamp) || targetTimestamp <= 0) {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }

    entitlementClaimed = true;
    const idempotencyKey = buildStripeIdempotencyKey(
      "referral-extension",
      userId,
      operationKey,
    );
    await stripe.subscriptions.update(
      user.subscription_id,
      {
        trial_end: targetTimestamp,
        proration_behavior: "none",
      },
      { idempotencyKey },
    );

    let finished: boolean;
    try {
      finished = await finishReferralEntitlement({
        userId,
        operationKey,
        succeeded: true,
      });
    } catch {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }
    if (!finished) {
      return { ok: false, code: "PROVIDER_ERROR", retryable: true };
    }

    return { ok: true, code: "UPDATED" };
  } catch {
    if (entitlementClaimed) {
      try {
        await finishReferralEntitlement({
          userId,
          operationKey,
          succeeded: false,
        });
      } catch {
        // The persisted claim expires and is replayed with the same provider key.
      }
    }
    return { ok: false, code: "PROVIDER_ERROR", retryable: true };
  }
}

/**
 * Admin: Set any plan and any end date for a user (trial or paid period)
 * planPriceId: Stripe price ID for the plan (e.g. PRO, PREMIUM PRO)
 * endDate: JS Date object for the new end date (trial_end or billing_cycle_anchor)
 * isTrial: if true, set as trial_end, else as paid period
 */
export async function adminSetPlanAndEndDate({
  userId,
  planPriceId,
  endDate,
  isTrial,
  metadata = {},
}: {
  userId: string;
  planPriceId: string;
  endDate: Date;
  isTrial: boolean;
  metadata?: Record<string, string>;
}): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_id")
      .eq("id", userId)
      .single();
    if (userError || !user || !user.subscription_id) return false;
    // Update subscription to new plan
    await stripe.subscriptions.update(user.subscription_id, {
      items: [{ price: planPriceId }],
      ...(isTrial
        ? { trial_end: Math.floor(endDate.getTime() / 1000) }
        : {
            billing_cycle_anchor: Math.floor(endDate.getTime() / 1000) as any,
          }),
      proration_behavior: "none",
      metadata,
    });
    return true;
  } catch (error) {
    console.error("Error in adminSetPlanAndEndDate:", error);
    return false;
  }
}

export async function getTrialStatistics(): Promise<{
  totalTrials: number;
  activeTrials: number;
  expiringTrials: number;
  expiredTrials: number;
  trialTypes: Record<string, number>;
}> {
  const supabase = await createClient();
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const { data: users, error } = await supabase
    .from("users")
    .select("trial_end, subscription_status")
    .not("trial_end", "is", null);
  if (error || !users) {
    return {
      totalTrials: 0,
      activeTrials: 0,
      expiringTrials: 0,
      expiredTrials: 0,
      trialTypes: {},
    };
  }
  let activeTrials = 0;
  let expiringTrials = 0;
  let expiredTrials = 0;
  const trialTypes: Record<string, number> = {};
  users.forEach((user) => {
    if (user.trial_end) {
      const trialEndDate = new Date(user.trial_end);
      const isActive = trialEndDate > now;
      const isExpiringSoon =
        trialEndDate <= threeDaysFromNow && trialEndDate > now;
      if (isActive) {
        activeTrials++;
        if (isExpiringSoon) {
          expiringTrials++;
        }
      } else {
        expiredTrials++;
      }
      const status = user.subscription_status || "unknown";
      trialTypes[status] = (trialTypes[status] || 0) + 1;
    }
  });
  return {
    totalTrials: users.length,
    activeTrials,
    expiringTrials,
    expiredTrials,
    trialTypes,
  };
}

export async function sendTrialEndNotification(
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("email, first_name, trial_end")
      .eq("id", userId)
      .single();
    if (error || !user) {
      return false;
    }
    // You can implement a trial end notification email here
    // For now, we'll just log it
    console.log(`Trial ending notification sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error("Error sending trial end notification:", error);
    return false;
  }
}
