import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getLinkAggregate } from "./_lib/queries";
import LinksPageClient from "./components/LinksPageClient";
export default async function LinksPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  const { scope } = await resolveDashboardIdentity(userId);
  const data = await getLinkAggregate(scope);
  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Links</h2>
      <IntroText>{featureDescriptions.links}</IntroText>
      <LinksPageClient
        scopeId={scope.effectiveUserId}
        targetHint={userId}
        data={data}
        updatedAt={0}
      />
    </div>
  );
}
