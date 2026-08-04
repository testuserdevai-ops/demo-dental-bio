import { requireAdminPageCapability } from "@/lib/admin/actor";
import SecurityDashboard from "./components/SecurityDashboard";

const SecurityPage = async () => {
  const actor = await requireAdminPageCapability("console:security");
  return <SecurityDashboard role={actor.role} />;
};

export default SecurityPage;
