import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SecurityDashboard from "./components/SecurityDashboard";

const SecurityPage = async () => {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) return redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("email", authData.user.email)
    .single();

  if (userData?.role !== "admin" && userData?.role !== "security_admin")
    return redirect("/dashboard");

  return <SecurityDashboard role={userData.role} />;
};

export default SecurityPage;
