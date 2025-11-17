import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { customerId, subscriptionId, newPriceId, paymentMethodId } = data;

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscriptionItemId = (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id;

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId, // existing subscription item ID
          price: newPriceId, // new plan price ID
        },
      ],
      proration_behavior: 'create_prorations', // default: create prorations
    });

    return NextResponse.json({
      Status: "Done"
    });
  } catch (err: any) {
    console.error("Error fetching proration:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
