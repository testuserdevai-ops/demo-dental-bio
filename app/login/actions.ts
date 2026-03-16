"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { isBlockedFingerprint, storeDeviceFingerprint } from "@/utils/blockedFingerprints";

export async function login(formData: FormData) {
  const supabase = createClient();
  const deviceFingerprint = formData.get("deviceFingerprint") as string | null;

  // Silently block login from blocked device fingerprints
  // Return generic error so the user doesn't know they're blocked
  const fingerprintBlocked = await isBlockedFingerprint(deviceFingerprint);
  if (fingerprintBlocked) {
    return { error: "Invalid login credentials" };
  }

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // Instead of redirecting, return the error message
    return { error: error.message };
  }

  // Store/update device fingerprint for the logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (user && deviceFingerprint) {
    await storeDeviceFingerprint(user.id, deviceFingerprint);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}