import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export const getEffectiveUserId = async ({ targetUserId, supabase }: { targetUserId?: string | null, supabase: SupabaseClient }) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    return redirect("/login");
  }

  const email = authData.user.email;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, subscription_status, current_period_end, trial_end')
    .eq('email', email)
    .single();

  if (error) throw new Error('Error fetching user data');

  if (!targetUserId)
    return user?.id;

  if (targetUserId && user.role !== 'admin')
    return null;

  const { data: targetUser, error: targetUserFetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', targetUserId)

  if (targetUserFetchError) throw new Error('Error fetching user data');

  if (targetUser)
    return targetUserId;

  return user.id;
};