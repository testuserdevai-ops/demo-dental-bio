"use server";

import {
  createClient,
  redirect,
} from "@/app/register/email-success/server-dependencies";
import { loginSchema } from "@/lib/auth/schemas";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";

const INVALID_CREDENTIALS = "Unable to sign in with those credentials.";

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
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }

  redirect("/dashboard");
}
