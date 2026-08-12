"use client";
import React from "react";
import CopyButton from "./CopyButton";
import RightPanelClient from "./RightPanelClient";
import type { DashboardShellViewModel } from "@/lib/dashboard/types";
import { usePathname } from "next/navigation";

const RightPanel: React.FC<{
  username: string;
  shell: DashboardShellViewModel;
}> = ({ username, shell }) => {
  const pathname = usePathname();
  if (pathname === "/dashboard/analytics") return null;

  return (
    <div className="col-xl-3 col-12 mb-3">
      <CopyButton username={username} />
      <RightPanelClient username={username} shell={shell} />
    </div>
  );
};

export default RightPanel;
