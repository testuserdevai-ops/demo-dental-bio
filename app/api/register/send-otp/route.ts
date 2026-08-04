import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import {
  createRegistrationTicket,
  type RegistrationTicketInput,
  verifyRegistrationTicket,
} from "@/lib/auth/registration-ticket";
import { resolveRegistrationDomain } from "@/lib/auth/registration-domain";
import {
  registrationSchema,
  usernameSchema,
  type RegistrationInput,
} from "@/lib/auth/schemas";
import { actionError, zodActionError } from "@/lib/forms/action-result";
import { isBlockedFingerprint } from "@/utils/blockedFingerprints";
import { getClientIp, isBlockedIp } from "@/utils/blockedIps";
import { getBlockedDomain } from "@/utils/blockedDomains";
import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/supabaseAdmin";

interface ExistingProfile {
  id: string;
  email: string;
  username: string;
  title: string | null;
  firstName: string;
  lastName: string;
  birthday: string;
  position: string;
  country: string;
  offerCode: string | null;
  registeredDomain: string | null;
}

interface RegistrationCompletion {
  registeredDomain: string;
  referrerUserId: string | null;
  offerCode: string | null;
  completedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseProfile(value: unknown): ExistingProfile | null {
  if (!isRecord(value)) return null;
  const id = stringOrNull(value.id);
  const email = stringOrNull(value.email);
  const username = stringOrNull(value.username);
  const firstName = stringOrNull(value.first_name);
  const lastName = stringOrNull(value.last_name);
  const birthday = stringOrNull(value.birthday);
  const position = stringOrNull(value.position);
  const country = stringOrNull(value.country);
  if (
    !id ||
    !email ||
    !username ||
    !firstName ||
    !lastName ||
    !birthday ||
    !position ||
    !country
  ) {
    return null;
  }
  return {
    id,
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
    title: stringOrNull(value.title),
    firstName,
    lastName,
    birthday,
    position,
    country,
    offerCode: stringOrNull(value.offer_code),
    registeredDomain: stringOrNull(value.registered_domain),
  };
}

function parseCompletion(value: unknown): RegistrationCompletion | null {
  if (!isRecord(value)) return null;
  const registeredDomain = stringOrNull(value.registered_domain);
  if (!registeredDomain) return null;
  return {
    registeredDomain: registeredDomain.trim().toLowerCase(),
    referrerUserId: stringOrNull(value.referrer_user_id),
    offerCode: stringOrNull(value.offer_code),
    completedAt: stringOrNull(value.completed_at),
  };
}

function normalizeStoredBirthday(value: string): string | null {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

function genericOtpFailure() {
  return NextResponse.json(
    actionError(
      "OTP_SEND_FAILED",
      "We could not send a verification code. Please check your email and try again.",
    ),
    { status: 400 },
  );
}

function registrationUnavailable() {
  return NextResponse.json(
    actionError(
      "REGISTRATION_UNAVAILABLE",
      "Registration is temporarily unavailable. Please try again.",
    ),
    { status: 500 },
  );
}

function profileMatchesUnconfirmedInput(
  profile: ExistingProfile,
  input: RegistrationInput,
  storedDomain: string | null,
  resolvedDomain: string,
) {
  return (
    profile.email === input.email &&
    profile.username === input.username &&
    (profile.title ?? "") === input.title &&
    profile.firstName === input.firstName &&
    profile.lastName === input.lastName &&
    normalizeStoredBirthday(profile.birthday) === input.birthday &&
    profile.position === input.position &&
    profile.country === input.country &&
    (profile.offerCode ?? "") === input.offerCode &&
    storedDomain === resolvedDomain
  );
}

function ticketMatchesResend(
  ticket: unknown,
  input: RegistrationInput,
  resolvedDomain: string,
) {
  if (typeof ticket !== "string") return false;
  const claims = verifyRegistrationTicket(ticket);
  return (
    claims?.email === input.email &&
    claims.username === input.username &&
    claims.domain === resolvedDomain &&
    claims.position === input.position &&
    claims.birthday === input.birthday &&
    claims.referral === input.referral &&
    claims.offerCode === input.offerCode
  );
}

async function sendOtpWithTicket({
  ticketInput,
  authMetadata,
}: {
  ticketInput: RegistrationTicketInput;
  authMetadata?: Record<string, string>;
}) {
  const ticket = createRegistrationTicket(ticketInput);
  if (!ticket) return registrationUnavailable();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: ticketInput.email,
    ...(authMetadata ? { options: { data: authMetadata } } : {}),
  });
  if (error) return genericOtpFailure();
  return NextResponse.json({ ok: true, data: { ticket } });
}

