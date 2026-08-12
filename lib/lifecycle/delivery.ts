import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDomainConfigByHostname } from "@/utils/domainConfig";
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";

import { lifecycleCampaignSchema, type LifecycleCampaign } from "./contract";

export type LifecycleDeliveryCandidate = {
  userId: string;
  email: string;
  firstName: string | null;
  username: string;
  campaign: LifecycleCampaign;
  claimKey: string;
  reasonCode: string;
  qualifiedViews: number;
  contactActions: number;
  previousQualifiedViews: number;
  previousContactActions: number;
};

type LifecycleClaim = { claimId: string | null; claimed: boolean };

export type LifecycleDeliveryDependencies = {
  listCandidates(
    now: Date,
    limit: number,
  ): Promise<LifecycleDeliveryCandidate[]>;
  claim(candidate: LifecycleDeliveryCandidate): Promise<LifecycleClaim>;
  complete(
    claimId: string,
    outcome: "sent" | "failed",
    reason: string,
  ): Promise<void>;
  send(candidate: LifecycleDeliveryCandidate): Promise<void>;
};

const numberValue = (value: number | string) => Number(value);

export async function listLifecycleCandidates(
  now: Date,
  limit: number,
): Promise<LifecycleDeliveryCandidate[]> {
  const { data, error } = await supabaseAdmin.rpc(
    "get_lifecycle_delivery_candidates",
    { p_now: now.toISOString(), p_limit: limit },
  );
  if (error) throw new Error("Unable to load lifecycle candidates");
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    username: row.username,
    campaign: lifecycleCampaignSchema.parse(row.campaign),
    claimKey: row.claim_key,
    reasonCode: row.reason_code,
    qualifiedViews: numberValue(row.qualified_views),
    contactActions: numberValue(row.contact_actions),
    previousQualifiedViews: numberValue(row.previous_qualified_views),
    previousContactActions: numberValue(row.previous_contact_actions),
  }));
}

async function claimLifecycleCandidate(
  candidate: LifecycleDeliveryCandidate,
): Promise<LifecycleClaim> {
  const { data, error } = await supabaseAdmin.rpc("claim_lifecycle_message", {
    p_target_user_id: candidate.userId,
    p_campaign: candidate.campaign,
    p_claim_key: candidate.claimKey,
    p_reason_code: candidate.reasonCode,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Unable to claim lifecycle message");
  return { claimId: row.claim_id, claimed: row.claimed };
}

async function completeLifecycleClaim(
  claimId: string,
  outcome: "sent" | "failed",
  reasonCode: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("complete_lifecycle_message", {
    p_claim_id: claimId,
    p_outcome: outcome,
    p_reason_code: reasonCode,
  });
  if (error) throw new Error("Unable to complete lifecycle message");
}

const signedPercent = (current: number, previous: number) =>
  previous === 0
    ? current > 0
      ? "new activity"
      : "no change"
    : `${Math.round(((current - previous) / previous) * 100)}% vs last week`;

export function lifecycleMessageContent(candidate: LifecycleDeliveryCandidate) {
  const analyticsUrl = "/dashboard/analytics?range=7d";
  const contentByCampaign: Record<
    LifecycleCampaign,
    { title: string; body: string }
  > = {
    incomplete_profile: {
      title: "One next step for your DentalBio profile",
      body: `<p>Complete the next missing profile step to make your public profile useful to patients.</p><p><a class="button" href="/dashboard/profile">Continue your profile</a></p>`,
    },
    first_value_milestone: {
      title: "Your DentalBio profile reached 100 views",
      body: `<p>Your public profile has reached a verified first-value milestone: at least 100 qualified views.</p><p><a class="button" href="${analyticsUrl}">Review your analytics</a></p>`,
    },
    weekly_performance: {
      title: "Your weekly DentalBio performance",
      body: `<p>Your profile received <strong>${candidate.qualifiedViews}</strong> qualified views (${signedPercent(candidate.qualifiedViews, candidate.previousQualifiedViews)}) and <strong>${candidate.contactActions}</strong> contact actions.</p><p><a class="button" href="${analyticsUrl}">Review the 7-day report</a></p>`,
    },
    no_contact_action: {
      title: "Patients viewed your profile but did not contact you",
      body: `<p>Your profile received <strong>${candidate.qualifiedViews}</strong> qualified views in the last 7 days and no counted contact action.</p><p>Check that your booking, phone or email action is clear and current.</p><p><a class="button" href="/dashboard/profile">Review contact actions</a></p>`,
    },
    zero_traffic: {
      title: "Your published profile has not received a visit yet",
      body: `<p>Your profile is published, but no qualified profile view has been recorded in the last 30 days.</p><p><a class="button" href="/dashboard/analytics">Check analytics and share your profile</a></p>`,
    },
  };
  return contentByCampaign[candidate.campaign];
}

async function sendLifecycleCandidate(candidate: LifecycleDeliveryCandidate) {
  const config = getDomainConfigByHostname("dental.bio");
  const message = lifecycleMessageContent(candidate);
  await sendTemplateEmail(
    {
      sendTo: candidate.email,
      title: message.title,
      content: `<p>Hello ${candidate.firstName?.trim() || "there"},</p>${message.body}`,
    },
    config,
    { throwOnError: true },
  );
}

const productionDependencies: LifecycleDeliveryDependencies = {
  listCandidates: listLifecycleCandidates,
  claim: claimLifecycleCandidate,
  complete: completeLifecycleClaim,
  send: sendLifecycleCandidate,
};

export async function deliverLifecycleMessages(
  options: { now?: Date; limit?: number },
  dependencies: LifecycleDeliveryDependencies = productionDependencies,
) {
  const now = options.now ?? new Date();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const candidates = await dependencies.listCandidates(now, limit);
  const result = {
    considered: candidates.length,
    sent: 0,
    suppressed: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    const claim = await dependencies.claim(candidate);
    if (!claim.claimed || !claim.claimId) {
      result.suppressed += 1;
      continue;
    }
    try {
      await dependencies.send(candidate);
      await dependencies.complete(claim.claimId, "sent", "provider_accepted");
      result.sent += 1;
    } catch {
      await dependencies.complete(claim.claimId, "failed", "provider_error");
      result.failed += 1;
    }
  }
  return result;
}
