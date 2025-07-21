import VerifyStatus from "./components/verifyStatus";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import Link from "next/link";

const Verification = async ({ searchParams }: { searchParams: { userId?: string } }) => {
  const targetUserId = searchParams.userId;
  const { subscriptionStatus, isMessageStateForStudent } = await getAuthorizedUser(targetUserId as string);
  const premiumProAvailable = subscriptionStatus === "PREMIUM PRO" || subscriptionStatus === "PRO";

  return (
    <div>
      {!premiumProAvailable &&
        <Link
          href={"/upgrade"}
          target="_blank"
          className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4 no-underline"
        >
          <LockSimple size={22} />
          Upgrade your membership to unlock this feature
        </Link>
      }
      <div className={`${premiumProAvailable ? "" : "relative opacity-40"}`}>
        {!premiumProAvailable &&
          <div className="absolute w-full h-full top-0 left-0 z-10" />}
        {/* {isMessageStateForStudent &&
          <div className="flex justify-center gap-2 text-center bg-[#F7FAFC] p-2 rounded-[26px] text-gray-500 font-semibold my-4">
            Congrulates! You have unlocked pro plan for 6 months!
          </div>
        } */}
        <VerifyStatus enabled={premiumProAvailable} />
      </div>
    </div>
  );
}

export default Verification;