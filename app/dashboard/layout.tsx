import RightPanel from "./components/RightPanel";
import Sidebar from "./components/Sidebar";
import { DashboardScopeProvider } from "@/app/contexts/DashboardScopeContext";

import "./styles.css";
import "./globals.css";
import MobileNavbar from "./components/MobileNavbar";
import { DashboardQueryProvider } from "./_components/DashboardQueryProvider";
import { getDomainConfig } from "@/utils/domainConfig";
import { headers } from "next/headers";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { redirect } from "next/navigation";
import {
  dashboardTargetHint,
  DASHBOARD_TARGET_HEADER,
} from "@/lib/dashboard/target";
import { DashboardVerificationProvider } from "@/app/contexts/DashboardVerificationContext";
import { DashboardTargetNavigationBoundary } from "./_components/DashboardTargetNavigationBoundary";

export async function generateMetadata() {
  const headersList = await headers();
  const domainConfig = getDomainConfig(headersList);

  return {
    title: `Dashboard | ${domainConfig.brandName}`,
    metadataBase: new URL(domainConfig.baseUrl),
  };
}

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const headersList = await headers();
  const targetUserId = dashboardTargetHint(
    headersList.get(DASHBOARD_TARGET_HEADER),
  );
  let identity;
  try {
    identity = await resolveDashboardIdentity(targetUserId);
  } catch {
    redirect("/login");
  }

  return (
    <DashboardScopeProvider scope={identity.scope}>
      <DashboardTargetNavigationBoundary initialTargetUserId={targetUserId}>
        <div className="flex flex-col min-h-screen bg-surface py-10">
          <div className="flex flex-1 container mx-auto px-4">
            <div className="flex min-w-0 flex-col xxl:flex-row w-full items-center xxl:items-start">
              {/* Sidebar */}
              <div className="w-full md:w-[768px] xxl:w-1/4 order-3 xxl:order-1 mb-3">
                <Sidebar shell={identity.shell} />
              </div>
              <div className="relative min-w-0 max-w-full w-full md:w-[768px] xxl:w-1/2 order-1 xxl:order-2 xs:px-2 xsm:px-4 sm:px-12">
                <MobileNavbar shell={identity.shell} />
                <DashboardVerificationProvider
                  value={{
                    scope: identity.scope,
                    shell: identity.shell,
                    targetUserId,
                  }}
                >
                  <DashboardQueryProvider>{children}</DashboardQueryProvider>
                </DashboardVerificationProvider>
              </div>
              <div className="order-2 xxl:order-3">
                <RightPanel
                  username={identity.scope.username}
                  shell={identity.shell}
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardTargetNavigationBoundary>
    </DashboardScopeProvider>
  );
};

export default RootLayout;
