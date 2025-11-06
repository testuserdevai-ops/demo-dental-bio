import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { subscriptionId } = data;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 1,
    });
    const latestInvoice = invoices.data[0];

    const chargeId = latestInvoice.charge;

    if (!chargeId) {
      throw new Error('No charge found for latest invoice.');
    }

    const currentPeriodEnd = subscription.current_period_end;
    const now = Math.floor(Date.now() / 1000);
    const totalPeriod = currentPeriodEnd - subscription.current_period_start;
    const unusedPeriod = currentPeriodEnd - now;
    const refundAmount = Math.floor((unusedPeriod / totalPeriod) * latestInvoice.amount_paid);

    await stripe.subscriptions.cancel(subscriptionId);

    const refund = await stripe.refunds.create({
      charge: chargeId as string,
      amount: refundAmount, // in cents
    });

    return NextResponse.json({
      Status: "Done"
    });
  } catch (err: any) {
    console.error("Error fetching proration:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
