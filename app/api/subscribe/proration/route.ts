import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { customerId, subscriptionId, newPriceId } = data;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    console.log(subscriptionItemId, newPriceId)

    const upcoming = await stripe.invoices.createPreview({
      customer: customerId,
      subscription: subscriptionId,
      subscription_details: {
        proration_behavior: 'create_prorations',
        items: [
          { id: subscriptionItemId, price: newPriceId },
        ],
      },
    });

    console.log(upcoming)

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
