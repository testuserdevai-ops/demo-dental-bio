import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import { otpSchema, registrationSchema } from "@/lib/auth/schemas";
import { resolveRegistrationDomain } from "@/lib/auth/registration-domain";
import { verifyRegistrationTicket } from "@/lib/auth/registration-ticket";
import { actionError, zodActionError } from "@/lib/forms/action-result";
import { storeDeviceFingerprint } from "@/utils/blockedFingerprints";
import { getClientIp, storeUserIp } from "@/utils/blockedIps";
import { getAllDomains, getDomainConfigByHostname } from "@/utils/domainConfig";
import { sendUserRegisterredEmail } from "@/utils/mails/sendReportEmail";
import { sendTemplateEmail } from "@/utils/mails/sendTemplateEmails";
import { getRequestMeta, logSecurityEvent } from "@/utils/securityLogger";
import { createClient } from "@/utils/supabase/server";
import supabaseAdmin from "@/utils/supabase/supabaseAdmin";
import {
  createOrExtendStripeTrial,
  extendPaidPeriodOrTrial,
  shouldDisableExternalProvidersForLocalE2E,
} from "@/utils/trialManagement";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});
const pricePro = process.env.PRICE_PRO_MONTHLY!;

type RegistrationStep =
  | "password"
  | "profile"
  | "stripe"
  | "referral_reward"
  | "welcome_email"
  | "referral_email";

interface RegistrationCompletion {
  user_id: string;
  registered_domain: string;
  referrer_user_id: string | null;
  offer_code: string | null;
  base_trial_months: number;
  referral_bonus_months: number;
  total_trial_months: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  completed_at: string | null;
}

interface RegistrationProfile {
  id: string;
  email: string;
  username: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string;
  country: string | null;
  birthday: string | null;
  registered_domain: string | null;
  is_blocked: boolean | null;
}

interface SubscriptionSummary {
  id: string;
  customer: string | { id?: string } | null;
  items: { data: Array<{ price: { id: string } }> };
  current_period_end: number | null;
  trial_end: number | null;
  status: string;
}

interface UserUpdatePayload {
  registered_domain: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  plan_id?: string | null;
  current_period_end?: Date | null;
  trial_end?: Date | null;
  subscription_status?: "PRO" | "FREE";
}

interface StepState {
  status: "pending" | "processing" | "succeeded" | "failed" | "skipped";
}

type StepClaim = "claimed" | "complete" | "busy" | "error";

export function calculateAge(birthday: string, today = new Date()) {
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthday);
  const databaseMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  const match = displayMatch ?? databaseMatch;
  if (!match) throw new Error("Birthday must use DD/MM/YYYY format");
  const [, first, monthText, last] = match;
  const dayText = displayMatch ? first : last;
  const yearText = displayMatch ? last : first;
  const birthDate = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  );
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

export function createUserUpdatePayload(
  registeredDomain: string,
  subscription?: SubscriptionSummary | null,
): UserUpdatePayload {
  if (!subscription) {
    return {
      registered_domain: registeredDomain,
      customer_id: null,
      subscription_id: null,
      plan_id: null,
      current_period_end: null,
      trial_end: null,
      subscription_status: "FREE",
    };
  }
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  return {
    registered_domain: registeredDomain,
    customer_id: customerId ?? null,
    subscription_id: subscription.id,
    plan_id: subscription.items.data[0]?.price.id ?? null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    subscription_status:
      subscription.status === "trialing" || subscription.status === "active"
        ? "PRO"
        : "FREE",
  };
}

function retryableError(code: string, message: string, status = 503) {
  return NextResponse.json(actionError(code, message), { status });
}

function isCompletion(value: unknown): value is RegistrationCompletion {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.user_id === "string" &&
    typeof row.registered_domain === "string" &&
    typeof row.base_trial_months === "number" &&
    typeof row.referral_bonus_months === "number" &&
    typeof row.total_trial_months === "number"
  );
}

