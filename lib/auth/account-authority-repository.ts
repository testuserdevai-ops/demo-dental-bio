import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getUserBlockedStatusById(
  userId: string,
): Promise<boolean | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_blocked")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Account authority read failed", { cause: error });
  }

  return data?.is_blocked ?? null;
}

export async function deleteAuthUserById(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error("Auth user deletion failed", { cause: error });
  }
}
