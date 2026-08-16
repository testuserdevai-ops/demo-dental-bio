import { headers } from "next/headers";
import "../globals.css";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { requireAdminPageCapability } from "@/lib/admin/actor";
import { getDomainConfig } from "@/utils/domainConfig";
import { AdminNavigation } from "./_components/AdminNavigation";

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
  const actor = await requireAdminPageCapability("console:security");

  return (
    <TooltipProvider
      delayDuration={300}
      disableHoverableContent
      skipDelayDuration={100}
    >
      <div className="min-h-screen bg-background lg:flex">
        <a
          href="#admin-main"
          className="sr-only z-50 rounded-md bg-card p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to admin content
        </a>
        <AdminNavigation role={actor.role} />
        <main id="admin-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
