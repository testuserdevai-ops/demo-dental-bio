"use client";

import { SealCheckIcon } from "@phosphor-icons/react";
import VerificationStatusContent from "./VerificationStatusContent";

type SessionType = "pending" | "approved" | "declined" | "not_started";

type VerifyStatusProps = {
  enabled: boolean;
  isVerified: boolean;
};

const VerifyStatus: React.FC<VerifyStatusProps> = ({ enabled, isVerified }) => {
  const sessionStatus: SessionType = isVerified ? "approved" : "not_started";

  return (
    <div className="py-4">
      <div className="flex items-center gap-2">
        {sessionStatus === "approved" && (
          <SealCheckIcon size={16} weight="fill" color="#49ADF4" />
        )}
      </div>

      <VerificationStatusContent
        sessionStatus={sessionStatus}
        enabled={enabled}
      />
    </div>
  );
};

export default VerifyStatus;
