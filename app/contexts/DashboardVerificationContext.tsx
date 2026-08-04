"use client";
import { createContext, useContext, useMemo } from "react";
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
  const stable = useMemo(
    () =>
      Object.freeze({
        scope: Object.freeze({
          effectiveUserId: value.scope.effectiveUserId,
          dentistryId: value.scope.dentistryId,
          username: value.scope.username,
          canManageSubscription: value.scope.canManageSubscription,
        }),
        shell: Object.freeze({
          subscriptionStatus: value.shell.subscriptionStatus,
          isVerified: value.shell.isVerified,
          useDentalBrand: value.shell.useDentalBrand,
          position: value.shell.position,
          createdAt: value.shell.createdAt,
          trialEnd: value.shell.trialEnd,
          currentPeriodEnd: value.shell.currentPeriodEnd,
        }),
        targetUserId: value.targetUserId,
      }),
    [
      value.scope.effectiveUserId,
      value.scope.dentistryId,
      value.scope.username,
      value.scope.canManageSubscription,
      value.shell.subscriptionStatus,
      value.shell.isVerified,
      value.shell.useDentalBrand,
      value.shell.position,
      value.shell.createdAt,
      value.shell.trialEnd,
      value.shell.currentPeriodEnd,
      value.targetUserId,
    ],
  );
  return <Context.Provider value={stable}>{children}</Context.Provider>;
}
export function useDashboardVerification() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing dashboard verification provider");
  return value;
}
