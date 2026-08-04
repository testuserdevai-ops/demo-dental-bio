import type { ResolvedDashboardIdentity } from "@/lib/dashboard/types";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { referralInviteSchema } from "./schemas";

export type ReferralSender = { username: string; firstName: string | null };
export type ReferralBrand = { baseUrl: string; brandName: string };
export type ReferralDelivery = {
  recipient: string;
  senderName: string;
  referralUrl: string;
  brandName: string;
};
export type ReferralInviteDependencies = {
  resolveIdentity(
    targetHint: string | undefined,
  ): Promise<ResolvedDashboardIdentity>;
  getSender(userId: string): Promise<ReferralSender | null>;
  getBrand(): Promise<ReferralBrand>;
  deliver(input: ReferralDelivery): Promise<void>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendReferralInviteWithDependencies(
  targetHint: string | undefined,
  input: unknown,
  dependencies: ReferralInviteDependencies,
): Promise<ActionResult<void>> {
  const parsed = referralInviteSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  try {
    const { scope, shell } = await dependencies.resolveIdentity(targetHint);
    const canInvite =
      ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
      Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());
    if (!canInvite)
      return actionError(
        "ENTITLEMENT_REQUIRED",
        "Upgrade your plan before sending referral invitations",
      );

    const [sender, brand] = await Promise.all([
      dependencies.getSender(scope.effectiveUserId),
      dependencies.getBrand(),
    ]);
    if (!sender)
      return actionError("SENDER_NOT_FOUND", "Unable to send invitation");

    await dependencies.deliver({
      recipient: parsed.data.email,
      senderName: escapeHtml(sender.firstName?.trim() || sender.username),
      referralUrl: `${brand.baseUrl}/api/invite?referral=${encodeURIComponent(sender.username)}`,
      brandName: brand.brandName,
    });
    return { ok: true, data: undefined };
  } catch {
    return actionError(
      "INVITE_FAILED",
      "The invitation could not be sent. Try again.",
    );
  }
}
