import "server-only";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const referralEntitlementClaimSchema = z.discriminatedUnion("claim_status", [
  z
    .object({
      claim_status: z.literal("claimed"),
      target_end: z.string(),
      is_trial: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      claim_status: z.literal("already_applied"),
      target_end: z.string().optional(),
      is_trial: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      claim_status: z.literal("busy"),
      target_end: z.string().optional(),
      is_trial: z.boolean().optional(),
    })
    .strict(),
]);

export type ReferralEntitlementClaim = z.infer<
  typeof referralEntitlementClaimSchema
>;

export interface ClaimReferralEntitlementInput {
  userId: string;
  operationKey: string;
  additionalMonths: number;
  providerPeriodEnd: string;
  isTrial: boolean;
}

export interface FinishReferralEntitlementInput {
  userId: string;
  operationKey: string;
  succeeded: boolean;
}

export async function claimReferralEntitlement(
  input: ClaimReferralEntitlementInput,
): Promise<ReferralEntitlementClaim> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "claim_referral_entitlement",
      {
        p_user_id: input.userId,
        p_operation_key: input.operationKey,
        p_additional_months: input.additionalMonths,
        p_provider_period_end: input.providerPeriodEnd,
        p_is_trial: input.isTrial,
      },
    );

    if (error) throw error;

    const parsed = referralEntitlementClaimSchema.safeParse(data);
    if (!parsed.success) throw parsed.error;

    return parsed.data;
  } catch (error) {
    throw new Error("Referral entitlement claim failed", { cause: error });
  }
}

export async function finishReferralEntitlement(
  input: FinishReferralEntitlementInput,
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc(
      "finish_referral_entitlement",
      {
        p_user_id: input.userId,
        p_operation_key: input.operationKey,
        p_succeeded: input.succeeded,
      },
    );

    if (error) throw error;
    return Boolean(data);
  } catch (error) {
    throw new Error("Referral entitlement finish failed", { cause: error });
  }
}
