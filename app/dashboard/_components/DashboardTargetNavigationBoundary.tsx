"use client";

import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { dashboardTargetTransitionRequiresDocumentNavigation } from "@/lib/dashboard/target";

export function DashboardTargetNavigationBoundary({
  children,
  initialTargetUserId,
}: {
  children?: ReactNode;
  initialTargetUserId: string | null;
}) {
  const searchParams = useSearchParams();
  const currentTargetUserId = searchParams.get("userId");

  useEffect(() => {
    if (
      dashboardTargetTransitionRequiresDocumentNavigation(
        initialTargetUserId,
        currentTargetUserId,
      )
    ) {
      window.location.assign(window.location.href);
    }
  }, [currentTargetUserId, initialTargetUserId]);

  if (
    dashboardTargetTransitionRequiresDocumentNavigation(
      initialTargetUserId,
      currentTargetUserId,
    )
  ) {
    return null;
  }

  return children;
}
