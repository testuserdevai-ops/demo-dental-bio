import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UsersManagement from './components/UsersManagement';
import OfferCodeManagement from './components/OfferCodeManagement';
import BlockedFingerprintsManagement from './components/BlockedFingerprintsManagement';
import BlockedIpsManagement from './components/BlockedIpsManagement';

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

  if (!(userData?.role === "admin"))
    return redirect("/dashboard");

  return (
    <>
      <UsersManagement />
      <BlockedFingerprintsManagement />
      <BlockedIpsManagement />
      <OfferCodeManagement />
    </>
  );
};

export default Admin;
