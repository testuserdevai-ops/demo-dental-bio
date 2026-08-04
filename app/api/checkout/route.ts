// app/api/checkout/route.ts

import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { setStripeCustomerId } from "@/lib/dashboard/authority-write";
import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const configuredPaidPriceIds = new Set(
  Object.entries(PRICE_ID_TO_PLAN)
    .filter(
      ([priceId, value]) =>
        Boolean(priceId) &&
        priceId !== "undefined" &&
        (value.plan === "PRO" || value.plan === "PREMIUM PRO"),
    )
    .map(([priceId]) => priceId),
);
const checkoutSchema = z
  .object({ priceId: z.string().min(1) })
  .strict()
  .refine((value) => configuredPaidPriceIds.has(value.priceId), {
    message: "Price is not a configured paid plan",
    path: ["priceId"],
  });

export const POST = async (request: Request) => {
  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: "Invalid checkout request." } },
      { status: 400 },
    );
  }
  const { priceId } = parsed.data;
  const supabase = await createClient();
  const userId = await getEffectiveUserId({ targetUserId: null, supabase });

  // Get domain-specific configuration
  const { getDomainConfig } = await import("@/utils/domainConfig");
  const domainConfig = getDomainConfig(request.headers);
  const baseUrl = domainConfig.baseUrl;

  // Fetch the user's trial end date from Supabase
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("email, trial_end, subscription_status, customer_id")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { error: { message: "User not found." } },
      { status: 404 },
    );
  }

  // customer_id is an immutable owner/customer link. Never use caller input or
  // mutable Stripe email to discover another customer's identity.
  let customerId = user.customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    try {
      await setStripeCustomerId(userId, customerId);
    } catch (databaseError) {
      await stripe.customers.del(customerId).catch(() => undefined);
      throw databaseError;
    }
  }

  // Determine subscription data based on trial end date
  let subscription_data: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {
      metadata: { userId },
    };
  if (user.trial_end) {
    const trialEndDate = new Date(user.trial_end);
    const today = new Date();
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    // Check if the trial end date is within the next 2 days
    const isTrialEndingSoon =
      trialEndDate > today && trialEndDate <= twoDaysFromNow;

    if (isTrialEndingSoon) {
      subscription_data = {
        metadata: { userId },
        trial_end: Math.floor(trialEndDate.getTime() / 1000),
      };
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_collection: "always",
      subscription_data,
      metadata: {
        userId: userId,
      },
      success_url: `${baseUrl}/upgrade-success`,
      cancel_url: `${baseUrl}/dashboard`,
      customer: customerId,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Session creation failed:", err);
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 500 },
    );
  }
};
