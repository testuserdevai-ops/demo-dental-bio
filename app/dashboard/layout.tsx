import RightPanel from "./components/RightPanel";
import Sidebar from "./components/Sidebar";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import { DashboardUserProvider } from "@/app/contexts/DashboardUserContext";

import "./styles.css";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import MobileNavbar from "./components/MobileNavbar";
import DashboardClientLayout from "./client-layout";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";

export async function generateMetadata() {
  const headersList = headers();
  const domainConfig = getDomainConfig(headersList);

  return {
  title: `Dashboard | ${domainConfig.brandName}`,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

const isSixMonthsOrMore = (userData: any) => {
  const createdAt = new Date(userData.created_at);
  const trialEnd = new Date(userData.trial_end);

  // Calculate the difference in months
  const diffInMonths = (trialEnd.getFullYear() - createdAt.getFullYear()) * 12 +
    (trialEnd.getMonth() - createdAt.getMonth());

  return userData.position === 'Student' && diffInMonths >= 6;
}

const RootLayout = async ({
  children,
  searchParams
}: {
  children: React.ReactNode;
  searchParams: { userId?: string };
}) => {
  const targetUserId = searchParams?.userId;
  const userData = await getAuthorizedUser(targetUserId as string);
  const isMessageStateForStudent = isSixMonthsOrMore(userData)
  
  return (
    <DashboardUserProvider>
      <div className="flex flex-col min-h-screen bg-[#f3f3f1] py-10">
        <div className="flex flex-1 container mx-auto px-4">
          <div className="flex flex-col xxl:flex-row w-full items-center xxl:items-start">
            {/* Sidebar */}
            <div className="w-full md:w-[768px] xxl:w-1/4 order-3 xxl:order-1 mb-3">
              <Sidebar isMessageStateForStudent={isMessageStateForStudent} />
            </div>
            <div className="relative w-full md:w-[768px] xxl:w-1/2 order-1 xxl:order-2 xs:px-2 xsm:px-4 sm:px-12">
              <MobileNavbar />
              <DashboardClientLayout>
                {children}
              </DashboardClientLayout>
            </div>
            <div className="order-2 xxl:order-3">
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
    </DashboardUserProvider>
  );
}

export default RootLayout
