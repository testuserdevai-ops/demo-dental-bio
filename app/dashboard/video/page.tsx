import React from "react"
import ManageVideoGroups from "./ManageVideoGroups";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import LockMessage from "@/app/components/LockMessage";

const Video = async ({ searchParams }: { searchParams: { userId?: string } }) => {
  const targetUserId = searchParams.userId;
  const { userId, subscriptionStatus, isAdmin } = await getAuthorizedUser(targetUserId as string);
  const proAvailable = ["PRO", "PREMIUM PRO"].includes(subscriptionStatus);

  return (
    <div>
      {!proAvailable && <LockMessage />}
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable &&
          <div className="absolute w-full h-full top-0 left-0 z-10" />}
        <ManageVideoGroups targetUserId={isAdmin ? userId : undefined} enabled={proAvailable} />
      </div>
    </div>
  )
}

export default Video