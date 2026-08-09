import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { getReviewAggregate } from "./_lib/queries";
import { ReviewClient } from "./_components/ReviewManager";
import LockMessage from "@/app/components/LockMessage";

const Review = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { scope, shell } = await resolveDashboardIdentity(targetUserId);
  const data = await getReviewAggregate(scope);
  const proAvailable =
    ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
    Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Reviews</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.reviews}</IntroText>
      <ReviewClient
        scopeId={scope.effectiveUserId}
        targetHint={targetUserId}
        data={data}
        updatedAt={0}
        enabled={proAvailable}
      />
    </div>
  );
};

export default Review;
