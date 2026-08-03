// app/api/plan/change/route.ts

import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const POST = withAuth(
  async (request, { supabase, user: callerData }) => {
    // Only admins can change another user's plan via POST
    if (callerData.role !== "admin") {
      return apiResponse.forbidden();
    }

    const body = await request.json();
    const { id, subscription_status, current_period_end } = body;

    if (!subscription_status) {
      return apiResponse.badRequest(
        "Missing subscription_status in request body.",
      );
    }

    // Fetch the user from your database to get their subscription ID
    const { data: user, error } = await supabase
      .from("users")
      .select("subscription_id, subscription_status")
      .eq("id", id)
      .single();

    if (error || !user) {
      return apiResponse.error(
        "User not found or missing subscription ID.",
        404,
      );
    }

    const subscriptionId = user.subscription_id;

    if (subscriptionId) {
      // Fetch the subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(subscriptionId);
      } else {
        console.log("Subscription is already canceled.");
      }
    }

    const { data, error: supabaseError } = await supabase
      .from("users")
      .update({
        subscription_status,
        current_period_end:
          subscription_status === "FREE" ? null : current_period_end,
        subscription_id: null,
      })
      .eq("id", id)
      .select("*");

    return apiResponse.success({
      message: `Plan changed to ${subscription_status}.`,
    });
  },
);

export const PUT = withAuth(async (request, { supabase, user }) => {
  // Only handle downgrade to FREE here. For upgrades, use checkout.
  const body = await request.json();
  const { subscription_status } = body;
  if (subscription_status !== "FREE") {
    return apiResponse.badRequest(
      "Upgrades/plan changes must use checkout. Only FREE downgrade is supported here.",
    );
  }

  if (user.subscription_status === "FREE") {
    return apiResponse.success({
      error: "Membership is already in FREE plan now.",
    });
  }
  // Update user to FREE in Supabase
  await supabase
    .from("users")
    .update({
      subscription_status: "FREE",
      subscription_id: null,
      plan_id: null,
      current_period_end: null,
    })
    .eq("id", user.id);

  const subscriptionId = user.subscription_id;
  if (subscriptionId) {
    // Cancel the current subscription in Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscriptionId);
    }
  }

  return apiResponse.success({ message: "Plan changed to FREE." });
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const subscriptionId = user.subscription_id;

  if (!subscriptionId) {
    return apiResponse.badRequest("No subscription found for this user.");
  }

  await supabase
    .from("users")
    .update({ subscription_status: "FREE", subscription_id: null })
    .eq("id", user.id);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.status !== "canceled") {
    const canceledSubscription =
      await stripe.subscriptions.cancel(subscriptionId);
  } else {
    console.log("Subscription is already canceled.");
  }

  return apiResponse.success({ message: `Plan changed to FREE.` });
});
