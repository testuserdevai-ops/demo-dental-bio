import React from "react";
import ManageIndividualProducts from "./components/ManageIndividualProducts";
import { getAuthorizedUser } from "@/utils/user/getAuthorizedUser";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";

const Product = async ({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) => {
  const { userId: targetUserId } = await searchParams;
  const { userId, subscriptionStatus, isAdmin } = await getAuthorizedUser(
    targetUserId as string,
  );
  const proAvailable = ["PRO", "PREMIUM PRO"].includes(
    subscriptionStatus ?? "",
  );

  return (
    <div className="flex-col-gap">
      <h2 className="text-xl font-semibold text-dark">Shop</h2>
      {!proAvailable && <LockMessage />}
      <IntroText>{featureDescriptions.shop}</IntroText>
      <div className={`${proAvailable ? "" : "relative opacity-40"}`}>
        {!proAvailable && (
          <div className="absolute w-full h-full top-0 left-0 z-10" />
        )}
        <ManageIndividualProducts
          targetUserId={isAdmin ? userId : null}
          enabled={proAvailable}
        />
      </div>
    </div>
  );
};

export default Product;
