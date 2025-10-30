import React from "react"
import ManageGalleries from "./ManageGalleries"
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import LockMessage from "@/app/components/LockMessage";

const Gallery = async ({ searchParams }: { searchParams: { userId?: string } }) => {
  const targetUserId = searchParams.userId;
  const { subscriptionStatus, isAdmin, userId, isMessageStateForStudent } = await getAuthorizedUser(targetUserId as string);
  const proAvailable = ["PRO", "PREMIUM PRO"].includes(subscriptionStatus);

  return (
    <div>
      {!proAvailable && <LockMessage />}
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable &&
          <div className="absolute w-full h-full top-0 left-0 z-10" />}
        <ManageGalleries targetUserId={isAdmin ? userId : undefined} enabled={proAvailable} />
      </div>
    </div>
  )
}

export default Gallery