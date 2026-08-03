"use server";

import {
  createClient,
  redirect,
  revalidatePath,
} from "@/app/admin-login/server-dependencies";
import { loginSchema } from "@/lib/auth/schemas";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";

const ADMIN_ACCESS_DENIED = "Unable to sign in to this account.";

export async function login(formData: FormData): Promise<ActionResult<never>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return zodActionError(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return actionError("AUTH_FAILED", ADMIN_ACCESS_DENIED);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    return actionError("ADMIN_ACCESS_DENIED", ADMIN_ACCESS_DENIED);
  }

  const { data: userData, error: roleError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = !roleError && userData?.role === "admin";

  if (isAdmin) {
    revalidatePath("/", "layout");
    redirect("/admin");
  }

  await supabase.auth.signOut();
  return actionError("ADMIN_ACCESS_DENIED", ADMIN_ACCESS_DENIED);
}
