import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { getGalleryAggregate } from "./_lib/queries";
import { GalleryClient } from "./_components/GalleryManager";
import LockMessage from "@/app/components/LockMessage";

const Gallery = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { scope, shell } = await resolveDashboardIdentity(targetUserId);
  const data = await getGalleryAggregate(scope);
  const proAvailable =
    ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
    Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Gallery</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.gallery}</IntroText>
      <GalleryClient
        scopeId={scope.effectiveUserId}
        targetHint={targetUserId}
        data={data}
        updatedAt={0}
        enabled={proAvailable}
      />
    </div>
  );
};

export default Gallery;
