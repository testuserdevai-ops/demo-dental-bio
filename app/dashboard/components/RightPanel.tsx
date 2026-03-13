"use client";
import React, { useEffect, useState } from "react";
import CopyButton from "./CopyButton";
import RightPanelClient from "./RightPanelClient";
import { useRouter } from "next/navigation";
import { usePreview } from "@/app/contexts/PreviewContext";
import { useDashboardUser } from "@/app/contexts/DashboardUserContext";

const RightPanel: React.FC = () => {
  const [username, setUsername] = useState("");
  const router = useRouter();
  const { reloadKey } = usePreview();
  const { user, loading } = useDashboardUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      return router.push("/error?message=user_not_found");
    }
    setUsername(user.username as string);
  }, [reloadKey, user, loading, router]);

  // No direct calls; username is sourced from DashboardUserContext

  return (
    <div className="col-xl-3 col-12 mb-3">
      <CopyButton username={username} />
      <RightPanelClient username={username} />
    </div>
  );
};

export default RightPanel;
