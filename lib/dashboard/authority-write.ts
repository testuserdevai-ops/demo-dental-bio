import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { z } from "zod";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type SubscriptionAuthorityUpdate = Pick<
  UserUpdate,
  | "subscription_id"
  | "plan_id"
  | "subscription_status"
  | "current_period_end"
  | "trial_end"
  | "billing_cycle"
> & {
  subscription_status?: "FREE" | "PRO" | "PREMIUM PRO";
};

type VeriffSession = {
  sessionId: string;
  sessionUrl: string;
  createdAt: string;
};

const subscriptionStatusSchema = z.enum(["FREE", "PRO", "PREMIUM PRO"]);
const subscriptionAuthoritySchema = z
  .object({
    user_id: z.string().uuid(),
    subscription_id: z.string().nullable(),
    pending_subscription_id: z.string().nullable(),
    subscription_status: subscriptionStatusSchema.nullable(),
    current_period_end: z.string().nullable(),
    plan_id: z.string().nullable(),
    trial_end: z.string().nullable(),
    billing_cycle: z.enum(["monthly", "annually"]).nullable(),
  })
  .strict();
const cancellationBeginSchema = z
  .object({
    result: z.enum(["begun", "retry", "none", "conflict"]),
    subscription_id: z.string().nullable(),
  })
  .strict();

async function requireRpc<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) throw new Error(`Authority write failed: ${error.message}`);
  return data;
}

async function requireOneAuthorityWrite<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) throw new Error(`Authority write failed: ${error.message}`);
  if (!data) throw new Error("Authority write failed: user was not found");
  return data;
}

export async function saveVeriffSession(
  userId: string,
  session: VeriffSession,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({
        session_id: session.sessionId,
        veriff_session_url: session.sessionUrl,
        session_created_at: session.createdAt,
      })
      .eq("id", userId)
      .select("id")
      .single(),
  );
}

export async function setUserVerification(userId: string, isVerified: boolean) {
  return requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ isVerified })
      .eq("id", userId)
      .select("id, isVerified")
      .single(),
  );
}

export async function setUserVerificationForVeriffSession(sessionId: string) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ isVerified: true })
      .eq("session_id", sessionId)
      .select("id")
      .single(),
  );
}

export async function setUserVerificationForOwnedVeriffSession(
  userId: string,
  sessionId: string,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ isVerified: true })
      .eq("id", userId)
      .eq("session_id", sessionId)
      .select("id")
      .single(),
  );
}

export async function setStripeCustomerId(userId: string, customerId: string) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ customer_id: customerId })
      .eq("id", userId)
      .is("customer_id", null)
      .select("id")
      .single(),
  );
}

export async function setCustomDomainAuthority(
  userId: string,
  domain: string | null,
  domainVerified: boolean,
  verificationCode?: string | null,
) {
  const update: Pick<
    UserUpdate,
    "domain" | "domain_verified" | "domain_verification_code"
  > = { domain, domain_verified: domainVerified };
  if (verificationCode !== undefined) {
    update.domain_verification_code = verificationCode;
  }
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update(update)
      .eq("id", userId)
      .select("id")
      .single(),
  );
}

export async function setCustomDomainVerification(
  userId: string,
  domainVerified: boolean,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ domain_verified: domainVerified })
      .eq("id", userId)
      .select("id")
      .single(),
  );
}

export async function updateSubscriptionAuthority(
  userId: string,
  update: SubscriptionAuthorityUpdate,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update(update)
      .eq("id", userId)
      .select("id")
      .single(),
  );
}

export async function updateSubscriptionAuthorityForStripeCustomer(
  customerId: string,
  update: SubscriptionAuthorityUpdate,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update(update)
      .eq("customer_id", customerId)
      .select("id")
      .single(),
  );
}

export async function getSubscriptionAuthorityForStripeCustomer(
  customerId: string,
) {
  const { data, error } = await supabaseAdmin.rpc(
    "get_subscription_authority_for_stripe_customer",
    { p_customer_id: customerId },
  );
  if (error) throw new Error(`Authority read failed: ${error.message}`);
  if (data === null) return null;
  return subscriptionAuthoritySchema.parse(data);
}

export async function getSubscriptionAuthorityForUser(userId: string) {
  const data = await requireRpc(
    supabaseAdmin.rpc("get_subscription_authority_for_user", {
      p_user_id: userId,
    }),
  );
  return subscriptionAuthoritySchema.parse(data);
}

export async function beginSubscriptionCancellation(input: {
  userId: string;
  expectedSubscriptionId: string | null;
  expectedPendingSubscriptionId: string | null;
  subscriptionStatus: "FREE" | "PRO" | "PREMIUM PRO";
  currentPeriodEnd: string | null;
}) {
  const data = await requireRpc(
    supabaseAdmin.rpc("begin_subscription_cancellation", {
      p_input: {
        user_id: input.userId,
        expected_subscription_id: input.expectedSubscriptionId,
        expected_pending_subscription_id: input.expectedPendingSubscriptionId,
        subscription_status: input.subscriptionStatus,
        current_period_end: input.currentPeriodEnd,
      },
    }),
  );
  return cancellationBeginSchema.parse(data);
}

export async function finishSubscriptionCancellation(
  userId: string,
  subscriptionId: string,
  outcome: "confirmed" | "restore",
) {
  const data = await requireRpc(
    supabaseAdmin.rpc("finish_subscription_cancellation", {
      p_user_id: userId,
      p_subscription_id: subscriptionId,
      p_outcome: outcome,
    }),
  );
  return z.enum(["cleared", "restored", "noop"]).parse(data);
}

export async function applySubscriptionUpdateCas(input: {
  customerId: string;
  expectedSubscriptionId: string | null;
  expectedPendingSubscriptionId: string | null;
  subscriptionId: string;
  planId: string | null;
  subscriptionStatus: "FREE" | "PRO" | "PREMIUM PRO";
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  billingCycle: "monthly" | "annually" | null;
}) {
  const data = await requireRpc(
    supabaseAdmin.rpc("apply_stripe_subscription_update", {
      p_input: {
        customer_id: input.customerId,
        expected_subscription_id: input.expectedSubscriptionId,
        expected_pending_subscription_id: input.expectedPendingSubscriptionId,
        subscription_id: input.subscriptionId,
        plan_id: input.planId,
        subscription_status: input.subscriptionStatus,
        current_period_end: input.currentPeriodEnd,
        trial_end: input.trialEnd,
        billing_cycle: input.billingCycle,
      },
    }),
  );
  return z.enum(["applied", "conflict", "pending_cancellation"]).parse(data);
}

export async function processStripeSubscriptionDeletion(
  customerId: string,
  subscriptionId: string,
) {
  const data = await requireRpc(
    supabaseAdmin.rpc("process_stripe_subscription_deletion", {
      p_customer_id: customerId,
      p_subscription_id: subscriptionId,
    }),
  );
  return z
    .enum([
      "current_cleared",
      "pending_cleared",
      "already_cleared",
      "stale",
      "customer_deleted",
    ])
    .parse(data);
}

export async function processStripeCustomerDeletion(customerId: string) {
  const { data, error } = await supabaseAdmin.rpc(
    "process_stripe_customer_deletion",
    { p_customer_id: customerId },
  );
  if (error) throw new Error(`Authority write failed: ${error.message}`);
  if (data !== "processed" && data !== "already_processed") {
    throw new Error("Authority write failed: invalid customer deletion result");
  }
  return data;
}
