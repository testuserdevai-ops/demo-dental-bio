import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { Database } from "@/lib/supabase/database.types";

export const getEffectiveUserId = async ({
  targetUserId,
  supabase,
}: {
  targetUserId?: string | null;
  supabase: SupabaseClient<Database>;
}) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return redirect("/login");
  }

  const authUserId = authData.user.id;

  // Try to fetch the user from the public.users table by id
  let { data: user, error } = await supabase
    .from("users")
    .select("id, role, subscription_status, current_period_end, trial_end")
    .eq("id", authUserId)
    .single();

  if (error) {
    return redirect("/login");
  }

  if (!user) {
    return redirect("/login");
  }

  if (!targetUserId) return user.id;

  // Non-admins cannot access other users' data — redirect to their own dashboard
  if (targetUserId && user.role !== "admin") return redirect("/dashboard");

  const { data: targetUser, error: targetUserFetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", targetUserId)
    .single();

  if (targetUserFetchError && targetUserFetchError.code !== "PGRST116")
    throw new Error("Error fetching user data");

  if (targetUser) return targetUserId;

  return user.id;
};
