import RightPanel from "./components/RightPanel";
import Sidebar from "./components/Sidebar";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";

import "./styles.css";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export const metadata = {
  title: "Dashboard | Dentalbio",
};

const RootLayout = async ({
  children,
  searchParams
}: {
  children: React.ReactNode;
  searchParams: { userId?: string };
}) => {
  const targetUserId = searchParams?.userId;
  const { isMessageStateForStudent } = await getAuthorizedUser(targetUserId as string);
  return (
    <div className="flex flex-col min-h-screen bg-[#f3f3f1] py-10">
      <div className="flex flex-1 container mx-auto px-4">
        <div className="flex flex-col xxl:flex-row w-full items-center xxl:items-start">
          {/* Sidebar */}
          <div className="w-full md:w-[768px] xxl:w-1/4 mb-3">
            <Sidebar isMessageStateForStudent={isMessageStateForStudent} />
          </div>
          <div className="relative w-full md:w-[768px] xxl:w-1/2 xs:px-2 xsm:px-4 sm:px-12">{children}</div>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export default RootLayout