async function initializeCompletion(input: {
  userId: string;
  registeredDomain: string;
  referrerUserId: string | null;
  offerCode: string | null;
  baseTrialMonths: number;
  referralBonusMonths: number;
}): Promise<RegistrationCompletion | null> {
  const { data, error } = await supabaseAdmin.rpc(
    "initialize_registration_completion",
    {
      p_user_id: input.userId,
      p_registered_domain: input.registeredDomain,
      p_referrer_user_id: input.referrerUserId,
      p_offer_code: input.offerCode,
      p_base_trial_months: input.baseTrialMonths,
      p_referral_bonus_months: input.referralBonusMonths,
    },
  );
  return !error && isCompletion(data) ? data : null;
}

async function claimStep(
  userId: string,
  step: RegistrationStep,
): Promise<StepClaim> {
  const { data, error } = await supabaseAdmin.rpc(
    "claim_registration_completion_step",
    { p_user_id: userId, p_step: step },
  );
  if (error) return "error";
  if (data) return "claimed";

  const { data: state, error: stateError } = await supabaseAdmin
    .from("registration_completion_steps")
    .select("status")
    .eq("user_id", userId)
    .eq("step", step)
    .maybeSingle();
  if (stateError || !state) return "error";
  const status = (state as StepState).status;
  if (status === "succeeded" || status === "skipped") return "complete";
  return status === "processing" ? "busy" : "error";
}

async function finishStep(
  userId: string,
  step: RegistrationStep,
  status: "succeeded" | "failed" | "skipped",
  failureCode?: string,
  providerReference?: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc(
    "finish_registration_completion_step",
    {
      p_user_id: userId,
      p_step: step,
      p_status: status,
      p_failure_code: failureCode ?? null,
      p_provider_reference: providerReference ?? null,
    },
  );
  return !error && Boolean(data);
}

async function loadProfile(
  userId: string,
): Promise<RegistrationProfile | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, username, title, first_name, last_name, position, country, birthday, registered_domain, is_blocked",
      )
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) return data as RegistrationProfile;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

async function finishFailure(
  userId: string,
  step: RegistrationStep,
  failureCode: string,
) {
  return finishStep(userId, step, "failed", failureCode);
}

