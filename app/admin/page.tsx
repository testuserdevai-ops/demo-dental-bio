import { redirect } from "next/navigation";
import { requireAdminPageCapability } from "@/lib/admin/actor";
import { parseAdminOverviewFilters } from "@/lib/admin/overview";
import { getAdminOverview } from "@/lib/admin/overview-repository";
import { AdminOverview } from "./_components/AdminOverview";

const Admin = async ({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; plan?: string; domain?: string }>;
}) => {
  const actor = await requireAdminPageCapability("console:security");
  if (actor.role === "security_admin") return redirect("/admin/security");
  await requireAdminPageCapability("console:admin");

  const filters = parseAdminOverviewFilters(await searchParams);
  const overview = await getAdminOverview(filters);
  return <AdminOverview data={overview} />;
};

export default Admin;
