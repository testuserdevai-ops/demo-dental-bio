import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function deleteAuthUserForAdmin(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error("Auth user deletion failed", { cause: error });
}
