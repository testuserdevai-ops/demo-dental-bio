import { requireAdminPageCapability } from "@/lib/admin/actor";
import UsersManagement from "../components/UsersManagement";

export default async function AdminUsersPage() {
  await requireAdminPageCapability("users:manage");
  return <UsersManagement />;
}
