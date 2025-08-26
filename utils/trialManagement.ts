import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const pricePro = process.env.PRICE_PRO_MONTHLY!;

export interface TrialInfo {
  isInTrial: boolean;
  trialEndDate: Date | null;
  daysRemaining: number;
  trialType: 'standard' | 'student_offer' | 'referral' | 'none';
  baseTrialMonths: number;
  referralBonusMonths: number;
  totalTrialMonths: number;
}

export interface TrialStatus {
  isActive: boolean;
  isExpired: boolean;
  isEndingSoon: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
}

/**
 * Get the user's current Stripe subscription (if any)
 */
export async function getUserStripeSubscription(userId: string): Promise<Stripe.Subscription | null> {
  const supabase = createClient();
  const { data: user } = await supabase
    .from('users')
    .select('subscription_id')
    .eq('id', userId)
    .single();
  if (!user?.subscription_id) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
    return subscription as Stripe.Subscription;
  } catch {
    return null;
  }
}

/**
 * Check if user is eligible for a trial (no active paid sub, no previous trial)
 */
export async function isEligibleForTrial(userId: string): Promise<boolean> {
  const subscription = await getUserStripeSubscription(userId);
  if (!subscription) return true; // No sub, eligible
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return false;
  }
  return true;
}

/**
 * Create or extend a trial in Stripe (if eligible)
 * Returns the Stripe subscription or null if not eligible
 */
export async function createOrExtendStripeTrial({
  userId,
  email,
  name,
  priceId,
  months,
  metadata = {},
}: {
  userId: string;
  email: string;
  name: string;
  priceId: string;
  months: number;
  metadata?: Record<string, string>;
}): Promise<Stripe.Subscription | null> {
  // Check eligibility
  const eligible = await isEligibleForTrial(userId);
  if (!eligible) return null;

  // Find or create customer
  let customerId: string;
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({ email, name });
    customerId = customer.id;
  }

  // Create subscription with trial
  const trialDays = months * 30;
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    metadata,
  });
  return subscription;
}

/**
 * Get comprehensive trial information for a user
 */
export async function getTrialInfo(userId: string): Promise<TrialInfo | null> {
  const supabase = createClient();
  
  const { data: user, error } = await supabase
    .from('users')
    .select('trial_end, subscription_id, subscription_status')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  const now = new Date();
  const trialEndDate = user.trial_end ? new Date(user.trial_end) : null;
  const isInTrial = trialEndDate ? trialEndDate > now : false;
  const daysRemaining = trialEndDate ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Get trial metadata from Stripe if available
  let trialType: 'standard' | 'student_offer' | 'referral' | 'none' = 'none';
  let baseTrialMonths = 0;
  let referralBonusMonths = 0;
  let totalTrialMonths = 0;

  if (user.subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
      const metadata = subscription.metadata;
      
      trialType = (metadata.trial_type as any) || 'none';
      baseTrialMonths = parseInt(metadata.base_trial_months || '0');
      referralBonusMonths = parseInt(metadata.referral_bonus_months || '0');
      totalTrialMonths = parseInt(metadata.total_trial_months || '0');
    } catch (error) {
      console.error('Error retrieving subscription metadata:', error);
    }
  }

  return {
    isInTrial,
    trialEndDate,
    daysRemaining,
    trialType,
    baseTrialMonths,
    referralBonusMonths,
    totalTrialMonths
  };
}

export async function getTrialStatus(userId: string): Promise<TrialStatus | null> {
  const trialInfo = await getTrialInfo(userId);
  if (!trialInfo) return null;
  const isActive = trialInfo.isInTrial;
  const isExpired = !isActive && trialInfo.trialEndDate !== null;
  const isEndingSoon = isActive && trialInfo.daysRemaining <= 3;
  return {
    isActive,
    isExpired,
    isEndingSoon,
    daysRemaining: trialInfo.daysRemaining,
    trialEndDate: trialInfo.trialEndDate
  };
}

export async function isEligibleForTrialExtension(userId: string): Promise<boolean> {
  // Only allow extension if user has a paid Premium Pro plan
  const supabase = createClient();
  
  // Get user's subscription status from database
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single();
  
  if (error || !user) return false;
  
  // Only allow trial extension for Premium Pro users
  return user.subscription_status !== 'PREMIUM PRO';
}

export async function extendTrial(userId: string, additionalMonths: number): Promise<boolean> {
  const supabase = createClient();
  try {
    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('trial_end, current_period_end, subscription_id')
      .eq('id', userId)
      .single();
    if (userError || !user) return false;
    const now = new Date();
    let currentEndDate: Date;
    if (user.trial_end && new Date(user.trial_end) > now) {
      currentEndDate = new Date(user.trial_end);
    } else if (user.current_period_end) {
      currentEndDate = new Date(user.current_period_end);
    } else {
      currentEndDate = now;
    }
    // Add additional months
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);
    // Update Stripe subscription if it exists and is in trial
    if (user.subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
        if (subscription.status === "trialing") {
          const extendedEndDate = Math.floor(newEndDate.getTime() / 1000);
          await stripe.subscriptions.update(user.subscription_id, {
            trial_end: extendedEndDate,
            proration_behavior: "none"
          });
          return true;
        }
      } catch (stripeError) {
        console.error('Error updating Stripe subscription:', stripeError);
      }
    }
    return false;
  } catch (error) {
    console.error('Error extending trial:', error);
    return false;
  }
}

