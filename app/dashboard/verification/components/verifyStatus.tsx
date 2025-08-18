'use client'

import Loading from "@/app/dashboard/loading";
import { useEffect, useState, useCallback } from "react";
import { SealCheck } from "@phosphor-icons/react";
import { redirect, useSearchParams } from "next/navigation";
import { usePreview } from "@/app/contexts/PreviewContext";
import { isWithinSevenDays } from "@/utils/functions/isWithinSevenDays";
import { sendVerificationMail } from "@/utils/mails/sendVerificationMail";
import VerificationStatusContent from "./VerificationStatusContent";

type SessionType = "pending" | "approved" | "declined" | "not_started";

type VerifyStatusProps = {
  enabled: boolean;
}

const VerifyStatus: React.FC<VerifyStatusProps> = ({ enabled }) => {
  const [userData, setUserData] = useState<UserType | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionType | null>(null);
  const { triggerReload } = usePreview();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const fetchUserData = useCallback(async () => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        body: JSON.stringify({ targetUserId })
      });
      const data = await response.json();

      if (!data) {
        return redirect("/error?message=user_not_found");
      }

      if (data.isVerified) {
        setSessionStatus("approved");
      } else if (data.session_id) {
        if (isWithinSevenDays(new Date(data.session_created_at))) {
          const response = await fetch(`/api/veriff/session-status?sessionId=${data.session_id}`);
          const { status } = await response.json();
          
          if (status === "approved") {
            await sendVerificationMail(data.email!, data.username!, data.first_name!);
            triggerReload();
          }
          setSessionStatus(status);
        } else {
          setSessionStatus("declined");
        }
      } else {
        setSessionStatus("not_started");
      }

      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle error appropriately
    }
  }, [targetUserId, triggerReload]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  if (!userData || !sessionStatus) {
    return <Loading />;
  }

  return (
    <div className="">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="mb-0">
          {userData.isVerified ? "Your account is verified" : "Identity verification"}
        </h4>
        {sessionStatus === "approved" && (
          <SealCheck size={16} weight="fill" color="#49ADF4" />
        )}
      </div>

      <VerificationStatusContent 
        sessionStatus={sessionStatus} 
        enabled={enabled} 
      />
    </div>
  );
}

export default VerifyStatus;