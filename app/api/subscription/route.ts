// app/api/plan/change/route.ts

import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import {
  clearPendingCancellation,
  updateSubscriptionAuthority,
} from "@/lib/dashboard/authority-write";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const subscriptionStatusSchema = z.enum(["FREE", "PRO", "PREMIUM PRO"]);
const adminSubscriptionTransitionSchema = z
  .object({
    id: z.uuid(),
    subscription_status: subscriptionStatusSchema,
    current_period_end: z.iso.datetime().nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.subscription_status === "FREE" && value.current_period_end) {
      context.addIssue({
        code: "custom",
        path: ["current_period_end"],
        message: "Free subscriptions cannot have a current period end",
      });
    }
    if (value.subscription_status !== "FREE" && !value.current_period_end) {
      context.addIssue({
        code: "custom",
        path: ["current_period_end"],
        message: "Paid subscriptions require a current period end",
      });
    }
  });
const ownerFreeTransitionSchema = z
  .object({ subscription_status: z.literal("FREE") })
  .strict();

function subscriptionAuthoritySnapshot(user: {
  subscription_id: string | null;
  pending_cancellation_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  trial_end: string | null;
  billing_cycle: "monthly" | "annually";
}) {
  return {
    subscription_id: user.subscription_id,
    pending_cancellation_subscription_id:
      user.pending_cancellation_subscription_id,
    subscription_status: subscriptionStatusSchema.parse(
      user.subscription_status,
    ),
    current_period_end: user.current_period_end,
    plan_id: user.plan_id,
    trial_end: user.trial_end,
    billing_cycle: user.billing_cycle,
  };
}

async function cancelSubscriptionWithReconciliation(
  userId: string,
  subscriptionId: string,
  restoreAuthority: (() => Promise<void>) | null,
) {
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (providerError) {
    throw providerError;
  }

  if (subscription.status === "canceled") {
    await clearPendingCancellation(userId, subscriptionId);
    return;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (cancelError) {
    try {
      const reconciled = await stripe.subscriptions.retrieve(subscriptionId);
      if (reconciled.status === "canceled") {
        await clearPendingCancellation(userId, subscriptionId);
      } else if (restoreAuthority) {
        await restoreAuthority();
      }
    } catch {
      // Cancellation may have succeeded despite the error. Keep the safe FREE
      // authority state when Stripe cannot provide a definitive reconciliation.
    }
    throw cancelError;
  }

  await clearPendingCancellation(userId, subscriptionId);
}

export const POST = withAuth(
  async (request, { supabase, user: callerData }) => {
    // Only admins can change another user's plan via POST
    if (callerData.role !== "admin") {
      return apiResponse.forbidden();
    }

    const parsed = adminSubscriptionTransitionSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) return apiResponse.badRequest("Invalid plan change.");
    const { id, subscription_status, current_period_end } = parsed.data;

    // Fetch the user from your database to get their subscription ID
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "subscription_id, pending_cancellation_subscription_id, subscription_status, current_period_end, plan_id, trial_end, billing_cycle",
      )
      .eq("id", id)
      .single();

    if (error || !user) {
      return apiResponse.error(
        "User not found or missing subscription ID.",
        404,
      );
    }

    const subscriptionId =
      user.pending_cancellation_subscription_id ?? user.subscription_id;
    const initiatedCancellation =
      user.pending_cancellation_subscription_id === null &&
      user.subscription_id !== null;
    const previousAuthority = subscriptionAuthoritySnapshot(user);

    await updateSubscriptionAuthority(id, {
      subscription_status,
      current_period_end:
        subscription_status === "FREE" ? null : current_period_end,
      subscription_id: null,
      pending_cancellation_subscription_id: subscriptionId,
    });

    if (subscriptionId) {
      await cancelSubscriptionWithReconciliation(
        id,
        subscriptionId,
        initiatedCancellation
          ? () =>
              updateSubscriptionAuthority(id, {
                ...previousAuthority,
                pending_cancellation_subscription_id: null,
              })
          : null,
      );
    }

    return apiResponse.success({
      message: `Plan changed to ${subscription_status}.`,
    });
  },
);

export const PUT = withAuth(async (request, { user }) => {
  // Only handle downgrade to FREE here. For upgrades, use checkout.
  const parsed = ownerFreeTransitionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiResponse.badRequest(
      "Upgrades/plan changes must use checkout. Only FREE downgrade is supported here.",
    );
  }

  if (
    user.subscription_status === "FREE" &&
    !user.pending_cancellation_subscription_id
  ) {
    return apiResponse.success({
      error: "Membership is already in FREE plan now.",
    });
  }
  const previousAuthority = subscriptionAuthoritySnapshot(user);
  const subscriptionId =
    user.pending_cancellation_subscription_id ?? user.subscription_id;
  const initiatedCancellation =
    user.pending_cancellation_subscription_id === null &&
    user.subscription_id !== null;
  // Update user to FREE in Supabase
  await updateSubscriptionAuthority(user.id, {
    subscription_status: "FREE",
    subscription_id: null,
    plan_id: null,
    current_period_end: null,
    pending_cancellation_subscription_id: subscriptionId,
  });

  if (subscriptionId) {
    await cancelSubscriptionWithReconciliation(
      user.id,
      subscriptionId,
      initiatedCancellation
        ? () =>
            updateSubscriptionAuthority(user.id, {
              ...previousAuthority,
              pending_cancellation_subscription_id: null,
            })
        : null,
    );
  }

  return apiResponse.success({ message: "Plan changed to FREE." });
});

export const DELETE = withAuth(async (_request, { user }) => {
  const subscriptionId =
    user.pending_cancellation_subscription_id ?? user.subscription_id;

  if (!subscriptionId) {
    return apiResponse.badRequest("No subscription found for this user.");
  }
  const previousAuthority = subscriptionAuthoritySnapshot(user);
  const initiatedCancellation =
    user.pending_cancellation_subscription_id === null &&
    user.subscription_id !== null;

  await updateSubscriptionAuthority(user.id, {
    subscription_status: "FREE",
    subscription_id: null,
    plan_id: null,
    current_period_end: null,
    pending_cancellation_subscription_id: subscriptionId,
  });

  await cancelSubscriptionWithReconciliation(
    user.id,
    subscriptionId,
    initiatedCancellation
      ? () =>
          updateSubscriptionAuthority(user.id, {
            ...previousAuthority,
            pending_cancellation_subscription_id: null,
          })
      : null,
  );

  return apiResponse.success({ message: `Plan changed to FREE.` });
});
