import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getAllBrands } from "@/utils/domainConfig";
import MarketingCampaign from "../components/MarketingCampaign";

export default async function AdminCampaignsPage() {
  await requireAdminPageCapability("marketing:manage");
  const brands = getAllBrands().map(({ domain, brandName }) => ({
    domain,
    brandName,
  }));
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Email Marketing
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Compose a branded campaign, validate its recipient list, and review
          the final message before authorizing delivery.
        </p>
      </header>
      <MarketingCampaign brands={brands} />
    </div>
  );
}
