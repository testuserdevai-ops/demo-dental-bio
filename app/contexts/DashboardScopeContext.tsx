"use client";

import { createContext, useContext, useRef } from "react";
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
  const scopeRef = useRef<DashboardScope | null>(null);
  if (!scopeRef.current) {
    scopeRef.current = Object.freeze({ ...scope });
  }
  return (
    <DashboardScopeContext.Provider value={scopeRef.current}>
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