/**
 * Extend either the trial period (if in trial) or the paid period (if paid) for a user.
 * If in trial, extends trial_end. If paid, extends current_period_end (billing_cycle_anchor).
 * Returns true if successful.
 */
export async function extendPaidPeriodOrTrial(userId: string, additionalMonths: number): Promise<boolean> {
  const supabase = createClient();
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('trial_end, current_period_end, subscription_id, email, first_name, last_name')
      .eq('id', userId)
      .single();
    if (userError || !user || !user.subscription_id) return false;
    const now = new Date();
    let currentEndDate: Date;
    let isTrial = false;
    if (user.trial_end && new Date(user.trial_end) > now) {
      currentEndDate = new Date(user.trial_end);
      isTrial = true;
    } else if (user.current_period_end && new Date(user.current_period_end) > now) {
      currentEndDate = new Date(user.current_period_end);
    } else {
      // fallback to now
      currentEndDate = now;
    }
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);
    const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
    if (isTrial && subscription.status === 'trialing') {
      // Extend trial
      await stripe.subscriptions.update(user.subscription_id, {
        trial_end: Math.floor(newEndDate.getTime() / 1000),
        proration_behavior: 'none',
      });
      return true;
    } else if (subscription.status === 'active') {
      // Instead of setting billing_cycle_anchor, use trial_end if allowed
      await stripe.subscriptions.update(user.subscription_id, {
        trial_end: Math.floor(newEndDate.getTime() / 1000), // ⚠️ Only if trials allowed again
        proration_behavior: 'none',
      });
      return true;
    } else {
      const subscription = await createOrExtendStripeTrial({
        userId,
        email: user.email,
        name: user.first_name + ' ' + user.last_name,
        priceId: pricePro,
        months: additionalMonths,
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error extending paid/trial period:', error);
    return false;
  }
}

/**
 * Admin: Set any plan and any end date for a user (trial or paid period)
 * planPriceId: Stripe price ID for the plan (e.g. PRO, PREMIUM PRO)
 * endDate: JS Date object for the new end date (trial_end or billing_cycle_anchor)
 * isTrial: if true, set as trial_end, else as paid period
 */
export async function adminSetPlanAndEndDate({
  userId,
  planPriceId,
  endDate,
  isTrial,
  metadata = {},
}: {
  userId: string;
  planPriceId: string;
  endDate: Date;
  isTrial: boolean;
  metadata?: Record<string, string>;
}): Promise<boolean> {
  const supabase = createClient();
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_id')
      .eq('id', userId)
      .single();
    if (userError || !user || !user.subscription_id) return false;
    // Update subscription to new plan
    await stripe.subscriptions.update(user.subscription_id, {
      items: [{ price: planPriceId }],
      ...(isTrial
        ? { trial_end: Math.floor(endDate.getTime() / 1000) }
        : { billing_cycle_anchor: Math.floor(endDate.getTime() / 1000) as any }),
      proration_behavior: 'none',
      metadata,
    });
    return true;
  } catch (error) {
    console.error('Error in adminSetPlanAndEndDate:', error);
    return false;
  }
}

export async function getTrialStatistics(): Promise<{
  totalTrials: number;
  activeTrials: number;
  expiringTrials: number;
  expiredTrials: number;
  trialTypes: Record<string, number>;
}> {
  const supabase = createClient();
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
  const { data: users, error } = await supabase
    .from('users')
    .select('trial_end, subscription_status')
    .not('trial_end', 'is', null);
  if (error || !users) {
    return {
      totalTrials: 0,
      activeTrials: 0,
      expiringTrials: 0,
      expiredTrials: 0,
      trialTypes: {}
    };
  }
  let activeTrials = 0;
  let expiringTrials = 0;
  let expiredTrials = 0;
  const trialTypes: Record<string, number> = {};
  users.forEach(user => {
    if (user.trial_end) {
      const trialEndDate = new Date(user.trial_end);
      const isActive = trialEndDate > now;
      const isExpiringSoon = trialEndDate <= threeDaysFromNow && trialEndDate > now;
      if (isActive) {
        activeTrials++;
        if (isExpiringSoon) {
          expiringTrials++;
        }
      } else {
        expiredTrials++;
      }
      const status = user.subscription_status || 'unknown';
      trialTypes[status] = (trialTypes[status] || 0) + 1;
    }
  });
  return {
    totalTrials: users.length,
    activeTrials,
    expiringTrials,
    expiredTrials,
    trialTypes
  };
}

export async function sendTrialEndNotification(userId: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('email, first_name, trial_end')
      .eq('id', userId)
      .single();
    if (error || !user) {
      return false;
    }
    // You can implement a trial end notification email here
    // For now, we'll just log it
    console.log(`Trial ending notification sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending trial end notification:', error);
    return false;
  }
} 