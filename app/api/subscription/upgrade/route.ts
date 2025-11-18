import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { customerId, subscriptionId, newPriceId, paymentMethodId } = data;

    const newPm = await stripe.paymentMethods.retrieve(paymentMethodId);

    // List all attached card payment methods
    const existingPms = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    let duplicate = false;
    let existingPmId = null;

    console.log(newPm.card?.fingerprint);

    for (const pm of existingPms.data) {
      // Strictest check: same fingerprint (same card number + issuer rules)

      console.log("original_card: ", pm.card?.fingerprint)

      if (pm.card!.fingerprint === newPm.card!.fingerprint) {
        duplicate = true;
        existingPmId = pm.id;
        break;
      }

      // Optional looser check if you also want to block different exp/cvc on same number
      // if (pm.card.last4 === newPm.card.last4 && pm.card.exp_month === newPm.card.exp_month && pm.card.exp_year === newPm.card.exp_year) { ... }
    }

    if (duplicate) {
      // Reuse the existing one instead of attaching a new one
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: existingPmId! },
      });
    } else {
      // No duplicate → attach the new one
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

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
