import React from "react";
import ManageBlogGroups from "./ManageBlogGroups";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

const Blog = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { username, subscriptionStatus, isAdmin, userId } =
    await getAuthorizedUser(targetUserId as string);
  const proAvailable = ["PRO", "PREMIUM PRO"].includes(
    subscriptionStatus ?? "",
  );

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Blogs</h2>
      <IntroText>{featureDescriptions.blogs}</IntroText>
      {!proAvailable && <LockMessage />}
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable && (
          <div className="absolute w-full h-full top-0 left-0 z-10" />
        )}
        <ManageBlogGroups
          username={username}
          targetUserId={isAdmin ? userId : null}
          enabled={proAvailable}
        />
      </div>
    </div>
  );
};

export default Blog;
