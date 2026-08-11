import { requireAdminPageCapability } from "@/lib/admin/actor";
import OfferCodeManagement from "../components/OfferCodeManagement";

export default async function AdminOfferCodesPage() {
  await requireAdminPageCapability("marketing:manage");
  return <OfferCodeManagement />;
}
