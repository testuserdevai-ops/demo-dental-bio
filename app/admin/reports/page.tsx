import { requireAdminPageCapability } from "@/lib/admin/actor";
import { ReportsManagement } from "./_components/ReportsManagement";

export default async function ReportsPage() {
  const actor = await requireAdminPageCapability("reports:moderate");
  return <ReportsManagement currentActorId={actor.id} />;
}
