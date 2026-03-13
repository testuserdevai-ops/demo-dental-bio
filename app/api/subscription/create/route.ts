import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const POST = withAuth(async (req, { supabase, user: userData }) => {
  const data = await req.json();
  const { customerId, priceId, paymentMethodId } = data;

  // Verify the customer belongs to the authenticated user
  if (userData.customer_id !== customerId) {
    return apiResponse.forbidden();
  }

  if (!customerId || !priceId) {
    return apiResponse.badRequest("Missing customerId or priceId.");
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
      return apiResponse.badRequest(`Payment method error: ${pmError.message}`);
    }
  }

  // --- 2. Ensure customer has at least one payment method ---
  const pmList = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  if (pmList.data.length === 0) {
    return apiResponse.badRequest("Customer has no payment method on file.");
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
    return apiResponse.success({
      status: "requires_action",
      clientSecret: intent.client_secret,
      subscriptionId: subscription.id,
    });
  }

  return apiResponse.success({
    status: "active_or_pending",
    subscriptionId: subscription.id,
  });
});
