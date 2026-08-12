import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { readOwnerAnalyticsTimezone } from "@/lib/analytics/repository";
import { AnalyticsWorkspace } from "./_components/AnalyticsWorkspace";
import { parseAnalyticsQuery } from "./_lib/query";
import {
  analyticsPlanFromSubscription,
  getOwnerAnalyticsDashboard,
} from "./_lib/repository";

type AnalyticsSearchParams = Record<string, string | string[] | undefined> & {
  userId?: string;
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const params = await searchParams;
  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;
  const identity = await resolveDashboardIdentity(userId);
  const plan = analyticsPlanFromSubscription(identity.shell.subscriptionStatus);
  const timezone = await readOwnerAnalyticsTimezone(
    identity.scope.effectiveUserId,
  );
  const query = parseAnalyticsQuery(params, plan, timezone);
  const model = await getOwnerAnalyticsDashboard(
    identity.scope.effectiveUserId,
    plan,
    query,
  );

  return (
    <AnalyticsWorkspace
      model={model}
      username={identity.scope.username}
      targetUserId={userId}
    />
  );
}
