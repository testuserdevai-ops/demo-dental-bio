import { requireAdminPageCapability } from "@/lib/admin/actor";
import PaidUsersManagement from "./components/PaidUsersManagement";

const PaidUsersPage = async () => {
  await requireAdminPageCapability("billing:read");

  return <PaidUsersManagement />;
};

export default PaidUsersPage;
