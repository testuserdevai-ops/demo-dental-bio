/**
 * Checks if a user has an active paid subscription or active trial.
 * Used to gate premium features (blogs, galleries, reviews, videos, etc.)
 */
export function hasActiveSubscription(userData: any): boolean {
  if (!userData) return false;

  const isPaidPlan =
    userData.subscription_status === "PRO" ||
    userData.subscription_status === "PREMIUM PRO";

  const hasActiveTrial =
    userData.trial_end && new Date(userData.trial_end) > new Date();

  return isPaidPlan || hasActiveTrial;
}
