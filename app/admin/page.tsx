import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UsersManagement from "./components/UsersManagement";
import OfferCodeManagement from "./components/OfferCodeManagement";
import MarketingCampaign from "./components/MarketingCampaign";
import { getAllBrands } from "@/utils/domainConfig";

const Admin = async () => {
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

  if (userData?.role === "security_admin") return redirect("/admin/security");

  if (!(userData?.role === "admin")) return redirect("/dashboard");

  const brands = getAllBrands().map((b) => ({
    domain: b.domain,
    brandName: b.brandName,
  }));

  return (
    <>
      <UsersManagement />
      <OfferCodeManagement />
      <MarketingCampaign brands={brands} />
    </>
  );
};

export default Admin;
