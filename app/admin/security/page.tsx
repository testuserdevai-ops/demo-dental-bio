import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SecurityLogs from "./components/SecurityLogs";
import BlockedFingerprintsManagement from "../components/BlockedFingerprintsManagement";
import BlockedIpsManagement from "../components/BlockedIpsManagement";
import BlockedUsersManagement from "../components/BlockedUsersManagement";

const SecurityPage = async () => {
  const supabase = createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("email", authData.user.email)
    .single();

  if (!(userData?.role === "admin"))
    return redirect("/dashboard");

  return (
    <>
      <div className="p-8 max-w-[1400px] mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary-1 transition-colors mb-4"
        >
          &larr; Back to Admin
        </Link>
      </div>
      <SecurityLogs />
      <BlockedUsersManagement />
      <BlockedFingerprintsManagement />
      <BlockedIpsManagement />
    </>
  );
};

export default SecurityPage;
