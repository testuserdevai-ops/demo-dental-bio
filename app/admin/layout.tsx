import "../globals.css";
import { getDomainConfig } from "@/utils/domainConfig";

export async function generateMetadata() {
  const domainConfig = getDomainConfig();
  return {
    title: `Admin | ${domainConfig.brandName}`,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="py-10 bg-gray-100">
      <div className="max-w-[1400px] mx-auto min-h-[100vh] bg-gray-100">
        {children}
      </div>
    </div>
  );
}
