// app/api/webhooks/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { sendUpgradePlanMail } from "@/utils/mails/sendUpgradePlanMail";
import { sendDowngradePlanMail } from "@/utils/mails/sendDowngradePlanMail";
import { sendTrialEndNotificationMail } from "@/utils/mails/sendTrialEndNotificationMail";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Read the raw body from the request
    const rawBody = await request.text();

    // Verify the event by constructing it with the raw body and signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      case 'customer.subscription.trial_will_end':
        const trialEndingSubscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(trialEndingSubscription);
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }
  } catch (err: any) {
    console.error('Error handling event:', err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Initialize Supabase client
  const supabase = createClient();

  // Extract necessary data
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string; // Get the Stripe customer ID

  // Get customer email from Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error('Customer email not found.');
    return;
  }

  // Cancel all previous active subscriptions for this customer
  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all' });
    for (const sub of subscriptions.data) {
      if (sub.id !== subscriptionId && sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  }

  // Retrieve the subscription to get more details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Extract relevant fields
  const planId = subscription.items.data[0]?.price.id ?? null;
  const status = subscription.status;
  
  // Get product name for subscription_status
  let subscriptionStatus = getSubscriptionStatus(subscription);
  
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  // Get user's previous subscription status for comparison
  const { data: currentUser } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('email', customerEmail)
    .single();

  const previousStatus = currentUser?.subscription_status || 'FREE';

  // Update the user in Supabase
  const { error } = await supabase
    .from('users')
    .update({
      customer_id: customerId,
      subscription_id: subscriptionId,
      plan_id: planId,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
    })
    .eq('email', customerEmail);

  if (error) {
    console.error('Supabase update error:', error.message);
  } else {
    console.log(`User ${customerEmail} subscription updated successfully.`);
    
    // Send appropriate email based on plan change
    if (subscriptionStatus !== previousStatus) {
      await sendPlanChangeEmail(customerEmail, previousStatus, subscriptionStatus);
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Initialize Supabase client
  const supabase = createClient();

  // Extract relevant fields
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const planId = subscription.items.data[0]?.price.id ?? null;
  const status = subscription.status;
  
  // Get product name for subscription_status
  let subscriptionStatus = getSubscriptionStatus(subscription);

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  // Retrieve the customer to get their email
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error('Customer email not found.');
    return;
  }

  // Get user's previous subscription status for comparison
  const { data: currentUser } = await supabase
    .from('users')
    .select('subscription_status, rfirst_name')
    .eq('email', customerEmail)
    .single();

  const previousStatus = currentUser?.subscription_status || 'FREE';

  if (status === 'canceled' || status === 'incomplete_expired') {
    // If subscription is canceled, set user to FREE and clear subscription_id/plan_id
    const { error } = await supabase
      .from('users')
      .update({
        subscription_id: null,
        plan_id: null,
        subscription_status: 'FREE',
        current_period_end: null,
        trial_end: null,
      })
      .eq('email', customerEmail);
    if (error) {
      console.error('Supabase update error:', error.message);
    } else {
      console.log(`User ${customerEmail} set to FREE after cancellation.`);
      
      // Send downgrade email if they were previously on a paid plan
      if (previousStatus !== 'FREE') {
        await sendDowngradePlanMail(customerEmail, currentUser?.rfirst_name || 'User', 'FREE');
      }
    }
    return;
  }

  // Update the user in Supabase
  const { error } = await supabase
    .from('users')
    .update({
      subscription_id: subscriptionId,
      plan_id: planId,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      trial_end: trialEnd,
    })
    .eq('email', customerEmail);

  if (error) {
    console.error('Supabase update error:', error.message);
  } else {
    console.log(`User ${customerEmail} subscription updated successfully.`);
    
    // Send appropriate email based on plan change
    if (subscriptionStatus !== previousStatus) {
      await sendPlanChangeEmail(customerEmail, previousStatus, subscriptionStatus);
    }
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // This event is triggered 3 days before the trial ends
  const customerId = subscription.customer as string;
  
  // Retrieve the customer to get their email
  const customer = await stripe.customers.retrieve(customerId);
  const customerEmail = (customer as Stripe.Customer).email;

  if (!customerEmail) {
    console.error('Customer email not found for trial end notification.');
    return;
  }

  console.log(`Trial ending soon for user: ${customerEmail}`);
  
  // Send trial end notification email
  try {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('rfirst_name, trial_end')
      .eq('email', customerEmail)
      .single();

    if (user) {
      const firstName = user.rfirst_name || 'User';
      const trialEndDate = user.trial_end ? new Date(user.trial_end) : null;
      const now = new Date();
      const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 3;
      
      await sendTrialEndNotificationMail(customerEmail, firstName, daysRemaining);
      console.log(`Trial end notification sent to: ${customerEmail}`);
    }
  } catch (error) {
    console.error('Error sending trial end notification:', error);
  }
}

// Helper function to determine subscription status
function getSubscriptionStatus(subscription: Stripe.Subscription): string {
  const status = subscription.status;
  
  if (status === 'trialing') {
    return 'PRO'; // Trial users get PRO access
  }
  
  if (status === 'active') {
    const priceId = subscription.items.data[0]?.price.id;
    if (priceId) {
      // You might want to map price IDs to plan names here
      // For now, we'll assume PRO for active subscriptions
      return 'PRO';
    }
  }
  
  return 'FREE';
}

// Helper function to send plan change emails
async function sendPlanChangeEmail(email: string, previousStatus: string, newStatus: string) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase
      .from('users')
      .select('rfirst_name')
      .eq('email', email)
      .single();

    const firstName = user?.rfirst_name || 'User';
    
    // Determine if it's an upgrade or downgrade
    const planPriority = {
      'FREE': 0,
      'PRO': 1,
      'PREMIUM PRO': 2
    };
    
    const previousPriority = planPriority[previousStatus as keyof typeof planPriority] || 0;
    const newPriority = planPriority[newStatus as keyof typeof planPriority] || 0;
    
    if (newPriority > previousPriority) {
      await sendUpgradePlanMail(email, firstName, newStatus);
    } else if (newPriority < previousPriority) {
      await sendDowngradePlanMail(email, firstName, newStatus);
    }
  } catch (error) {
    console.error('Error sending plan change email:', error);
  }
}
