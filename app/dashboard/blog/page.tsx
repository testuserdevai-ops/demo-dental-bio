import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { featureDescriptions } from "@/utils/global_constants";
import { BlogClient } from "./_components/BlogManager";
import { getBlogAggregate } from "./_lib/queries";

const Blog = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { scope, shell } = await resolveDashboardIdentity(targetUserId);
  const data = await getBlogAggregate(scope);
  const proAvailable =
    ["PRO", "PREMIUM PRO"].includes(shell.subscriptionStatus ?? "") ||
    Boolean(shell.trialEnd && new Date(shell.trialEnd) > new Date());

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Blogs</h2>
      <IntroText>{featureDescriptions.blogs}</IntroText>
      {!proAvailable && <LockMessage />}
      <BlogClient
        scopeId={scope.effectiveUserId}
        targetHint={targetUserId}
        data={data}
        updatedAt={0}
        enabled={proAvailable}
      />
    </div>
  );
};

export default Blog;
