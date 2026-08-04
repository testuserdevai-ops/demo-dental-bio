// app/api/webhooks/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { sendTrialEndNotificationMail } from "@/utils/mails/sendTemplateEmails";
import { PRICE_ID_TO_PLAN } from "@/utils/global_constants";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";
import {
  clearPendingCancellationForStripeCustomer,
  clearSubscriptionAuthorityForStripeCustomer,
  getSubscriptionAuthorityForStripeCustomer,
  processStripeCustomerDeletion,
  updateSubscriptionAuthorityForStripeCustomer,
} from "@/lib/dashboard/authority-write";

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
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const subscriptionId = subscription.id;
  const current = await getSubscriptionAuthorityForStripeCustomer(customerId);
  if (!current) {
    console.log(
      `Stripe subscription ${subscriptionId} belongs to an already-unlinked customer.`,
    );
    return;
  }
  if (
    current.pending_cancellation_subscription_id === subscriptionId &&
    current.subscription_id !== subscriptionId
  ) {
    await clearPendingCancellationForStripeCustomer(customerId, subscriptionId);
    return;
  }
  if (
    current.subscription_id === null &&
    current.subscription_status === "FREE"
  ) {
    console.log(`Stripe subscription ${subscriptionId} was already cleared.`);
    return;
  }
  if (current.subscription_id === null) {
    throw new Error("Stripe subscription authority is inconsistent");
  }
  if (current.subscription_id !== subscriptionId) {
    console.log(
      `Ignoring stale Stripe subscription deletion ${subscriptionId}.`,
    );
    return;
  }
  try {
    await clearSubscriptionAuthorityForStripeCustomer(
      customerId,
      subscriptionId,
      current.pending_cancellation_subscription_id === subscriptionId,
    );
  } catch (writeError) {
    const latest = await getSubscriptionAuthorityForStripeCustomer(customerId);
    if (
      latest?.pending_cancellation_subscription_id === subscriptionId &&
      latest.subscription_id !== subscriptionId
    ) {
      await clearPendingCancellationForStripeCustomer(
        customerId,
        subscriptionId,
      );
      return;
    }
    if (
      latest &&
      ((latest.subscription_id === null &&
        latest.subscription_status === "FREE" &&
        latest.pending_cancellation_subscription_id !== subscriptionId) ||
        (latest.subscription_id !== null &&
          latest.subscription_id !== subscriptionId &&
          latest.pending_cancellation_subscription_id !== subscriptionId))
    ) {
      return;
    }
    throw writeError;
  }
  console.log(`Stripe customer ${customerId} set to FREE after cancellation.`);
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
      await stripe.paymentMethods.detach(pm.id);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (subscription.status === "incomplete_expired") {
    await handleSubscriptionDeleted(subscription);
    return;
  }

  const eventCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const current =
    await getSubscriptionAuthorityForStripeCustomer(eventCustomerId);
  if (!current) {
    throw new Error("Stripe customer is not linked to a user");
  }
  if (
    current.pending_cancellation_subscription_id === subscription.id &&
    current.subscription_id !== subscription.id
  ) {
    console.log(
      `Ignoring Stripe update for pending cancellation ${subscription.id}.`,
    );
    return;
  }

  const candidate = await stripe.subscriptions.retrieve(subscription.id);
  const customerId =
    typeof candidate.customer === "string"
      ? candidate.customer
      : candidate.customer.id;
  if (customerId !== eventCustomerId) {
    throw new Error("Stripe subscription customer changed unexpectedly");
  }
  if (current.subscription_id && current.subscription_id !== candidate.id) {
    const authoritativeCurrent = await stripe.subscriptions.retrieve(
      current.subscription_id,
    );
    if (candidate.created <= authoritativeCurrent.created) {
      console.log(`Ignoring older Stripe subscription update ${candidate.id}.`);
      return;
    }
  }

  const subscriptionId = candidate.id;
  const planId = candidate.items.data[0]?.price.id ?? null;

  // Get product name for subscription_status
  const subscriptionStatus = getSubscriptionStatus(planId)?.plan;
  if (!isSubscriptionStatus(subscriptionStatus)) {
    throw new Error("Stripe price does not map to a controlled plan");
  }

  const currentPeriodEnd = candidate.current_period_end
    ? new Date(candidate.current_period_end * 1000)
    : null;
  const trialEnd = candidate.trial_end
    ? new Date(candidate.trial_end * 1000)
    : null;

  let billingCycle: "monthly" | "annually" | null = null;

  const price = candidate.items.data[0]?.price;
  if (price) {
    if (price.recurring?.interval === "month") {
      billingCycle = "monthly";
    } else if (price.recurring?.interval === "year") {
      billingCycle = "annually";
    }
  }

  await updateSubscriptionAuthorityForStripeCustomer(customerId, {
    subscription_id: subscriptionId,
    plan_id: planId,
    subscription_status: subscriptionStatus,
    current_period_end: currentPeriodEnd?.toISOString() ?? null,
    trial_end: trialEnd?.toISOString() ?? null,
    billing_cycle: billingCycle ?? undefined,
  });

  if (candidate.latest_invoice !== null) {
    const latestInvoiceId =
      typeof candidate.latest_invoice === "string"
        ? candidate.latest_invoice
        : candidate.latest_invoice?.id;
    if (!latestInvoiceId) {
      throw new Error("Stripe subscription has no immutable invoice ID");
    }
    const invoice = await stripe.invoices.retrieve(latestInvoiceId);
    if (invoice.collection_method === "send_invoice") {
      await stripe.invoices.sendInvoice(
        latestInvoiceId,
        {},
        { idempotencyKey: `dentalbio:invoice-send:${latestInvoiceId}` },
      );
    }
  }

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
        if (sub.id === current.pending_cancellation_subscription_id) {
          await clearPendingCancellationForStripeCustomer(customerId, sub.id);
        }
      }
    }

    await deduplicatePaymentMethods(customerId);
  }

  console.log(
    `Stripe customer ${customerId} subscription updated successfully.`,
  );
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

  await processStripeCustomerDeletion(customerId);

  console.log(`Cleaned up data for Stripe customer ${customerId}`);
}

// Helper function to determine subscription status
function getSubscriptionStatus(priceId: string) {
  return PRICE_ID_TO_PLAN[priceId];
}

function isSubscriptionStatus(
  value: unknown,
): value is "FREE" | "PRO" | "PREMIUM PRO" {
  return value === "FREE" || value === "PRO" || value === "PREMIUM PRO";
}
