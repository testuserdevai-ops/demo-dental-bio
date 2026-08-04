import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { featureDescriptions } from "@/utils/global_constants";
import { ReferralManager } from "./_components/ReferralManager";
import { getReferralViewModel } from "./_lib/queries";

export const metadata = {
  title: "Get one month free!",
  description: "Get one month free on your Pro Plan for each friend you refer.",
};

export default async function ReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { scope } = await resolveDashboardIdentity(targetUserId);
  const view = await getReferralViewModel(scope);

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Get One Month Free</h2>
      {!view.canInvite && <LockMessage />}
      <IntroText>{featureDescriptions.referral}</IntroText>
      <div className={view.canInvite ? "" : "opacity-40"}>
        <ReferralManager view={view} targetHint={targetUserId} />
      </div>
    </div>
  );
}
