import { z } from "zod";

export const lifecycleEventTypeSchema = z.enum([
  "registration_completed",
  "verification_completed",
  "profile_photo_added",
  "professional_details_completed",
  "first_treatment_added",
  "contact_action_added",
  "profile_previewed",
  "profile_published",
  "profile_shared",
  "qualified_profile_view",
  "link_clicked",
  "contact_clicked",
  "booking_clicked",
  "qr_scanned",
  "profile_unpublished",
  "subscription_changed",
]);

export const lifecycleCampaignSchema = z.enum([
  "incomplete_profile",
  "first_value_milestone",
  "weekly_performance",
  "no_contact_action",
  "zero_traffic",
]);

export const nextBestActionSchema = z.enum([
  "add_profile_photo",
  "complete_professional_details",
  "add_first_treatment",
  "add_contact_action",
  "preview_profile",
  "publish_profile",
  "share_profile",
  "review_analytics",
]);

export type LifecycleEventType = z.infer<typeof lifecycleEventTypeSchema>;
export type LifecycleCampaign = z.infer<typeof lifecycleCampaignSchema>;
export type NextBestAction = z.infer<typeof nextBestActionSchema>;

export type ActivationSnapshot = {
  hasProfessionalPhoto: boolean;
  hasProfessionalDetails: boolean;
  hasTreatmentOrService: boolean;
  hasContactOrBookingAction: boolean;
  hasPreviewed: boolean;
  isPublished: boolean;
  hasShared: boolean;
  qualifiedViews: number | null;
  countedContactActions: number | null;
};

export type LifecyclePreferences = {
  lifecycleEmailsEnabled: boolean;
  weeklySummaryEnabled: boolean;
  milestoneEmailsEnabled: boolean;
  promotionalUnsubscribedAt: string | null;
  permanentDeliveryFailureAt: string | null;
  supportPausedUntil: string | null;
};

export type LifecycleCandidate = {
  campaign: LifecycleCampaign;
  eligibleAt: string;
};
