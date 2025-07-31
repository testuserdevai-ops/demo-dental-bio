import { sendUpgradePlanMail } from "@/utils/mails/sendUpgradePlanMail";
import { sendDowngradePlanMail } from "@/utils/mails/sendDowngradePlanMail";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Helper function to get plan priority for comparison
function getPlanPriority(plan: string): number {
  switch (plan) {
    case 'FREE':
      return 0;
    case 'PRO':
      return 1;
    case 'PREMIUM PRO':
      return 2;
    default:
      return 0;
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.redirect("/error?message=Invalid session");
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    const product = await getProductInfo(subscription.items.data[0].plan.product as string);

    // Determine subscription status
    let subscriptionStatus = '';
    switch (product?.name) {
      case 'PRO':
        subscriptionStatus = "PRO";
        break;
      case 'PREMIUM PRO':
        subscriptionStatus = "PREMIUM PRO";
        break;
      default:
        subscriptionStatus = 'FREE';
    }

    // Get the user's current subscription status before updating
    const { data: currentUser } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', session.metadata?.userId)
      .single();

    const previousPlan = currentUser?.subscription_status || 'FREE';
    const newPlan = subscriptionStatus;

    // Determine if it's an upgrade or downgrade
    const previousPriority = getPlanPriority(previousPlan);
    const newPriority = getPlanPriority(newPlan);
    const isUpgrade = newPriority > previousPriority;
    const isDowngrade = newPriority < previousPriority;

    const { data, error } = await supabase
      .from('users')
      .update({
        customer_id: session.customer as string,
        subscription_id: session.subscription as string,
        plan_id: subscription.items.data[0].plan.id,
        subscription_status: subscriptionStatus,
        current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
      })
      .eq('id', session.metadata?.userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating subscription status:', error);
      return NextResponse.redirect(`${process.env.APP_URL}/error`);
    }

    // Send appropriate email based on plan change
    if (isUpgrade) {
      await sendUpgradePlanMail(data.email, data.rfirst_name, data.subscription_status);
    } else if (isDowngrade) {
      await sendDowngradePlanMail(data.email, data.rfirst_name, data.subscription_status);
    }
    // If same plan priority, no email is sent (could be a renewal or plan switch within same tier)

    // Redirect to success page
    return NextResponse.redirect(`${process.env.APP_URL}/upgrade-success`);

  } catch (error) {
    console.error('Error processing success webhook:', error);
    return NextResponse.redirect(`${process.env.APP_URL}/error`);
  }
}

async function getProductInfo(productId: string) {
  try {
    const product = await stripe.products.retrieve(productId);
    return product;
  } catch (error) {
    console.error('Error retrieving product:', error);
  }
}
