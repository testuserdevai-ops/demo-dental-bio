import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const POST = withAuth(async (req, { supabase, user: userData }) => {
  const data = await req.json();
  const { subscriptionId } = data;

  // Verify the subscription belongs to the authenticated user
  if (userData.subscription_id !== subscriptionId) {
    return apiResponse.forbidden();
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const invoices = await stripe.invoices.list({
    subscription: subscriptionId,
    limit: 1,
  });
  const latestInvoice = invoices.data[0];

  const chargeId = latestInvoice.charge;

  if (chargeId) {
    const currentPeriodEnd = subscription.current_period_end;
    const now = Math.floor(Date.now() / 1000);
    const totalPeriod = currentPeriodEnd - subscription.current_period_start;
    const unusedPeriod = currentPeriodEnd - now;
    const refundAmount = Math.floor((unusedPeriod / totalPeriod) * latestInvoice.amount_paid);

    const refund = await stripe.refunds.create({
      charge: chargeId as string,
      amount: refundAmount,
    });
  }

  await stripe.subscriptions.cancel(subscriptionId);

  return apiResponse.success({ success: true });
});
