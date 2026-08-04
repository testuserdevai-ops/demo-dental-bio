"use server";

import { headers } from "next/headers";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import type { ActionResult } from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDomainConfig } from "@/utils/domainConfig";
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { shouldDisableExternalProvidersForLocalE2E } from "@/utils/trialManagement";
import {
  sendReferralInviteWithDependencies,
  type ReferralDelivery,
} from "./invite-policy";

async function deliverReferral(input: ReferralDelivery) {
  if (shouldDisableExternalProvidersForLocalE2E()) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (input.recipient.endsWith("@provider-failure.invalid"))
      throw new Error("Controlled local provider failure");
    return;
  }
  const config = getDomainConfig(await headers());
  await sendTemplateEmail(
    {
      sendTo: input.recipient,
      title: `You're invited to join ${input.brandName}!`,
      content: `<h1>${input.senderName} invited you to join ${input.brandName}!</h1><p>If you upgrade to the Pro Plan, you'll both receive one month free.</p><p><a href="${input.referralUrl}" class="button">Sign Up Now</a></p>`,
    },
    config,
    { throwOnError: true },
  );
}

export async function sendReferralInvite(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  return sendReferralInviteWithDependencies(targetHint, input, {
    resolveIdentity: resolveDashboardIdentity,
    async getSender(userId) {
      const client = await createServerSupabaseClient();
      const { data, error } = await client
        .from("users")
        .select("username, first_name")
        .eq("id", userId)
        .single();
      return error || !data
        ? null
        : { username: data.username, firstName: data.first_name };
    },
    async getBrand() {
      const config = getDomainConfig(await headers());
      return { baseUrl: config.baseUrl, brandName: config.brandName };
    },
    deliver: deliverReferral,
  });
}
