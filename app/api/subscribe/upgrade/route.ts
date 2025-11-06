import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { subscriptionId, newPriceId } = data;

    const subscriptionItemId = (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id;

    console.log(subscriptionItemId, newPriceId)

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId, // existing subscription item ID
          price: newPriceId, // new plan price ID
        },
      ],
      proration_behavior: 'create_prorations', // default: create prorations
    });

    console.log(subscription)

    return NextResponse.json({
      Status: "Done"
    });
  } catch (err: any) {
    console.error("Error fetching proration:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
