import RightPanel from "./components/RightPanel";
import Sidebar from "./components/Sidebar";
import { DashboardUserProvider } from "@/app/contexts/DashboardUserContext";

import "./styles.css";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import MobileNavbar from "./components/MobileNavbar";
import DashboardClientLayout from "./client-layout";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";

export async function generateMetadata() {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  return {
    title: `Dashboard | ${domainConfig.brandName}`,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <DashboardUserProvider>
      <div className="flex flex-col min-h-screen bg-surface py-10">
        <div className="flex flex-1 container mx-auto px-4">
          <div className="flex flex-col xxl:flex-row w-full items-center xxl:items-start">
            {/* Sidebar */}
            <div className="w-full md:w-[768px] xxl:w-1/4 order-3 xxl:order-1 mb-3">
              <Sidebar />
            </div>
            <div className="relative w-full md:w-[768px] xxl:w-1/2 order-1 xxl:order-2 xs:px-2 xsm:px-4 sm:px-12">
              <MobileNavbar />
              <DashboardClientLayout>{children}</DashboardClientLayout>
            </div>
            <div className="order-2 xxl:order-3">
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
    </DashboardUserProvider>
  );
};

export default RootLayout;
