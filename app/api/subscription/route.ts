// app/api/plan/change/route.ts

import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import {
  beginSubscriptionCancellation,
  finishSubscriptionCancellation,
  getSubscriptionAuthorityForUser,
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

function isTerminalSubscription(subscription: Stripe.Subscription) {
  return (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  );
}

async function cancelSubscriptionWithReconciliation(
  userId: string,
  subscriptionId: string,
) {
  let subscription: Stripe.Subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (providerError) {
    throw providerError;
  }

  if (isTerminalSubscription(subscription)) {
    await finishSubscriptionCancellation(userId, subscriptionId, "confirmed");
    return;
  }

  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (cancelError) {
    try {
      const reconciled = await stripe.subscriptions.retrieve(subscriptionId);
      if (isTerminalSubscription(reconciled)) {
        await finishSubscriptionCancellation(
          userId,
          subscriptionId,
          "confirmed",
        );
      } else {
        await finishSubscriptionCancellation(userId, subscriptionId, "restore");
      }
    } catch {
      // Cancellation may have succeeded despite the error. Keep the safe FREE
      // authority state when Stripe cannot provide a definitive reconciliation.
    }
    throw cancelError;
  }

  await finishSubscriptionCancellation(userId, subscriptionId, "confirmed");
}

async function beginCancellation(
  userId: string,
  subscriptionStatus: "FREE" | "PRO" | "PREMIUM PRO",
  currentPeriodEnd: string | null,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const authority = await getSubscriptionAuthorityForUser(userId);
    const result = await beginSubscriptionCancellation({
      userId,
      expectedSubscriptionId: authority.subscription_id,
      expectedPendingSubscriptionId: authority.pending_subscription_id,
      subscriptionStatus,
      currentPeriodEnd,
    });
    if (result.result !== "conflict") return result;
  }
  throw new Error("Subscription authority changed during cancellation");
}

async function completeCancellationTransition(
  userId: string,
  subscriptionStatus: "FREE" | "PRO" | "PREMIUM PRO",
  currentPeriodEnd: string | null,
) {
  let changed = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const transition = await beginCancellation(
      userId,
      subscriptionStatus,
      currentPeriodEnd,
    );
    if (!transition.subscription_id) {
      return changed ? "changed" : transition.result;
    }

    await cancelSubscriptionWithReconciliation(
      userId,
      transition.subscription_id,
    );
    changed = true;
    if (transition.result !== "retry") return "changed";
  }
  throw new Error("Subscription cancellation changed repeatedly");
}

export const POST = withAuth(async (request, { user: callerData }) => {
  // Only admins can change another user's plan via POST
  if (callerData.role !== "admin") {
    return apiResponse.forbidden();
  }

  const parsed = adminSubscriptionTransitionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid plan change.");
  const { id, subscription_status, current_period_end } = parsed.data;

  await completeCancellationTransition(
    id,
    subscription_status,
    subscription_status === "FREE" ? null : current_period_end,
  );

  return apiResponse.success({
    message: `Plan changed to ${subscription_status}.`,
  });
});

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

  const result = await completeCancellationTransition(user.id, "FREE", null);
  if (result === "none") {
    return apiResponse.success({
      error: "Membership is already in FREE plan now.",
    });
  }
  return apiResponse.success({ message: "Plan changed to FREE." });
});

export const DELETE = withAuth(async (_request, { user }) => {
  const result = await completeCancellationTransition(user.id, "FREE", null);

  if (result === "none") {
    return apiResponse.badRequest("No subscription found for this user.");
  }

  return apiResponse.success({ message: `Plan changed to FREE.` });
});
