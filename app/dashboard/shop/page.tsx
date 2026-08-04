import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { featureDescriptions } from "@/utils/global_constants";
import { ProductClient } from "./_components/ProductManager";
import { getProductAggregate } from "./_lib/queries";

const Product = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { scope, shell } = await resolveDashboardIdentity(targetUserId);
  const data = await getProductAggregate(scope);
  const proAvailable =
    ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
    Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Shop</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.shop}</IntroText>
      <ProductClient
        scopeId={scope.effectiveUserId}
        targetHint={targetUserId}
        data={data}
        updatedAt={0}
        enabled={proAvailable}
      />
    </div>
  );
};

export default Product;
