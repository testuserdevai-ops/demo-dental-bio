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
    <div className="mb-3 w-full min-w-0 max-w-full">
      <CopyButton username={username} />
      <RightPanelClient username={username} shell={shell} />
    </div>
  );
};

export default RightPanel;
