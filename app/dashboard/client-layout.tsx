"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const supabase = createClient();
  const targetUserId = searchParams.get("userId");

  useEffect(() => {
    if (searchParams.toString()) {
      const checkIfUserIdIsValid = async () => {
        const userId = await getEffectiveUserId({ targetUserId, supabase });

        if (targetUserId && targetUserId !== userId) router.replace(pathname);
      };

      checkIfUserIdIsValid();
    }
  }, [searchParams, pathname, router]);

  return <>{children}</>;
}
