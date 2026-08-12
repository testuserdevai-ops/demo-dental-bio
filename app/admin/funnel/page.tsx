import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getAdminPlatformFunnel } from "@/lib/admin/platform-funnel-repository";
import { parsePlatformFunnelFilters } from "@/lib/admin/platform-funnel";

import { PlatformFunnel } from "./_components/PlatformFunnel";

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    plan?: string;
    domain?: string;
    cohort?: string;
  }>;
}) {
  await requireAdminPageCapability("console:admin");
  const filters = parsePlatformFunnelFilters(await searchParams);
  const funnel = await getAdminPlatformFunnel(filters);
  return <PlatformFunnel data={funnel} />;
}
