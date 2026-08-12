import { headers } from "next/headers";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { getDomainConfig } from "@/utils/domainConfig";
import { ShareHub } from "./_components/ShareHub";

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string | string[] }>;
}) {
  const params = await searchParams;
  const userId = Array.isArray(params.userId)
    ? params.userId[0]
    : params.userId;
  const identity = await resolveDashboardIdentity(userId);
  const config = getDomainConfig(await headers());
  const profileUrl = new URL(
    encodeURIComponent(identity.scope.username),
    `${config.baseUrl.replace(/\/$/, "")}/`,
  ).toString();
  return <ShareHub profileUrl={profileUrl} />;
}
