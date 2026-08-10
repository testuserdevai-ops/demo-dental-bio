import { InviteEmailForm } from "./InviteEmailForm";
import { ReferralCopyButton } from "./ReferralCopyButton";
import type { ReferralViewModel } from "../_lib/queries";

export function ReferralManager({
  view,
  targetHint,
}: {
  view: ReferralViewModel;
  targetHint?: string;
}) {
  return (
    <div className="space-y-5" data-testid="referral-manager">
      <section className="space-y-3 rounded-3xl border bg-white p-5 shadow-sm">
        <div>
          <h3 className="font-semibold">Your referral link</h3>
          <p className="text-sm text-muted-foreground">
            Share this link directly or send it by email.
          </p>
        </div>
        {view.canInvite ? (
          <ReferralCopyButton referralUrl={view.referralUrl} />
        ) : (
          <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
            Upgrade your plan to unlock your personal referral link.
          </p>
        )}
      </section>
      {view.canInvite && <InviteEmailForm targetHint={targetHint} />}
    </div>
  );
}
