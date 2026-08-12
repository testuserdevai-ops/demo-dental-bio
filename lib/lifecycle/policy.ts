import type {
  ActivationSnapshot,
  LifecycleCampaign,
  LifecycleCandidate,
  LifecyclePreferences,
  NextBestAction,
} from "./contract";

const CAMPAIGN_PRECEDENCE: Record<LifecycleCampaign, number> = {
  first_value_milestone: 0,
  no_contact_action: 1,
  zero_traffic: 2,
  weekly_performance: 3,
  incomplete_profile: 4,
};

export function isActivated(snapshot: ActivationSnapshot): boolean {
  return (
    snapshot.hasProfessionalPhoto &&
    snapshot.hasProfessionalDetails &&
    snapshot.hasTreatmentOrService &&
    snapshot.hasContactOrBookingAction &&
    snapshot.isPublished
  );
}

export function nextBestAction(snapshot: ActivationSnapshot): NextBestAction {
  if (!snapshot.hasProfessionalPhoto) return "add_profile_photo";
  if (!snapshot.hasProfessionalDetails) return "complete_professional_details";
  if (!snapshot.hasTreatmentOrService) return "add_first_treatment";
  if (!snapshot.hasContactOrBookingAction) return "add_contact_action";
  if (!snapshot.hasPreviewed) return "preview_profile";
  if (!snapshot.isPublished) return "publish_profile";
  if (!snapshot.hasShared) return "share_profile";
  return "review_analytics";
}

function isPaused(preferences: LifecyclePreferences, now: Date): boolean {
  return Boolean(
    preferences.permanentDeliveryFailureAt ||
    (preferences.supportPausedUntil &&
      new Date(preferences.supportPausedUntil).getTime() > now.getTime()),
  );
}

export function campaignAllowed(
  campaign: LifecycleCampaign,
  preferences: LifecyclePreferences,
  now: Date,
): boolean {
  if (isPaused(preferences, now)) return false;
  if (preferences.promotionalUnsubscribedAt) return false;
  if (!preferences.lifecycleEmailsEnabled) return false;
  if (campaign === "weekly_performance")
    return preferences.weeklySummaryEnabled;
  if (campaign === "first_value_milestone")
    return preferences.milestoneEmailsEnabled;
  return true;
}

/**
 * Select at most one promotional lifecycle message for a frequency window.
 * Eligibility is re-evaluated by the worker immediately before delivery.
 */
export function selectLifecycleCandidate(
  candidates: readonly LifecycleCandidate[],
  preferences: LifecyclePreferences,
  now: Date,
): LifecycleCandidate | null {
  return (
    candidates
      .filter((candidate) =>
        campaignAllowed(candidate.campaign, preferences, now),
      )
      .filter(
        (candidate) =>
          new Date(candidate.eligibleAt).getTime() <= now.getTime(),
      )
      .sort(
        (left, right) =>
          CAMPAIGN_PRECEDENCE[left.campaign] -
            CAMPAIGN_PRECEDENCE[right.campaign] ||
          left.eligibleAt.localeCompare(right.eligibleAt),
      )[0] ?? null
  );
}