async function pendingCompletionTicketInput(
  profile: ExistingProfile,
  completion: RegistrationCompletion,
): Promise<RegistrationTicketInput | null> {
  const birthday = normalizeStoredBirthday(profile.birthday);
  if (!birthday) return null;

  let referral = "";
  if (completion.referrerUserId) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", completion.referrerUserId)
      .maybeSingle();
    if (error || !isRecord(data) || typeof data.username !== "string") {
      return null;
    }
    referral = data.username.trim().toLowerCase();
  }

  return {
    email: profile.email,
    username: profile.username,
    domain: completion.registeredDomain,
    position: profile.position,
    birthday,
    referral,
    offerCode: completion.offerCode ?? "",
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(zodActionError(parsed.error), { status: 400 });
  }

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
  if (input.referral && input.referral === input.username) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_REFERRAL",
        fieldErrors: { referral: ["You cannot refer your own account."] },
      },
      { status: 400 },
    );
  }

  const [emailResult, usernameResult, blockedDomain] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select(
        "id, email, username, title, first_name, last_name, birthday, position, country, offer_code, registered_domain",
      )
      .eq("email", input.email)
      .maybeSingle(),
    supabaseAdmin
      .from("users")
      .select(
        "id, email, username, title, first_name, last_name, birthday, position, country, offer_code, registered_domain",
      )
      .eq("username", input.username)
      .maybeSingle(),
    getBlockedDomain(input.email),
  ]);
  if (emailResult.error || usernameResult.error) {
    return NextResponse.json(
      actionError(
        "ACCOUNT_CHECK_FAILED",
        "We could not verify these account details. Please try again.",
      ),
      { status: 500 },
    );
  }
  const existingEmail = emailResult.data
    ? parseProfile(emailResult.data)
    : null;
  const existingUsername = usernameResult.data
    ? parseProfile(usernameResult.data)
    : null;
  if (
    (emailResult.data && !existingEmail) ||
    (usernameResult.data && !existingUsername)
  ) {
    return registrationUnavailable();
  }
  if (
    existingUsername &&
    (!existingEmail || existingUsername.id !== existingEmail.id)
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "USERNAME_TAKEN",
        fieldErrors: { username: ["That username is already taken."] },
      },
      { status: 409 },
    );
  }
  if (blockedDomain) {
    return NextResponse.json(
      actionError(
        "BLOCKED_EMAIL_DOMAIN",
        "Registration from this email provider is not allowed. Please use a different email address.",
      ),
      { status: 400 },
    );
  }

  const fingerprint =
    typeof body?.deviceFingerprint === "string"
      ? body.deviceFingerprint.slice(0, 512)
      : "";
  const [fingerprintBlocked, ipBlocked] = await Promise.all([
    isBlockedFingerprint(fingerprint),
    isBlockedIp(getClientIp(request)),
  ]);
  if (fingerprintBlocked || ipBlocked) {
    const opaqueFailure = `${randomBytes(32).toString("base64url")}.${randomBytes(32).toString("base64url")}`;
    return NextResponse.json({ ok: true, data: { ticket: opaqueFailure } });
  }

  if (existingEmail) {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(existingEmail.id);
    const authUser = authData.user;
    if (
      authError ||
      !authUser ||
      authUser.email?.toLowerCase() !== input.email
    ) {
      return genericOtpFailure();
    }

    if (!authUser.email_confirmed_at && !authUser.confirmed_at) {
      const metadataDomain =
        typeof authUser.user_metadata?.registered_domain === "string"
          ? authUser.user_metadata.registered_domain.trim().toLowerCase()
          : null;
      const storedDomain = existingEmail.registeredDomain ?? metadataDomain;
      if (
        !profileMatchesUnconfirmedInput(
          existingEmail,
          input,
          storedDomain,
          domainConfig.domain,
        )
      ) {
        return genericOtpFailure();
      }
      return sendOtpWithTicket({
        ticketInput: {
          email: existingEmail.email,
          username: existingEmail.username,
          domain: domainConfig.domain,
          position: existingEmail.position,
          birthday: input.birthday,
          referral: input.referral,
          offerCode: existingEmail.offerCode ?? "",
        },
      });
    }

    const { data: completionData, error: completionError } = await supabaseAdmin
      .from("registration_completions")
      .select("registered_domain, referrer_user_id, offer_code, completed_at")
      .eq("user_id", existingEmail.id)
      .maybeSingle();
    const completion = completionData ? parseCompletion(completionData) : null;
    if (completionError) return genericOtpFailure();
    if (!completionData) {
      if (
        !profileMatchesUnconfirmedInput(
          existingEmail,
          input,
          existingEmail.registeredDomain,
          domainConfig.domain,
        ) ||
        !ticketMatchesResend(
          body?.registrationTicket,
          input,
          domainConfig.domain,
        )
      ) {
        return genericOtpFailure();
      }
      return sendOtpWithTicket({
        ticketInput: {
          email: existingEmail.email,
          username: existingEmail.username,
          domain: domainConfig.domain,
          position: existingEmail.position,
          birthday: input.birthday,
          referral: input.referral,
          offerCode: existingEmail.offerCode ?? "",
        },
      });
    }
    if (
      !completion ||
      completion.completedAt ||
      completion.registeredDomain !== domainConfig.domain
    ) {
      return genericOtpFailure();
    }
    const ticketInput = await pendingCompletionTicketInput(
      existingEmail,
      completion,
    );
    return ticketInput
      ? sendOtpWithTicket({ ticketInput })
      : registrationUnavailable();
  }

  return sendOtpWithTicket({
    ticketInput: {
      email: input.email,
      username: input.username,
      domain: domainConfig.domain,
      position: input.position,
      birthday: input.birthday,
      referral: input.referral,
      offerCode: input.offerCode,
    },
    authMetadata: {
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
  });
}
