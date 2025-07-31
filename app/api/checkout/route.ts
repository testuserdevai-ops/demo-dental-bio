// app/api/checkout/route.ts

import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// async function createPrice() {
//   try {
//     const prices = await stripe.prices.create({
//       active: true,
//       product: "prod_QqVPOJBK8nRBXg",
//       unit_amount: 0,
//       currency: "gbp",
//       recurring: {
//         interval: "year",
//       },
//       billing_scheme: "per_unit",
//     });

//     console.log(prices);

//     return prices;
//   } catch (err: any) {
//     console.error("Failed to fetch prices:", err);
//     return null;
//   }
// }

export const POST = async (request: Request) => {
  const supabase = createClient();
  const userId = await getEffectiveUserId({ targetUserId: null, supabase });
  const { priceId, email } = await request.json();
  const APP_URL = process.env.APP_URL;

  // Fetch the user's trial end date from Supabase
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('trial_end, subscription_status, customer_id')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: { message: "User not found." } }, { status: 404 });
  }

  // Check if customer already exists for this email, if not create one
  let customerId = user.customer_id;
  if (!customerId) {
    const existingCustomers = await stripe.customers.list({ email: email, limit: 1 });
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      // Update user with existing customer ID
      await supabase
        .from('users')
        .update({ customer_id: customerId })
        .eq('id', userId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({ email: email });
      customerId = customer.id;
      // Update user with new customer ID
      await supabase
        .from('users')
        .update({ customer_id: customerId })
        .eq('id', userId);
    }
  }

  // Cancel all previous active subscriptions for this customer
  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
    for (const sub of subscriptions.data) {
      if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  }

  const trialEndDate = new Date(user.trial_end);
  const today = new Date();
  const twoDaysFromNow = new Date(today);
  twoDaysFromNow.setDate(today.getDate() + 2);

  // Check if the trial end date is within the next 2 days
  const isTrialEndingSoon = trialEndDate > today && trialEndDate <= twoDaysFromNow;

  // Determine subscription data based on trial end date
  let subscription_data = {};
  if (isTrialEndingSoon) {
    subscription_data = {
      trial_end: Math.floor(trialEndDate.getTime() / 1000),
    };
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
      subscription_data,
      metadata: {
        userId: userId,
      },
      success_url: `${APP_URL}/api/stripe/webhook/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/dashboard`,
      customer: customerId, // Use existing or new customer ID instead of customer_email
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Session creation failed:", err);
    return NextResponse.json(
      { error: { message: err.message } },
      { status: 500 }
    );
  }
};
