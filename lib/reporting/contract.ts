import { z } from "zod";

export const reportCategories = [
  "fraud_or_impersonation",
  "unsafe_or_harmful",
  "misleading_information",
  "spam_or_scam",
  "privacy_or_personal_data",
  "other",
] as const;

export const reportStatuses = [
  "new",
  "in_review",
  "action_required",
  "resolved",
  "dismissed",
] as const;

export const reportPriorities = ["critical", "high", "medium", "low"] as const;

export const reportOutcomes = [
  "no_action",
  "warning_requested",
  "content_review_requested",
  "suspension_review_requested",
] as const;

export type ReportCategory = (typeof reportCategories)[number];
export type ReportStatus = (typeof reportStatuses)[number];
export type ReportPriority = (typeof reportPriorities)[number];
export type ReportOutcome = (typeof reportOutcomes)[number];

export const reportCategoryLabels: Record<ReportCategory, string> = {
  fraud_or_impersonation: "Fraud or impersonation",
  unsafe_or_harmful: "Unsafe or harmful content",
  misleading_information: "Misleading information",
  spam_or_scam: "Spam or scam",
  privacy_or_personal_data: "Privacy or personal data concern",
  other: "Something else",
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  new: "New",
  in_review: "In review",
  action_required: "Action required",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const reportPriorityLabels: Record<ReportPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const reportOutcomeLabels: Record<ReportOutcome, string> = {
  no_action: "No action required",
  warning_requested: "Profile-owner warning requested",
  content_review_requested: "Content removal review requested",
  suspension_review_requested: "Profile suspension review requested",
};

const optionalDetailsSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(10).max(2000).optional(),
);

const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().toLowerCase().email().max(254).optional(),
);

export const submitProfileReportSchema = z
  .object({
    profileId: z.uuid(),
    category: z.enum(reportCategories),
    details: optionalDetailsSchema,
    reporterEmail: optionalEmailSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.category === "other" && !value.details) {
      context.addIssue({
        code: "custom",
        path: ["details"],
        message: "Please tell us what you are concerned about.",
      });
    }
  });

export const reportListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(10).max(100).default(25),
    search: z.string().trim().max(160).optional(),
    status: z.enum(reportStatuses).optional(),
    category: z.enum(reportCategories).optional(),
    priority: z.enum(reportPriorities).optional(),
    assignee: z.union([z.uuid(), z.literal("unassigned")]).optional(),
    overdue: z.enum(["true", "false"]).optional(),
    sort: z
      .enum(["created_at", "updated_at", "sla_due_at", "priority_rank"])
      .default("created_at"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const reportDetailQuerySchema = z.object({ id: z.uuid() }).strict();

export const moderateProfileReportSchema = z
  .object({
    id: z.uuid(),
    expectedVersion: z.number().int().positive(),
    status: z.enum(reportStatuses),
    priority: z.enum(reportPriorities),
    assignedTo: z.uuid().nullable(),
    outcome: z.enum(reportOutcomes).nullable(),
    outcomeReason: z.string().trim().min(10).max(1000).nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    const isClosed =
      value.status === "resolved" || value.status === "dismissed";
    if (isClosed && (!value.outcome || !value.outcomeReason)) {
      context.addIssue({
        code: "custom",
        path: ["outcomeReason"],
        message:
          "A documented outcome and reason are required to close a report.",
      });
    }
    if ((value.outcome === null) !== (value.outcomeReason === null)) {
      context.addIssue({
        code: "custom",
        path: ["outcomeReason"],
        message: "Outcome and reason must be provided together.",
      });
    }
  });

export const addReportNoteSchema = z
  .object({ note: z.string().trim().min(2).max(2000) })
  .strict();

export function formatReportReference(id: string): string {
  return `RPT-${id.slice(0, 8).toUpperCase()}`;
}
