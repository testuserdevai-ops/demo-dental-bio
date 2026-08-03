"use client";

import Loading from "@/app/dashboard/loading";
import { useEffect, useState, useCallback } from "react";
import { SealCheckIcon } from "@phosphor-icons/react";
import { redirect, useSearchParams } from "next/navigation";
import { usePreview } from "@/app/contexts/PreviewContext";
import VerificationStatusContent from "./VerificationStatusContent";
import { useDashboardUser } from "@/app/contexts/DashboardUserContext";

type SessionType = "pending" | "approved" | "declined" | "not_started";

type VerifyStatusProps = {
  enabled: boolean;
};

const VerifyStatus: React.FC<VerifyStatusProps> = ({ enabled }) => {
  const [userData, setUserData] = useState<UserType | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionType | null>(null);
  const { triggerReload } = usePreview();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const { user, loading } = useDashboardUser();

  const fetchUserData = useCallback(async () => {
    try {
      if (!user) return redirect("/error?message=user_not_found");
      const data: any = user;
      if (data.isVerified) {
        setSessionStatus("approved");
      } else {
        setSessionStatus("not_started");
      }
      setUserData(data);
    } catch (error) {
      console.error("Error deriving verification status:", error);
    }
  }, [user, triggerReload]);

  useEffect(() => {
    if (loading) return;
    fetchUserData();
  }, [fetchUserData, loading]);

  if (!userData || !sessionStatus) {
    return <Loading />;
  }

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
