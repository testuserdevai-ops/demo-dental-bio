"use client";

import { createContext, useContext, useMemo } from "react";
import type { DashboardScope } from "@/lib/dashboard/types";

const DashboardScopeContext = createContext<DashboardScope | undefined>(
  undefined,
);

export function DashboardScopeProvider({
  children,
  scope,
}: {
  children: React.ReactNode;
  scope: DashboardScope;
}) {
  const stableScope = useMemo(
    () =>
      Object.freeze({
        effectiveUserId: scope.effectiveUserId,
        dentistryId: scope.dentistryId,
        username: scope.username,
      }),
    [scope.effectiveUserId, scope.dentistryId, scope.username],
  );
  return (
    <DashboardScopeContext.Provider value={stableScope}>
      {children}
    </DashboardScopeContext.Provider>
  );
}

export function useDashboardScope(): DashboardScope {
  const scope = useContext(DashboardScopeContext);
  if (!scope) {
    throw new Error(
      "useDashboardScope must be used within a DashboardScopeProvider",
    );
  }
  return scope;
}
