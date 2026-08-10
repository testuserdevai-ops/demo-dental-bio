import { headers } from "next/headers";
import "../globals.css";
import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getDomainConfig } from "@/utils/domainConfig";

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
  await requireAdminPageCapability("console:security");

  return (
    <div className="py-10 bg-gray-100">
      <div className="max-w-[1400px] mx-auto min-h-[100vh] bg-gray-100">
        {children}
      </div>
    </div>
  );
}
