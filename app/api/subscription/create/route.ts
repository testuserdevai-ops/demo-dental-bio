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
    const { customerId, priceId, paymentMethodId } = data;

    // Verify the customer belongs to the authenticated user
    if (userData.customer_id !== customerId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!customerId || !priceId) {
      return NextResponse.json(
        { error: "Missing customerId or priceId." },
        { status: 400 }
      );
    }

    // --- 1. Attach payment method if provided ---
    if (paymentMethodId) {
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });

        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      } catch (pmError: any) {
        return NextResponse.json(
          { error: `Payment method error: ${pmError.message}` },
          { status: 400 }
        );
      }
    }

    // --- 2. Ensure customer has at least one payment method ---
    const pmList = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    if (pmList.data.length === 0) {
      return NextResponse.json(
        { error: "Customer has no payment method on file." },
        { status: 400 }
      );
    }

    const defaultPaymentMethod =
      paymentMethodId || pmList.data[0].id;

    // --- 3. Create subscription ---
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: defaultPaymentMethod,
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const intent = invoice.payment_intent as Stripe.PaymentIntent;

    // --- 4. Handle cases where authentication is required (SCA) ---
    if (intent && intent.status === "requires_action") {
      return NextResponse.json({
        status: "requires_action",
        clientSecret: intent.client_secret,
        subscriptionId: subscription.id,
      });
    }

    return NextResponse.json({
      status: "active_or_pending",
      subscriptionId: subscription.id,
    });
  } catch (err: any) {
    console.error("Create subscription error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
