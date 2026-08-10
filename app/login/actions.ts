"use server";

import {
  createClient,
  getUserBlockedStatusById,
  headers,
  isBlockedFingerprint,
  isBlockedIp,
  logSecurityEvent,
  redirect,
  revalidatePath,
  storeDeviceFingerprint,
  storeUserIp,
} from "@/app/login/server-dependencies";
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
    deviceFingerprint: formData.get("deviceFingerprint") ?? "",
  });

  if (!parsed.success) {
    return zodActionError(parsed.error);
  }

  const { email, password, deviceFingerprint } = parsed.data;
  const supabase = await createClient();

  // Get client IP from headers (server action context)
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const clientIp = forwarded
    ? forwarded.split(",")[0].trim()
    : headersList.get("x-real-ip");

  // Silently block login from blocked device fingerprints or IPs
  // Return generic error so the user doesn't know they're blocked
  const [fingerprintBlocked, ipBlocked] = await Promise.all([
    isBlockedFingerprint(deviceFingerprint),
    isBlockedIp(clientIp),
  ]);
  if (fingerprintBlocked || ipBlocked) {
    if (fingerprintBlocked) {
      logSecurityEvent({
        event_type: "blocked_fingerprint",
        email,
        route: "/login",
        fingerprint: deviceFingerprint || undefined,
        ip_address: clientIp || undefined,
        user_agent: headersList.get("user-agent") || undefined,
        details: { blocked_fingerprint: deviceFingerprint },
      });
    }
    if (ipBlocked) {
      logSecurityEvent({
        event_type: "blocked_ip",
        email,
        route: "/login",
        fingerprint: deviceFingerprint || undefined,
        ip_address: clientIp || undefined,
        user_agent: headersList.get("user-agent") || undefined,
        details: { blocked_ip: clientIp },
      });
    }
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }

  // Store/update device fingerprint and IP for the logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }

  // Check if user account is blocked — sign them out silently and return generic error
  let isBlocked: boolean | null;
  try {
    isBlocked = await getUserBlockedStatusById(user.id);
  } catch {
    await supabase.auth.signOut();
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }

  if (isBlocked) {
    logSecurityEvent({
      event_type: "blocked_user",
      email,
      route: "/login",
      fingerprint: deviceFingerprint || undefined,
      ip_address: clientIp || undefined,
      user_agent: headersList.get("user-agent") || undefined,
      details: { blocked_user_id: user.id },
    });
    await supabase.auth.signOut();
    return actionError("AUTH_FAILED", INVALID_CREDENTIALS);
  }
  await Promise.all([
    storeDeviceFingerprint(user.id, deviceFingerprint),
    storeUserIp(user.id, clientIp),
  ]);

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
