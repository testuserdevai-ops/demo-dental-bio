import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

export async function getAuthorizedUser(targetUserId: string) {
  const supabase = await createClient();

  const userId = await getEffectiveUserId({
    supabase,
    targetUserId,
  });

  const { data: userData } = await supabase
    .from("users")
    .select("username, subscription_status, created_at, trial_end, position")
    .eq("id", userId)
    .single();

  if (!userData) return redirect("/dashboard");

  return {
    userId,
    username: userData.username,
    subscriptionStatus: userData.subscription_status,
    isAdmin: userId === targetUserId,
    position: userData.position,
    trial_end: userData.trial_end,
    created_at: userData.created_at
  };
}
