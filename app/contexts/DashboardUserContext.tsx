"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DashboardUser = {
  id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  subscription_status?: string;
  trial_end?: string;
  current_period_end?: string;
  session_id?: string;
  session_created_at?: string;
  isVerified?: boolean;
  use_dental_brand?: boolean;
  [key: string]: any;
} | null;

type DashboardUserContextValue = {
  user: DashboardUser;
  setUser: React.Dispatch<React.SetStateAction<DashboardUser>>;
  loading: boolean;
};

const DashboardUserContext = createContext<DashboardUserContextValue | undefined>(undefined);

export function DashboardUserProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetUserId = searchParams.get("userId");

  const [user, setUser] = useState<DashboardUser>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user", {
          method: "POST",
          body: JSON.stringify({ targetUserId })
        });
        const data = await response.json();
        if (!data || data.error) {
          router.push("/error?message=user_not_found");
          return;
        }
        if (isActive) setUser(data);
      } catch (error) {
        console.error("Failed to load dashboard user:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchUser();
    return () => {
      isActive = false;
    };
  }, [targetUserId, router]);

  const value = useMemo(() => ({ user, setUser, loading }), [user, loading]);

  return (
    <DashboardUserContext.Provider value={value}>{children}</DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  const ctx = useContext(DashboardUserContext);
  if (!ctx) throw new Error("useDashboardUser must be used within a DashboardUserProvider");
  return ctx;
}


