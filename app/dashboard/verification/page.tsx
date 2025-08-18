import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import { VerifyStatus } from "./components";
import { AdminVerificationPanel } from "./components";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/userInfo";

const Verification = async ({ searchParams }: { searchParams: { userId?: string } }) => {
  const targetUserId = searchParams.userId;
  const { subscriptionStatus } = await getAuthorizedUser(targetUserId as string);
  const premiumProAvailable = subscriptionStatus === "PREMIUM PRO" || subscriptionStatus === "PRO";

  // Determine if the current user is an admin managing someone else's profile
  const supabase = createClient();
  const currentUser = await getUserInfo({ supabase });
  const isAdminManagingOther = Boolean(
    currentUser?.role === "admin" && targetUserId && targetUserId !== currentUser?.id
  );

  return (
    <div>
      {isAdminManagingOther ? (
        <div className="mb-6">
          <AdminVerificationPanel targetUserId={targetUserId!} />
        </div>
      ) : (
        <>
          {!premiumProAvailable && (
            <Link
              href={"/upgrade"}
              target="_blank"
              className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4 no-underline"
            >
              <LockSimpleIcon size={22} />
              Upgrade your membership to unlock this feature
            </Link>
          )}
          <div className={`${premiumProAvailable ? "" : "relative opacity-40"}`}>
            {!premiumProAvailable && <div className="absolute w-full h-full top-0 left-0 z-10" />}
            <VerifyStatus enabled={premiumProAvailable} />
          </div>
        </>
      )}
    </div>
  );
};

export default Verification;