import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/userInfo";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const userData = await getUserInfo({ supabase });
    if (!userData) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await req.json();
    const { customerId, subscriptionId, newPriceId } = data;

    // Verify ownership
    if (userData.customer_id !== customerId || userData.subscription_id !== subscriptionId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;
    const priceId = subscription.items.data[0].price.id;

    if ((PRICE_ID_TO_PLAN[priceId].plan === 'PRO' && PRICE_ID_TO_PLAN[newPriceId].plan === 'PREMIUM PRO' && subscription.status === 'trialing') || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
      const price = await stripe.prices.retrieve(newPriceId);
      const amount = (price.unit_amount ?? 0) / 100;

      return NextResponse.json({
        amountDue: amount
      });
    }

    const upcoming = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscriptionId,
      subscription_details: {
        proration_behavior: 'always_invoice',
        trial_end: 'now',
        items: [
          { id: subscriptionItemId, price: newPriceId },
        ],
      },
    });

    const amountDue = (upcoming.amount_due ?? 0) / 100;
    const interval = upcoming.lines.data[0]?.plan?.interval ?? "month";
    const newPlanAmount = (upcoming.lines.data[0]?.plan?.amount ?? 0) / 100;

    return NextResponse.json({
      amountDue,
      newPlanAmount,
      interval,
    });
  } catch (err: any) {
    console.error("Error fetching proration:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
