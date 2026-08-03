import React from "react";
import ManageVideoGroups from "./ManageVideoGroups";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

const Video = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { userId, subscriptionStatus, isAdmin } = await getAuthorizedUser(
    targetUserId as string,
  );
  const proAvailable = ["PRO", "PREMIUM PRO"].includes(subscriptionStatus);

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Videos</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.videos}</IntroText>
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable && (
          <div className="absolute w-full h-full top-0 left-0 z-10" />
        )}
        <ManageVideoGroups
          targetUserId={isAdmin ? userId : undefined}
          enabled={proAvailable}
        />
      </div>
    </div>
  );
};

export default Video;
