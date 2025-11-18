import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const userId = await getEffectiveUserId({ supabase });
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription details
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_id, subscription_status, plan_id, current_period_end, trial_end, billing_cycle, customer_id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let subscriptionDetails = null;
    let planName = user.subscription_status || "FREE";
    let price = 0;
    let currency = "usd";
    let renewalDate = user.current_period_end ? new Date(user.current_period_end).toISOString() : null;

    // If user has a subscription, get details from Stripe
    if (user.subscription_id && user.customer_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id, {
          expand: ['items.data.price.product'],
        });

        const priceId = subscription.items.data[0]?.price.id;
        const priceData = subscription.items.data[0]?.price;
        
        if (priceId && PRICE_ID_TO_PLAN[priceId]) {
          planName = PRICE_ID_TO_PLAN[priceId].plan;
        }

        if (priceData) {
          price = priceData.unit_amount ? priceData.unit_amount / 100 : 0;
          currency = priceData.currency || "usd";
        }

        renewalDate = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          currentPeriodEnd: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        };
      } catch (err) {
        console.error("Error fetching subscription from Stripe:", err);
      }
    }

    return NextResponse.json({
      planName,
      price,
      currency,
      renewalDate,
      billingCycle: user.billing_cycle,
      subscriptionDetails,
      trialEnd: user.trial_end ? new Date(user.trial_end).toISOString() : null,
    });
  } catch (err: any) {
    console.error("Error fetching subscription details:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

