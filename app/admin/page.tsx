import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UsersManagement from './components/UsersManagement';
import OfferCodeManagement from './components/OfferCodeManagement';

const Admin = async () => {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return redirect("/login");
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username, subscription_status, role")
    .eq("email", authData.user.email)
    .single();

  if (userData?.role === "security_admin")
    return redirect("/admin/security");

  if (!(userData?.role === "admin"))
    return redirect("/dashboard");

  return (
    <>
      <UsersManagement />
      <OfferCodeManagement />
    </>
  );
};

export default Admin;
