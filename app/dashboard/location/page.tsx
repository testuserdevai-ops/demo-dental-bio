import IntroText from "@/app/components/IntroText";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { featureDescriptions } from "@/utils/global_constants";
import { LocationClient } from "./_components/LocationManager";
import { getLocationAggregate } from "./_lib/queries";
import MapLoader from "./MapLoader";
export default async function Location({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId: targetUserId } = await searchParams;
  const { scope, shell } = await resolveDashboardIdentity(targetUserId);
  const data = await getLocationAggregate(scope);
  const paid =
    ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
    Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());
  return (
    <div className="flex-col-gap py-2">
      <MapLoader />
      <h2 className="text-xl font-semibold text-dark">Locations</h2>
      <IntroText>{featureDescriptions.locations}</IntroText>
      <LocationClient
        scopeId={scope.effectiveUserId}
        targetHint={targetUserId}
        data={data}
        updatedAt={0}
        enabled={paid}
      />
    </div>
  );
}
