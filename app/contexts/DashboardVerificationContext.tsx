"use client";
import { createContext, useContext, useRef } from "react";
import type {
  DashboardShellViewModel,
  DashboardScope,
} from "@/lib/dashboard/types";
type Value = Readonly<{
  scope: DashboardScope;
  shell: DashboardShellViewModel;
  targetUserId: string | null;
}>;
const Context = createContext<Value | undefined>(undefined);
export function DashboardVerificationProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Value;
}) {
  const stable = useRef<Value | null>(null);
  if (!stable.current)
    stable.current = Object.freeze({
      ...value,
      scope: Object.freeze({ ...value.scope }),
      shell: Object.freeze({ ...value.shell }),
    });
  return <Context.Provider value={stable.current}>{children}</Context.Provider>;
}
export function useDashboardVerification() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing dashboard verification provider");
  return value;
}
