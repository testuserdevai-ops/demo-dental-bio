import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import { VerifyStatus } from "./components";
import { AdminVerificationPanel } from "./components";
import { createClient } from "@/utils/supabase/server";
import { getUserInfo } from "@/utils/userInfo";
import LockMessage from "@/app/components/LockMessage";

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
          {!premiumProAvailable && <LockMessage />}
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