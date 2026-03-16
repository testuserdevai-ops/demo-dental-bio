"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import { isBlockedFingerprint, storeDeviceFingerprint } from "@/utils/blockedFingerprints";
import { isBlockedIp, storeUserIp } from "@/utils/blockedIps";

export async function login(formData: FormData) {
  const supabase = createClient();
  const deviceFingerprint = formData.get("deviceFingerprint") as string | null;

  // Get client IP from headers (server action context)
  const headersList = headers();
  const forwarded = headersList.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : headersList.get("x-real-ip");

  // Silently block login from blocked device fingerprints or IPs
  // Return generic error so the user doesn't know they're blocked
  const [fingerprintBlocked, ipBlocked] = await Promise.all([
    isBlockedFingerprint(deviceFingerprint),
    isBlockedIp(clientIp),
  ]);
  if (fingerprintBlocked || ipBlocked) {
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

  // Store/update device fingerprint and IP for the logged-in user
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await Promise.all([
      storeDeviceFingerprint(user.id, deviceFingerprint),
      storeUserIp(user.id, clientIp),
    ]);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}