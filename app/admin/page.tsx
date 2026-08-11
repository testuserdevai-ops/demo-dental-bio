import { redirect } from "next/navigation";
import { requireAdminPageCapability } from "@/lib/admin/actor";
import { AdminOverview } from "./_components/AdminOverview";

const Admin = async () => {
  const actor = await requireAdminPageCapability("console:security");
  if (actor.role === "security_admin") return redirect("/admin/security");
  await requireAdminPageCapability("console:admin");
  return <AdminOverview />;
};

export default Admin;
