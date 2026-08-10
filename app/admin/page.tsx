import { redirect } from "next/navigation";
import { requireAdminPageCapability } from "@/lib/admin/actor";
import UsersManagement from "./components/UsersManagement";
import OfferCodeManagement from "./components/OfferCodeManagement";
import MarketingCampaign from "./components/MarketingCampaign";
import { getAllBrands } from "@/utils/domainConfig";

const Admin = async () => {
  const actor = await requireAdminPageCapability("console:security");
  if (actor.role === "security_admin") return redirect("/admin/security");
  await requireAdminPageCapability("console:admin");

  const brands = getAllBrands().map((b) => ({
    domain: b.domain,
    brandName: b.brandName,
  }));

  return (
    <>
      <UsersManagement />
      <OfferCodeManagement />
      <MarketingCampaign brands={brands} />
    </>
  );
};

export default Admin;