export async function coordinateRegistrationCompletion(request: Request) {
  const body = await request.json().catch(() => null);
  const registration = registrationSchema.safeParse(body);
  if (!registration.success) {
    return NextResponse.json(zodActionError(registration.error), {
      status: 400,
    });
  }
  const registrationTicket =
    typeof body?.registrationTicket === "string"
      ? verifyRegistrationTicket(body.registrationTicket)
      : null;
  if (!registrationTicket) {
    return retryableError(
      "INVALID_REGISTRATION_TICKET",
      "Your registration session has expired. Please request a new code.",
      400,
    );
  }
  const otpValidation = otpSchema.safeParse({
    email: registrationTicket.email,
    otp: body?.otp,
  });
  if (!otpValidation.success) {
    return NextResponse.json(zodActionError(otpValidation.error), {
      status: 400,
    });
  }

  const { password } = registration.data;
  const {
    email,
    username: ticketUsername,
    domain: ticketDomain,
    position,
    birthday: ticketBirthday,
    offerCode,
    referral: inviteUsername,
  } = registrationTicket;
  if (inviteUsername && inviteUsername === ticketUsername) {
    return NextResponse.json(
      actionError("INVALID_REFERRAL", "You cannot refer your own account."),
      { status: 400 },
    );
  }
  const requestedDomain = resolveRegistrationDomain(request, ticketDomain);
  if (!requestedDomain || !requestedDomain.positions.includes(position)) {
    return NextResponse.json(
      actionError(
        "INVALID_REGISTRATION_CONTEXT",
        "This registration link is not valid.",
      ),
      { status: 400 },
    );
  }
  const supabase = await createClient();
  try {
    let preloadedCompletion: RegistrationCompletion | null = null;
    let {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    const existingEmail = authenticatedUser?.email?.trim().toLowerCase();
    if (authenticatedUser && existingEmail !== email) {
      return retryableError(
        "AUTH_FAILED",
        "We could not verify your account. Please request a new code.",
        401,
      );
    }
    if (authenticatedUser) {
      const { data: existingState, error: existingStateError } =
        await supabaseAdmin
          .from("registration_completions")
          .select("*")
          .eq("user_id", authenticatedUser.id)
          .maybeSingle();
      if (existingStateError) {
        return retryableError(
          "REGISTRATION_STATE_FAILED",
          "We could not load your account progress. Please try again.",
        );
      }
      preloadedCompletion = isCompletion(existingState) ? existingState : null;
    }
    if (!authenticatedUser || !preloadedCompletion) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: otpValidation.data.otp,
        type: "email",
      });
      if (otpError) {
        return NextResponse.json(
          {
            ok: false,
            code: "INVALID_OTP",
            fieldErrors: { otp: ["Invalid or expired OTP."] },
          },
          { status: 400 },
        );
      }
      const authenticated = await supabase.auth.getUser();
      authenticatedUser = authenticated.data.user;
      if (
        authenticated.error ||
        !authenticatedUser ||
        authenticatedUser.email?.trim().toLowerCase() !== email
      ) {
        return retryableError(
          "AUTH_FAILED",
          "We could not verify your account. Please request a new code.",
          401,
        );
      }
    }

    const userId = authenticatedUser.id;
    const authenticatedEmail = authenticatedUser.email!.trim().toLowerCase();
    const profile = await loadProfile(userId);
    if (!profile) {
      return retryableError(
        "USER_RECORD_PENDING",
        "Your account is still being created. Please retry in a moment.",
      );
    }
    const [ticketDay, ticketMonth, ticketYear] = ticketBirthday.split("/");
    const ticketDatabaseBirthday = `${ticketYear}-${ticketMonth}-${ticketDay}`;
    if (
      profile.email.trim().toLowerCase() !== authenticatedEmail ||
      profile.username.trim().toLowerCase() !== ticketUsername ||
      profile.position !== position ||
      profile.birthday !== ticketDatabaseBirthday ||
      profile.registered_domain !== ticketDomain
    ) {
      return retryableError(
        "REGISTRATION_IDENTITY_MISMATCH",
        "We could not verify your registration details. Please request a new code.",
        401,
      );
    }
    if (profile.is_blocked) {
      logSecurityEvent({
        event_type: "blocked_user",
        email: authenticatedEmail,
        route: "/api/register/verify-otp",
        fingerprint:
          typeof body?.deviceFingerprint === "string"
            ? body.deviceFingerprint.slice(0, 512)
            : "",
        ...getRequestMeta(request),
        details: { blocked_user_id: userId },
      });
      return NextResponse.json({
        ok: true,
        data: { redirectTo: "/dashboard" },
      });
    }

    let completion = preloadedCompletion;
    if (!completion) {
      let referrerUserId: string | null = null;
      if (inviteUsername) {
        const { data: referrer, error: referrerError } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("username", inviteUsername)
          .maybeSingle();
        if (referrerError) {
          return retryableError(
            "REFERRAL_LOOKUP_FAILED",
            "We could not verify your referral. Please try again.",
          );
        }
        referrerUserId = referrer?.id ?? null;
      }

      let eligibleOfferCode: string | null = null;
      const offerCandidate =
        offerCode &&
        profile.position === "Student" &&
        profile.birthday &&
        calculateAge(ticketBirthday) <= 27;
      if (offerCandidate) {
        const { data: matchingOffer, error: offerError } = await supabaseAdmin
          .from("offer_codes")
          .select("offer_code")
          .eq("offer_code", offerCode)
          .maybeSingle();
        if (offerError) {
          return retryableError(
            "OFFER_CODE_LOOKUP_FAILED",
            "We could not verify your offer code. Please try again.",
          );
        }
        eligibleOfferCode = matchingOffer?.offer_code ?? null;
      }

      completion = await initializeCompletion({
        userId,
        registeredDomain: requestedDomain.domain,
        referrerUserId,
        offerCode: eligibleOfferCode,
        baseTrialMonths: eligibleOfferCode ? 6 : 1,
        referralBonusMonths: referrerUserId ? 1 : 0,
      });
    }
    if (
      !completion ||
      !getAllDomains().includes(completion.registered_domain)
    ) {
      return retryableError(
        "REGISTRATION_STATE_FAILED",
        "We could not prepare your account. Please try again.",
      );
    }
    const domainConfig = getDomainConfigByHostname(
      completion.registered_domain,
    );

    const passwordClaim = await claimStep(userId, "password");
    if (passwordClaim === "error" || passwordClaim === "busy") {
      return retryableError(
        "REGISTRATION_IN_PROGRESS",
        "Your account is still being prepared. Please try again shortly.",
      );
    }
    if (passwordClaim === "claimed") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (
          !(await finishFailure(userId, "password", "PASSWORD_UPDATE_FAILED"))
        ) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
        return retryableError(
          "PASSWORD_UPDATE_FAILED",
          "We could not secure your account. Please try again.",
        );
      }
      if (!(await finishStep(userId, "password", "succeeded"))) {
        return retryableError(
          "REGISTRATION_STATE_FAILED",
          "We could not save your account progress. Please try again.",
        );
      }
    }

    const fingerprint =
      typeof body?.deviceFingerprint === "string"
        ? body.deviceFingerprint.slice(0, 512)
        : "";
    await Promise.all([
      storeDeviceFingerprint(userId, fingerprint),
      storeUserIp(userId, getClientIp(request)),
    ]);

    let currentSubscription: Stripe.Subscription | null = null;
    const stripeClaim = await claimStep(userId, "stripe");
    if (stripeClaim === "error" || stripeClaim === "busy") {
      return retryableError(
        "REGISTRATION_IN_PROGRESS",
        "Your account is still being prepared. Please try again shortly.",
      );
    }
    if (stripeClaim === "claimed") {
      const providerResult = await createOrExtendStripeTrial({
        userId,
        email: authenticatedEmail,
        name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
        priceId: pricePro,
        months: completion.total_trial_months,
        metadata: {
          trial_type: completion.referrer_user_id
            ? "referral"
            : completion.base_trial_months === 6
              ? "student_offer"
              : "standard",
          base_trial_months: String(completion.base_trial_months),
          referral_bonus_months: String(completion.referral_bonus_months),
          total_trial_months: String(completion.total_trial_months),
        },
        operationKey: userId,
      });
      if (!providerResult.ok) {
        if (
          !(await finishFailure(
            userId,
            "stripe",
            `STRIPE_${providerResult.code}`,
          ))
        ) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
        return retryableError(
          providerResult.retryable ? "STRIPE_RETRYABLE" : "STRIPE_SETUP_FAILED",
          "We could not finish setting up your plan. Please try again.",
          providerResult.retryable ? 503 : 400,
        );
      }
      if (providerResult.code === "SKIPPED_LOCAL_TEST") {
        if (!(await finishStep(userId, "stripe", "skipped"))) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
      } else {
        currentSubscription = providerResult.subscription;
        const { data: saved, error: saveError } = await supabaseAdmin
          .from("registration_completions")
          .update({
            stripe_customer_id: providerResult.customerId,
            stripe_subscription_id: providerResult.subscription.id,
          })
          .eq("user_id", userId)
          .select("*")
          .single();
        if (saveError || !isCompletion(saved)) {
          if (
            !(await finishFailure(userId, "stripe", "STRIPE_ID_SAVE_FAILED"))
          ) {
            return retryableError(
              "REGISTRATION_STATE_FAILED",
              "We could not save your account progress. Please try again.",
            );
          }
          return retryableError(
            "STRIPE_RETRYABLE",
            "We could not save your plan. Please try again.",
          );
        }
        completion = saved;
        if (
          !(await finishStep(
            userId,
            "stripe",
            "succeeded",
            undefined,
            providerResult.subscription.id,
          ))
        ) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
      }
    }

    const profileClaim = await claimStep(userId, "profile");
    if (profileClaim === "error" || profileClaim === "busy") {
      return retryableError(
        "REGISTRATION_IN_PROGRESS",
        "Your account is still being prepared. Please try again shortly.",
      );
    }
    if (profileClaim === "claimed") {
      if (!currentSubscription && completion.stripe_subscription_id) {
        try {
          currentSubscription = await stripe.subscriptions.retrieve(
            completion.stripe_subscription_id,
          );
        } catch {
          if (!(await finishFailure(userId, "profile", "STRIPE_READ_FAILED"))) {
            return retryableError(
              "REGISTRATION_STATE_FAILED",
              "We could not save your account progress. Please try again.",
            );
          }
          return retryableError(
            "PROFILE_RETRYABLE",
            "We could not finish your profile. Please try again.",
          );
        }
      }
      const payload = createUserUpdatePayload(
        completion.registered_domain,
        currentSubscription,
      );
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("users")
        .update(payload)
        .eq("id", userId)
        .select("id")
        .single();
      if (updateError || updated?.id !== userId) {
        if (
          !(await finishFailure(userId, "profile", "PROFILE_UPDATE_FAILED"))
        ) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
        return retryableError(
          "PROFILE_RETRYABLE",
          "We could not finish your profile. Please try again.",
        );
      }
      if (!(await finishStep(userId, "profile", "succeeded"))) {
        return retryableError(
          "REGISTRATION_STATE_FAILED",
          "We could not save your account progress. Please try again.",
        );
      }
    }

    const referralClaim = await claimStep(userId, "referral_reward");
    if (referralClaim === "error" || referralClaim === "busy") {
      return retryableError(
        "REGISTRATION_IN_PROGRESS",
        "Your account is still being prepared. Please try again shortly.",
      );
    }
    if (referralClaim === "claimed") {
      if (!completion.referrer_user_id) {
        if (!(await finishStep(userId, "referral_reward", "skipped"))) {
          return retryableError(
            "REGISTRATION_STATE_FAILED",
            "We could not save your account progress. Please try again.",
          );
        }
      } else {
        const reward = await extendPaidPeriodOrTrial(
          completion.referrer_user_id,
          1,
          { operationKey: userId },
        );
        if (!reward.ok && reward.code === "NOT_ELIGIBLE") {
          if (!(await finishStep(userId, "referral_reward", "skipped"))) {
            return retryableError(
              "REGISTRATION_STATE_FAILED",
              "We could not save your account progress. Please try again.",
            );
          }
        } else if (!reward.ok) {
          if (
            !(await finishFailure(
              userId,
              "referral_reward",
              `REFERRAL_${reward.code}`,
            ))
          ) {
            return retryableError(
              "REGISTRATION_STATE_FAILED",
              "We could not save your account progress. Please try again.",
            );
          }
          return retryableError(
            reward.retryable ? "REFERRAL_RETRYABLE" : "REFERRAL_REWARD_FAILED",
            "We could not finish the referral reward. Please try again.",
            reward.retryable ? 503 : 400,
          );
        } else {
          const status =
            reward.code === "SKIPPED_LOCAL_TEST" ? "skipped" : "succeeded";
          if (
            !(await finishStep(
              userId,
              "referral_reward",
              status,
              undefined,
              completion.referrer_user_id,
            ))
          ) {
            return retryableError(
              "REGISTRATION_STATE_FAILED",
              "We could not save your account progress. Please try again.",
            );
          }
        }
      }
    }

    const location =
      typeof body?.location === "string" ? body.location.slice(0, 100) : "";
    const skipExternalNotifications =
      shouldDisableExternalProvidersForLocalE2E();
    const welcomeClaim = await claimStep(userId, "welcome_email");
    if (welcomeClaim === "claimed") {
      if (skipExternalNotifications) {
        await finishStep(userId, "welcome_email", "skipped");
      } else {
        let welcomeDelivered = false;
        try {
          const welcomeResult = await sendTemplateEmail(
            {
              sendTo: authenticatedEmail,
              title: `${profile.position === "Student" ? "Student Privileges Unlocked! " : ""}You've received PRO ${domainConfig.brandName} for ${completion.total_trial_months} month${completion.total_trial_months > 1 ? "s" : ""}!`,
              content: `
                <h1>Welcome to ${domainConfig.brandName}!</h1>
                <p>Hey ${profile.first_name ?? ""}, your registration was successful!</p>
                <p>You have secured your ${domainConfig.brandName} username:</p>
                <h2>${domainConfig.baseUrl.replace("https://", "")}/<span>${profile.username}</span></h2>
                <p>Username: <span>@${profile.username}</span></p>
                ${
                  completion.referrer_user_id
                    ? `<p>You signed up with a referral link and received a free ${completion.total_trial_months}-month Pro Plan.</p>`
                    : ""
                }
              `,
            },
            domainConfig,
          );
          if (!welcomeResult) throw new Error("WELCOME_EMAIL_FAILED");
          if (!(await finishStep(userId, "welcome_email", "succeeded"))) {
            throw new Error("WELCOME_LEDGER_FAILED");
          }
          welcomeDelivered = true;
        } catch {
          await finishFailure(userId, "welcome_email", "WELCOME_EMAIL_FAILED");
        }
        if (welcomeDelivered) {
          // The admin report is secondary and must not change the delivery ledger.
          await sendUserRegisterredEmail({
            username: profile.username,
            title: profile.title ?? "",
            first_name: profile.first_name ?? "",
            last_name: profile.last_name ?? "",
            position: profile.position,
            country: profile.country ?? "Unknown",
            email: authenticatedEmail,
            time: new Date().toISOString(),
            location: location || "Unknown",
          });
        }
      }
    }

    const referralEmailClaim = await claimStep(userId, "referral_email");
    if (referralEmailClaim === "claimed") {
      if (skipExternalNotifications || !completion.referrer_user_id) {
        await finishStep(userId, "referral_email", "skipped");
      } else {
        try {
          const { data: referrer, error } = await supabaseAdmin
            .from("users")
            .select("email, first_name")
            .eq("id", completion.referrer_user_id)
            .single();
          if (error || !referrer) throw new Error("REFERRER_LOOKUP_FAILED");
          const referralResult = await sendTemplateEmail(
            {
              sendTo: referrer.email,
              title: "You got 1 month free!",
              content: `<h1>Great news!</h1><p>Hello ${referrer.first_name ?? ""}, ${profile.first_name ?? "A new member"} signed up using your referral link.</p><p>You received 1 month of the Pro plan from the ${domainConfig.brandName} community.</p>`,
            },
            domainConfig,
          );
          if (!referralResult) throw new Error("REFERRAL_EMAIL_FAILED");
          if (
            !(await finishStep(
              userId,
              "referral_email",
              "succeeded",
              undefined,
              completion.referrer_user_id,
            ))
          ) {
            throw new Error("REFERRAL_LEDGER_FAILED");
          }
        } catch {
          await finishFailure(
            userId,
            "referral_email",
            "REFERRAL_EMAIL_FAILED",
          );
        }
      }
    }

    const { data: marked, error: markError } = await supabaseAdmin.rpc(
      "mark_registration_completion_complete",
      { p_user_id: userId },
    );
    if (markError || !isCompletion(marked) || !marked.completed_at) {
      return retryableError(
        "REGISTRATION_STATE_FAILED",
        "We could not finalize your account. Please try again.",
      );
    }
    return NextResponse.json({ ok: true, data: { redirectTo: "/dashboard" } });
  } catch {
    return retryableError(
      "REGISTRATION_FAILED",
      "We could not create your account. Please try again.",
    );
  }
}
