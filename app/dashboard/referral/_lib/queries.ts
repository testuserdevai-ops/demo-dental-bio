import "server-only";
import { headers } from "next/headers";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDomainConfig, type DomainConfig } from "@/utils/domainConfig";

export type ReferralViewModel = {
  referralUrl: string;
  senderDisplayName: string;
  canInvite: boolean;
};

export async function getReferralViewModel(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  domain?: DomainConfig,
): Promise<ReferralViewModel> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data, error } = await supabase
    .from("users")
    .select("username, first_name, subscription_status, trial_end")
    .eq("id", scope.effectiveUserId)
    .single();
  if (error || !data) throw new Error("Unable to load referral details");

  const config = domain ?? getDomainConfig(await headers());
  const canInvite =
    ["PRO", "PREMIUM PRO"].includes(data.subscription_status ?? "") ||
    Boolean(data.trial_end && new Date(data.trial_end) > new Date());

  return {
    referralUrl: `${config.baseUrl}/api/invite?referral=${encodeURIComponent(data.username)}`,
    senderDisplayName: data.first_name?.trim() || data.username,
    canInvite,
  };
}
