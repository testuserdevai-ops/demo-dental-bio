import { NextResponse } from "next/server";

import { registrationSchema, usernameSchema } from "@/lib/auth/schemas";
import { actionError, zodActionError } from "@/lib/forms/action-result";
import {
  getAllDomains,
  getDomainConfig,
  getDomainConfigByHostname,
} from "@/utils/domainConfig";
import { isBlockedFingerprint } from "@/utils/blockedFingerprints";
import { getClientIp, isBlockedIp } from "@/utils/blockedIps";
import { getBlockedDomain } from "@/utils/blockedDomains";
import { createClient } from "@/utils/supabase/server";

function requestedHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();
}

function resolveRegistrationDomain(request: Request, selectedDomain: string) {
  const host = requestedHost(request);
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (isLocal && getAllDomains().includes(selectedDomain)) {
    return getDomainConfigByHostname(selectedDomain);
  }
  const config = getDomainConfig(request.headers);
  return config.domain === selectedDomain ? config : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(zodActionError(parsed.error), { status: 400 });

  const input = parsed.data;
  const domainConfig = resolveRegistrationDomain(request, input.selectedDomain);
  if (!domainConfig) {
    return NextResponse.json(
      actionError(
        "INVALID_DOMAIN",
        "This registration link is not valid for this domain.",
      ),
      { status: 400 },
    );
  }
  if (!domainConfig.positions.includes(input.position)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_POSITION",
        fieldErrors: { position: ["Choose a valid position for this brand."] },
      },
      { status: 400 },
    );
  }
  if (input.referral && !usernameSchema.safeParse(input.referral).success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REFERRAL",
        fieldErrors: { referral: ["This referral link is not valid."] },
      },
      { status: 400 },
    );
  }

  const fingerprint =
    typeof body?.deviceFingerprint === "string"
      ? body.deviceFingerprint.slice(0, 512)
      : "";
  const supabase = await createClient();
  const [{ data: existingUsername, error: usernameError }, blockedDomain] =
    await Promise.all([
      supabase
        .from("users")
        .select("id")
        .eq("username", input.username)
        .maybeSingle(),
      getBlockedDomain(input.email),
    ]);
  if (usernameError)
    return NextResponse.json(
      actionError(
        "USERNAME_CHECK_FAILED",
        "We could not check that username. Please try again.",
      ),
      { status: 500 },
    );
  if (existingUsername)
    return NextResponse.json(
      {
        ok: false,
        code: "USERNAME_TAKEN",
        fieldErrors: { username: ["That username is already taken."] },
      },
      { status: 409 },
    );
  if (blockedDomain)
    return NextResponse.json(
      actionError(
        "BLOCKED_EMAIL_DOMAIN",
        "Registration from this email provider is not allowed. Please use a different email address.",
      ),
      { status: 400 },
    );

  const [fingerprintBlocked, ipBlocked] = await Promise.all([
    isBlockedFingerprint(fingerprint),
    isBlockedIp(getClientIp(request)),
  ]);
  if (fingerprintBlocked || ipBlocked) {
    return NextResponse.json({ ok: true, data: undefined });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      data: {
        username: input.username,
        first_name: input.firstName,
        last_name: input.lastName,
        birthday: input.birthday,
        position: input.position,
        offer_code: input.offerCode,
        country: input.country,
        title: input.title,
        registered_domain: domainConfig.domain,
      },
    },
  });
  if (error) {
    return NextResponse.json(
      actionError(
        "OTP_SEND_FAILED",
        "We could not send a verification code. Please check your email and try again.",
      ),
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, data: undefined });
}
