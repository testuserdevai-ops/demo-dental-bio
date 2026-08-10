import "server-only";

import supabaseAdmin from "@/utils/supabase/supabaseAdmin";

export class RegistrationAuthorityError extends Error {
  constructor(operation: string) {
    super(`Registration authority operation failed: ${operation}`);
    this.name = "RegistrationAuthorityError";
  }
}

export type RegistrationStep =
  | "password"
  | "profile"
  | "stripe"
  | "referral_reward"
  | "welcome_email"
  | "referral_email";

export interface RegistrationCompletionRecord {
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

export interface RegistrationProfileRecord {
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
  offer_code?: string | null;
}

type UserUpdate = {
  registered_domain: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  plan_id?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  subscription_status?: "PRO" | "FREE";
};

const profileProjection =
  "id, email, username, title, first_name, last_name, birthday, position, country, offer_code, registered_domain";
const completionProjection =
  "user_id, registered_domain, referrer_user_id, offer_code, base_trial_months, referral_bonus_months, total_trial_months, stripe_customer_id, stripe_subscription_id, completed_at";

function failed(operation: string, error: unknown): never {
  if (error) throw new RegistrationAuthorityError(operation);
  throw new RegistrationAuthorityError(`${operation}: zero rows`);
}

export const registrationAuthorityRepository = {
  async findProfileByEmail(
    email: string,
  ): Promise<RegistrationProfileRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(profileProjection)
      .eq("email", email)
      .maybeSingle();
    if (error) failed("findProfileByEmail", error);
    return data as RegistrationProfileRecord | null;
  },

  async findProfileByUsername(
    username: string,
  ): Promise<RegistrationProfileRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(profileProjection)
      .eq("username", username)
      .maybeSingle();
    if (error) failed("findProfileByUsername", error);
    return data as RegistrationProfileRecord | null;
  },

  async findUsernameById(userId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("id", userId)
      .maybeSingle();
    if (error) failed("findUsernameById", error);
    return typeof data?.username === "string" ? data.username : null;
  },

  async getAuthUserById(userId: string) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) failed("getAuthUserById", error);
    return data.user;
  },

  async findCompletion(
    userId: string,
  ): Promise<RegistrationCompletionRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("registration_completions")
      .select(completionProjection)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) failed("findCompletion", error);
    return data as RegistrationCompletionRecord | null;
  },

  async initializeCompletion(input: {
    userId: string;
    registeredDomain: string;
    referrerUserId: string | null;
    offerCode: string | null;
    baseTrialMonths: number;
    referralBonusMonths: number;
  }): Promise<RegistrationCompletionRecord> {
    const { data, error } = await supabaseAdmin.rpc(
      "initialize_registration_completion",
      {
        p_user_id: input.userId,
        p_registered_domain: input.registeredDomain,
        p_referrer_user_id: input.referrerUserId ?? undefined,
        p_offer_code: input.offerCode ?? undefined,
        p_base_trial_months: input.baseTrialMonths,
        p_referral_bonus_months: input.referralBonusMonths,
      },
    );
    if (error || !data) failed("initializeCompletion", error);
    return data as RegistrationCompletionRecord;
  },

  async claimStep(userId: string, step: RegistrationStep): Promise<boolean> {
    const { data, error } = await supabaseAdmin.rpc(
      "claim_registration_completion_step",
      { p_user_id: userId, p_step: step },
    );
    if (error) failed("claimStep", error);
    return Boolean(data);
  },

  async findStepStatus(userId: string, step: RegistrationStep) {
    const { data, error } = await supabaseAdmin
      .from("registration_completion_steps")
      .select("status")
      .eq("user_id", userId)
      .eq("step", step)
      .maybeSingle();
    if (error || !data) failed("findStepStatus", error);
    return data.status as
      "pending" | "processing" | "succeeded" | "failed" | "skipped";
  },

  async finishStep(input: {
    userId: string;
    step: RegistrationStep;
    status: "succeeded" | "failed" | "skipped";
    failureCode?: string;
    providerReference?: string;
  }): Promise<void> {
    const { data, error } = await supabaseAdmin.rpc(
      "finish_registration_completion_step",
      {
        p_user_id: input.userId,
        p_step: input.step,
        p_status: input.status,
        p_failure_code: input.failureCode,
        p_provider_reference: input.providerReference,
      },
    );
    if (error || !data) failed("finishStep", error);
  },

  async findProfileForCompletion(
    userId: string,
  ): Promise<RegistrationProfileRecord | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(
        "id, email, username, title, first_name, last_name, position, country, birthday, registered_domain, is_blocked",
      )
      .eq("id", userId)
      .maybeSingle();
    if (error) failed("findProfileForCompletion", error);
    return data as RegistrationProfileRecord | null;
  },

  async findReferrerId(username: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (error) failed("findReferrerId", error);
    return typeof data?.id === "string" ? data.id : null;
  },

  async findOfferCode(offerCode: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("offer_codes")
      .select("offer_code")
      .eq("offer_code", offerCode)
      .maybeSingle();
    if (error) failed("findOfferCode", error);
    return typeof data?.offer_code === "string" ? data.offer_code : null;
  },

  async saveStripeReferences(input: {
    userId: string;
    customerId: string;
    subscriptionId: string;
  }): Promise<RegistrationCompletionRecord> {
    const { data, error } = await supabaseAdmin
      .from("registration_completions")
      .update({
        stripe_customer_id: input.customerId,
        stripe_subscription_id: input.subscriptionId,
      })
      .eq("user_id", input.userId)
      .select(completionProjection)
      .single();
    if (error || !data) failed("saveStripeReferences", error);
    return data as RegistrationCompletionRecord;
  },

  async updateProfile(userId: string, payload: UserUpdate): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .update(payload)
      .eq("id", userId)
      .select("id")
      .single();
    if (error || data?.id !== userId) failed("updateProfile", error);
  },

  async ensureDentistry(userId: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from("dentistries")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select("dentistry_id")
      .single();
    if (error || !data?.dentistry_id) failed("ensureDentistry", error);
  },

  async findReferrerContact(userId: string): Promise<{
    email: string;
    firstName: string | null;
  } | null> {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("email, first_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) failed("findReferrerContact", error);
    if (!data || typeof data.email !== "string") return null;
    return { email: data.email, firstName: data.first_name ?? null };
  },

  async markComplete(userId: string): Promise<RegistrationCompletionRecord> {
    const { data, error } = await supabaseAdmin.rpc(
      "mark_registration_completion_complete",
      { p_user_id: userId },
    );
    if (error || !data) failed("markComplete", error);
    return data as RegistrationCompletionRecord;
  },
};

export type RegistrationAuthorityRepository =
  typeof registrationAuthorityRepository;
