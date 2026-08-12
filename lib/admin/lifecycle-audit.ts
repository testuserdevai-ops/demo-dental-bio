import { z } from "zod";

import { lifecycleCampaignSchema } from "@/lib/lifecycle/contract";

export const lifecycleAuditOutcomeSchema = z.enum([
  "eligible",
  "claimed",
  "sent",
  "delivered",
  "failed",
  "suppressed",
  "cancelled",
  "cta_clicked",
  "resulting_step_completed",
  "activated",
]);

export const lifecycleAuditRowSchema = z.object({
  audit_id: z.coerce.number().int().nonnegative(),
  campaign: lifecycleCampaignSchema,
  outcome: lifecycleAuditOutcomeSchema,
  reason_code: z.string().nullable(),
  occurred_at: z.iso.datetime(),
});

const ownerIdSchema = z.uuid();
const filterCampaignSchema = z.union([
  z.literal("all"),
  lifecycleCampaignSchema,
]);
const filterOutcomeSchema = z.union([
  z.literal("all"),
  lifecycleAuditOutcomeSchema,
]);
const displayLimitSchema = z.coerce
  .number()
  .pipe(z.union([z.literal(25), z.literal(50), z.literal(100)]));

export type LifecycleAuditFilters = {
  ownerId: string | null;
  invalidOwnerId: boolean;
  campaign: "all" | z.infer<typeof lifecycleCampaignSchema>;
  outcome: "all" | z.infer<typeof lifecycleAuditOutcomeSchema>;
  limit: 25 | 50 | 100;
};

export type LifecycleAuditEvent = {
  id: number;
  campaign: z.infer<typeof lifecycleCampaignSchema>;
  outcome: z.infer<typeof lifecycleAuditOutcomeSchema>;
  reasonCode: string | null;
  occurredAt: string;
};

export type LifecycleAuditModel = {
  ownerId: string;
  preferences: {
    lifecycleEmailsEnabled: boolean;
    weeklySummaryEnabled: boolean;
    milestoneEmailsEnabled: boolean;
    promotionalUnsubscribedAt: string | null;
    permanentDeliveryFailureAt: string | null;
    supportPausedUntil: string | null;
    revision: number;
    updatedAt: string | null;
  };
  events: LifecycleAuditEvent[];
  fetchedEventCount: number;
  filters: LifecycleAuditFilters;
};

export function parseLifecycleAuditFilters(input: {
  owner?: string;
  campaign?: string;
  outcome?: string;
  limit?: string;
}): LifecycleAuditFilters {
  const ownerInput = input.owner?.trim() ?? "";
  const owner = ownerInput ? ownerIdSchema.safeParse(ownerInput) : null;
  return {
    ownerId: owner?.success ? owner.data : null,
    invalidOwnerId: ownerInput.length > 0 && !owner?.success,
    campaign: filterCampaignSchema.catch("all").parse(input.campaign),
    outcome: filterOutcomeSchema.catch("all").parse(input.outcome),
    limit: displayLimitSchema.catch(50).parse(input.limit),
  };
}

export function filterLifecycleAuditEvents(
  rows: unknown[],
  filters: LifecycleAuditFilters,
): LifecycleAuditEvent[] {
  return rows
    .map((row) => lifecycleAuditRowSchema.parse(row))
    .filter(
      (row) =>
        (filters.campaign === "all" || row.campaign === filters.campaign) &&
        (filters.outcome === "all" || row.outcome === filters.outcome),
    )
    .slice(0, filters.limit)
    .map((row) => ({
      id: row.audit_id,
      campaign: row.campaign,
      outcome: row.outcome,
      reasonCode: row.reason_code,
      occurredAt: row.occurred_at,
    }));
}
