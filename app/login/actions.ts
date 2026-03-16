"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/supabaseAdmin";
import { isBlockedFingerprint, storeDeviceFingerprint } from "@/utils/blockedFingerprints";
import { isBlockedIp, storeUserIp } from "@/utils/blockedIps";
import { logSecurityEvent } from "@/utils/securityLogger";

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
    const email = formData.get("email") as string;
    if (fingerprintBlocked) {
      logSecurityEvent({
        event_type: 'blocked_fingerprint',
        email, route: '/login',
        fingerprint: deviceFingerprint || undefined,
        ip_address: clientIp || undefined,
        user_agent: headersList.get("user-agent") || undefined,
        details: { blocked_fingerprint: deviceFingerprint },
      });
    }
    if (ipBlocked) {
      logSecurityEvent({
        event_type: 'blocked_ip',
        email, route: '/login',
        fingerprint: deviceFingerprint || undefined,
        ip_address: clientIp || undefined,
        user_agent: headersList.get("user-agent") || undefined,
        details: { blocked_ip: clientIp },
      });
    }
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

  // Check if user account is blocked — sign them out silently and return generic error
  if (user) {
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("is_blocked")
      .eq("id", user.id)
      .single();

    if (userData?.is_blocked) {
      logSecurityEvent({
        event_type: 'blocked_user',
        email: data.email,
        route: '/login',
        fingerprint: deviceFingerprint || undefined,
        ip_address: clientIp || undefined,
        user_agent: headersList.get("user-agent") || undefined,
        details: { blocked_user_id: user.id },
      });
      await supabase.auth.signOut();
      return { error: "Invalid login credentials" };
    }
  }
  if (user) {
    await Promise.all([
      storeDeviceFingerprint(user.id, deviceFingerprint),
      storeUserIp(user.id, clientIp),
    ]);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}