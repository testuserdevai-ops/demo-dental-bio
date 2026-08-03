import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "../globals.css";
import { getDomainConfig } from "@/utils/domainConfig";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata() {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);
  return {
    title: `Admin | ${domainConfig.brandName}`,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "admin" && userData?.role !== "security_admin") {
    return redirect("/dashboard");
  }

  return (
    <div className="py-10 bg-gray-100">
      <div className="max-w-[1400px] mx-auto min-h-[100vh] bg-gray-100">
        {children}
      </div>
    </div>
  );
}
