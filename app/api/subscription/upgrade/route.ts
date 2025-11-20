// app/api/subscription/upgrade/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const { customerId, subscriptionId, newPriceId, paymentMethodId } = await req.json();

    // 1. Validate required fields
    if (!customerId || !subscriptionId || !newPriceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Only work with paymentMethodId if it actually exists and is a string
    let finalPmIdToUse: string | undefined;

    if (paymentMethodId && typeof paymentMethodId === "string" && paymentMethodId.startsWith("pm_")) {
      // Safe: we have a real PM ID → fetch it once
      const newPm = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Check for duplicate card using fingerprint (exact same physical card)
      const existingPms = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      const duplicate = existingPms.data.some(
        (pm) => pm.card?.fingerprint === newPm.card?.fingerprint
      );

      if (duplicate) {
        // Reuse the existing attached PM that has the same fingerprint
        finalPmIdToUse = existingPms.data.find(
          (pm) => pm.card?.fingerprint === newPm.card?.fingerprint
        )!.id;
      } else {
        // Attach the new one
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        finalPmIdToUse = paymentMethodId;
      }
    } else {
      // No payment method sent → just keep whatever is already default (or none)
      console.log("No new payment method provided – keeping existing default");
    }

    // 3. Set the final default payment method (only if we have one)
    if (finalPmIdToUse) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: finalPmIdToUse },
      });
    }

    // 4. Upgrade the subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice", // or 'create_prorations' if you want preview
      trial_end: "now",
    });

    return NextResponse.json({ status: "success", subscription: updatedSubscription });
  } catch (err: any) {
    console.error("Subscription upgrade error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: err.statusCode || 500 }
    );
  }
}