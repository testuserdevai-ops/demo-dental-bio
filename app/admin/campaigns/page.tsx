import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getAllBrands } from "@/utils/domainConfig";
import MarketingCampaign from "../components/MarketingCampaign";

export default async function AdminCampaignsPage() {
  await requireAdminPageCapability("marketing:manage");
  const brands = getAllBrands().map(({ domain, brandName }) => ({
    domain,
    brandName,
  }));
  return <MarketingCampaign brands={brands} />;
}
