import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import PaidUsersManagement from "./components/PaidUsersManagement";

const PaidUsersPage = async () => {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return redirect("/login");
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("username, subscription_status, role")
    .eq("email", authData.user.email)
    .single();

  if (!(userData?.role === "admin")) return redirect("/dashboard");

  return <PaidUsersManagement />;
};

export default PaidUsersPage;
