"use server";

import {
  otpSchema,
  recoveryRequestSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import {
  createClient,
  getDomainConfig,
  headers,
} from "@/app/forgot-password/server-dependencies";

function recoveryRedirectUrl(baseUrl: string) {
  return new URL("/forgot-password", baseUrl).toString();
}

export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult> {
  const parsed = recoveryRequestSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  const requestHeaders = await headers();
  const redirectTo = recoveryRedirectUrl(
    getDomainConfig(requestHeaders).baseUrl,
  );
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );

  if (error) {
    return actionError(
      "RECOVERY_REQUEST_FAILED",
      "We couldn't send a recovery email. Please try again.",
    );
  }

  return { ok: true, data: undefined };
}

export async function verifyRecoveryOtp(input: unknown): Promise<ActionResult> {
  const parsed = otpSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.otp,
    type: "recovery",
  });

  if (error) {
    return actionError(
      "RECOVERY_OTP_INVALID",
      "This code is invalid or has expired. Request a new code and try again.",
    );
  }

  return { ok: true, data: undefined };
}

export async function updateRecoveryPassword(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return actionError(
      "RECOVERY_SESSION_REQUIRED",
      "Your recovery session has expired. Request a new code and try again.",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return actionError(
      "RECOVERY_UPDATE_FAILED",
      "We couldn't update your password. Please try again.",
    );
  }

  return { ok: true, data: undefined };
}
