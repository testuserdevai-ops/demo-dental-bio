import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
type SubscriptionAuthorityUpdate = Pick<
  UserUpdate,
  | "subscription_id"
  | "pending_cancellation_subscription_id"
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
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, subscription_id, pending_cancellation_subscription_id, subscription_status",
    )
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`Authority read failed: ${error.message}`);
  return data;
}

export async function clearSubscriptionAuthorityForStripeCustomer(
  customerId: string,
  subscriptionId: string,
  clearPendingCancellation = false,
) {
  const update: SubscriptionAuthorityUpdate = {
    subscription_id: null,
    plan_id: null,
    subscription_status: "FREE",
    current_period_end: null,
    trial_end: null,
  };
  if (clearPendingCancellation) {
    update.pending_cancellation_subscription_id = null;
  }
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update(update)
      .eq("customer_id", customerId)
      .eq("subscription_id", subscriptionId)
      .select("id")
      .single(),
  );
}

export async function clearPendingCancellation(
  userId: string,
  subscriptionId: string,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ pending_cancellation_subscription_id: null })
      .eq("id", userId)
      .eq("pending_cancellation_subscription_id", subscriptionId)
      .select("id")
      .single(),
  );
}

export async function clearPendingCancellationForStripeCustomer(
  customerId: string,
  subscriptionId: string,
) {
  await requireOneAuthorityWrite(
    supabaseAdmin
      .from("users")
      .update({ pending_cancellation_subscription_id: null })
      .eq("customer_id", customerId)
      .eq("pending_cancellation_subscription_id", subscriptionId)
      .select("id")
      .single(),
  );
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
