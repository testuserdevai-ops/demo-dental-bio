// app/api/webhooks/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { sendTrialEndNotificationMail } from "@/utils/mails/sendTemplateEmails";
import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    // Read the raw body from the request
    const rawBody = await request.text();

    // Verify the event by constructing it with the raw body and signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  let subscription;

  // Handle the event
  try {
    switch (event.type) {
      case "customer.subscription.updated":
        subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      case "customer.subscription.deleted":
        subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      case "customer.subscription.trial_will_end":
        subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      case "customer.deleted":
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerDeleted(customer);
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }
  } catch (err: any) {
    console.error("Error handling event:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Initialize Supabase client
  const supabase = await createClient();

  // Extract relevant fields
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  // Retrieve the customer to get their email
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error("Customer email not found.");
    return;
  }

  // Get user's previous subscription status for comparison
  const { data: currentUser } = await supabase
    .from("users")
    .select("subscription_status, first_name, subscription_id")
    .eq("email", customerEmail)
    .single();

  if (subscriptionId === currentUser?.subscription_id) {
    // If subscription is canceled, set user to FREE and clear subscription_id/plan_id
    const { error } = await supabase
      .from("users")
      .update({
        subscription_id: null,
        plan_id: null,
        subscription_status: "FREE",
        current_period_end: null,
        trial_end: null,
      })
      .eq("email", customerEmail);
    if (error) {
      console.error("Supabase update error:", error.message);
    } else {
      console.log(`User ${customerEmail} set to FREE after cancellation.`);

      // Send downgrade email if they were previously on a paid plan
    }
    return;
  }
}

async function deduplicatePaymentMethods(customerId: string) {
  const list = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  const seen = new Map<string, string>(); // fingerprint → best pm id to keep

  for (const pm of list.data) {
    const fp = pm.card?.fingerprint;
    if (!fp) continue;

    if (!seen.has(fp)) {
      seen.set(fp, pm.id); // first one wins (usually the oldest or the one just used)
    } else {
      // Duplicate found → detach the extra one
      console.log(`Detaching duplicate card: ${pm.id} (fingerprint ${fp})`);
      try {
        await stripe.paymentMethods.detach(pm.id);
      } catch (e) {
        console.warn("Failed to detach PM", pm.id, e);
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (subscription.status === "incomplete_expired") {
    handleSubscriptionDeleted(subscription);
    return;
  }

  // Initialize Supabase client
  const supabase = await createClient();

  // Extract relevant fields
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const planId = subscription.items.data[0]?.price.id ?? null;

  const latestInvoiceId = subscription.latest_invoice as string;

  const invoice = await stripe.invoices.retrieve(latestInvoiceId);

  console.log(invoice.collection_method);

  if (invoice.collection_method === "send_invoice")
    await stripe.invoices.sendInvoice(latestInvoiceId);

  // Get product name for subscription_status
  let { plan: subscriptionStatus } = getSubscriptionStatus(planId);

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  let billingCycle: "monthly" | "annually" | null = null;

  const price = subscription.items.data[0]?.price;
  if (price) {
    if (price.recurring?.interval === "month") {
      billingCycle = "monthly";
    } else if (price.recurring?.interval === "year") {
      billingCycle = "annually";
    }
  }

  // Retrieve the customer to get their email
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error("Customer email not found.");
    return;
  }

  // Update the user in Supabase
  const { error } = await supabase
    .from("users")
    .update({
      subscription_id: subscriptionId,
      plan_id: planId,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
      billing_cycle: billingCycle,
    })
    .eq("email", customerEmail);

  // Cancel all previous active subscriptions for this customer
  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
    });

    for (const sub of subscriptions.data) {
      if (
        sub.id !== subscriptionId &&
        sub.status !== "canceled" &&
        sub.status !== "incomplete_expired"
      ) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    deduplicatePaymentMethods(customerId);
  }

  if (error) {
    console.error("Supabase update error:", error.message);
  } else {
    console.log(`User ${customerEmail} subscription updated successfully.`);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // This event is triggered 3 days before the trial ends
  const customerId = subscription.customer as string;

  // Retrieve the customer to get their email
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error("Customer email not found for trial end notification.");
    return;
  }

  console.log(`Trial ending soon for user: ${customerEmail}`);

  // Send trial end notification email
  try {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from("users")
      .select("first_name, trial_end")
      .eq("email", customerEmail)
      .single();

    if (user) {
      const firstName = user.first_name || "User";
      const trialEndDate = user.trial_end ? new Date(user.trial_end) : null;
      const now = new Date();
      const headersList = await headers();
      const domainConfig = getDomainConfig(headersList);
      const daysRemaining = trialEndDate
        ? Math.ceil(
            (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 3;

      await sendTrialEndNotificationMail(
        customerEmail,
        firstName,
        daysRemaining,
        domainConfig,
      );
      console.log(`Trial end notification sent to: ${customerEmail}`);
    }
  } catch (error) {
    console.error("Error sending trial end notification:", error);
  }
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  const customerId = customer.id;

  const supabase = await createClient();

  // Remove subscriptions linked to this customer
  const { error: userError } = await supabase
    .from("users")
    .update({
      subscription_id: null,
      plan_id: null,
      subscription_status: "FREE",
      current_period_end: null,
      trial_end: null,
      customer_id: null,
    })
    .eq("customer_id", customerId);

  if (userError) {
    console.error("Failed to mark user as deleted:", userError);
  }

  console.log(`Cleaned up data for Stripe customer ${customerId}`);
}

// Helper function to determine subscription status
function getSubscriptionStatus(priceId: string) {
  return PRICE_ID_TO_PLAN[priceId];
}
