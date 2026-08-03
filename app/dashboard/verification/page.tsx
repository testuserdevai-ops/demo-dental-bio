"use client";

import { VerifyStatus } from "./components";
import { AdminVerificationPanel } from "./components";
import LockMessage from "@/app/components/LockMessage";
import IntroText from "@/app/components/IntroText";
import { featureDescriptions } from "@/utils/global_constants";
import { useDashboardVerification } from "@/app/contexts/DashboardVerificationContext";

const Verification = () => {
  const { shell, targetUserId } = useDashboardVerification();
  const { subscriptionStatus, isVerified } = shell;
  const premiumProAvailable =
    subscriptionStatus === "PREMIUM PRO" || subscriptionStatus === "PRO";

  return (
    <div>
      {targetUserId ? (
        <div className="mb-6">
          <AdminVerificationPanel targetUserId={targetUserId} />
        </div>
      ) : (
        <div className="flex-col-gap">
          <h2 className="text-xl font-semibold text-dark">
            Identity verification
          </h2>
          {!premiumProAvailable && <LockMessage />}
          <IntroText>{featureDescriptions.verification}</IntroText>
          <div
            className={`${premiumProAvailable ? "" : "relative opacity-40"}`}
          >
            {!premiumProAvailable && (
              <div className="absolute w-full h-full top-0 left-0 z-10" />
            )}
            <VerifyStatus
              enabled={premiumProAvailable}
              isVerified={isVerified}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Verification;
