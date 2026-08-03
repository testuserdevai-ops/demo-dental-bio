import { beforeEach, describe, expect, it, mock } from "bun:test";
import type {
  ProviderOperationResult,
  TrialProviderResult,
} from "@/utils/trialManagement";

const immutableUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "submitted@example.com",
};
const profile = {
  id: immutableUser.id,
  email: immutableUser.email,
  username: "new-owner",
  title: "Dr",
  first_name: "New",
  last_name: "Owner",
  position: "Dentist",
  country: "Egypt",
  birthday: "2000-05-04",
  registered_domain: "dental.bio",
  is_blocked: false,
};

let ticketClaims = {
  email: immutableUser.email,
  username: profile.username,
  domain: "dental.bio",
  position: profile.position,
  birthday: "04/05/2000",
  referral: "",
  offerCode: "",
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60_000,
  nonce: "registration-nonce",
};
const verifyRegistrationTicket = mock((ticket: string) =>
  ticket === "valid-ticket" ? ticketClaims : null,
);

const verifyOtp = mock<
  (...args: unknown[]) => Promise<{ error: { message: string } | null }>
>(async () => ({ error: null }));
const getUser = mock(async () => ({
  data: { user: immutableUser as { id: string; email?: string } | null },
  error: null as { message: string } | null,
}));
const updateUser = mock(async () => ({
  error: null as { message: string } | null,
}));
const createClient = mock(async () => ({
  auth: { verifyOtp, getUser, updateUser },
}));

const createOrExtendStripeTrial = mock<
  (...args: unknown[]) => Promise<TrialProviderResult>
>(async () => ({
  ok: true,
  code: "SKIPPED_LOCAL_TEST",
  subscription: null,
  customerId: null,
}));
const extendPaidPeriodOrTrial = mock<
  (...args: unknown[]) => Promise<ProviderOperationResult>
>(async () => ({
  ok: true,
  code: "SKIPPED_LOCAL_TEST",
}));
const sendTemplateEmail = mock(async () => undefined);
const sendUserRegisterredEmail = mock(async () => undefined);
const shouldDisableExternalProvidersForLocalE2E = mock(() => true);
const storeDeviceFingerprint = mock(async () => undefined);
const storeUserIp = mock(async () => undefined);

interface Completion {
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

let completion: Completion;
let terminalSteps: Set<string>;
let notificationStepsClaimed: boolean;
let offerMatches: boolean;
let existingCompletion: boolean;
const rpc = mock(async (name: string, args: Record<string, unknown>) => {
  if (name === "initialize_registration_completion") {
    return { data: completion, error: null };
  }
  if (name === "claim_registration_completion_step") {
    const step = String(args.p_step);
    const notification = step === "welcome_email" || step === "referral_email";
    if (
      terminalSteps.has(step) ||
      (notification && !notificationStepsClaimed)
    ) {
      terminalSteps.add(step);
      return { data: null, error: null };
    }
    return { data: { status: "processing" }, error: null };
  }
  if (name === "finish_registration_completion_step") {
    const step = String(args.p_step);
    if (args.p_status === "succeeded" || args.p_status === "skipped") {
      terminalSteps.add(step);
    }
    return { data: { status: args.p_status }, error: null };
  }
  if (name === "mark_registration_completion_complete") {
    completion = { ...completion, completed_at: "2026-08-03T20:00:00Z" };
    return { data: completion, error: null };
  }
  return { data: null, error: { message: "unexpected rpc" } };
});

const profileUpdate = mock((payload: Record<string, unknown>) => ({
  eq: () => ({
    select: () => ({
      single: async () => ({ data: { id: immutableUser.id }, error: null }),
    }),
  }),
  payload,
}));

function usersTable() {
  return {
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        maybeSingle: async () => {
          if (columns.includes("is_blocked"))
            return { data: profile, error: null };
          if (column === "username") {
            return {
              data: value
                ? { id: "22222222-2222-4222-8222-222222222222" }
                : null,
              error: null,
            };
          }
          return { data: null, error: null };
        },
        single: async () => ({
          data: { email: "referrer@example.com", first_name: "Referrer" },
          error: null,
        }),
      }),
    }),
    update: profileUpdate,
  };
}

const from = mock((table: string) => {
  if (table === "users") return usersTable();
  if (table === "offer_codes") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: offerMatches ? { offer_code: "STUDENT" } : null,
            error: null,
          }),
        }),
      }),
    };
  }
  if (table === "registration_completion_steps") {
    return {
      select: () => ({
        eq: () => ({
          eq: (_column: string, value: string) => ({
            maybeSingle: async () => ({
              data: {
                status: terminalSteps.has(value) ? "succeeded" : "processing",
              },
              error: null,
            }),
          }),
        }),
      }),
    };
  }
  if (table === "registration_completions") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: existingCompletion ? completion : null,
            error: null,
          }),
        }),
      }),
      update: (values: Partial<Completion>) => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              completion = { ...completion, ...values };
              return { data: completion, error: null };
            },
          }),
        }),
      }),
    };
  }
  throw new Error(`Unexpected table: ${table}`);
});

mock.module("@/utils/supabase/server", () => ({ createClient }));
mock.module("server-only", () => ({}));
mock.module("@/lib/auth/registration-ticket", () => ({
  verifyRegistrationTicket,
}));
mock.module("@/utils/supabase/supabaseAdmin", () => ({
  default: { rpc, from },
}));
mock.module("@/utils/trialManagement", () => ({
  createOrExtendStripeTrial,
  extendPaidPeriodOrTrial,
  shouldDisableExternalProvidersForLocalE2E,
}));
mock.module("@/utils/mails/sendTemplateEmails", () => ({ sendTemplateEmail }));
mock.module("@/utils/mails/sendReportEmail", () => ({
  sendUserRegisterredEmail,
}));
mock.module("@/utils/blockedFingerprints", () => ({
  isBlockedFingerprint: async () => false,
  storeDeviceFingerprint,
}));
mock.module("@/utils/blockedIps", () => ({
  getClientIp: () => "127.0.0.1",
  isBlockedIp: async () => false,
  storeUserIp,
}));
mock.module("@/utils/securityLogger", () => ({
  getRequestMeta: () => ({}),
  logSecurityEvent: mock(() => undefined),
}));
mock.module("stripe", () => ({
  default: class StripeMock {
    subscriptions = {
      retrieve: mock(async () => {
        throw new Error("Unexpected Stripe read");
      }),
    };
  },
}));

const routeModulePath = "./route.ts?registration-retry-coordinator-test";
const coordinatorModulePath =
  "./_lib/coordinator.ts?registration-retry-coordinator-helpers-test";
const { POST } = await import(routeModulePath);
const { calculateAge, createUserUpdatePayload } = await import(
  coordinatorModulePath
);

const validBody = {
  username: "new-owner",
  title: "Dr",
  email: immutableUser.email,
  firstName: "New",
  lastName: "Owner",
  birthday: "04/05/2000",
  position: "Dentist",
  country: "Egypt",
  selectedDomain: "dental.bio",
  referral: "",
  offerCode: "",
  password: "Password!1",
  confirmPassword: "Password!1",
  otp: "123456",
  registrationTicket: "valid-ticket",
};

function request(
  body: unknown = validBody,
  headers: Record<string, string> = {},
) {
  const host = headers.host ?? "dental.bio";
  return new Request(`https://${host}/api/register/verify-otp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "dental.bio",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/register/verify-otp retry coordinator", () => {
  beforeEach(() => {
    completion = {
      user_id: immutableUser.id,
      registered_domain: "dental.bio",
      referrer_user_id: null,
      offer_code: null,
      base_trial_months: 1,
      referral_bonus_months: 0,
      total_trial_months: 1,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      completed_at: null,
    };
    terminalSteps = new Set();
    notificationStepsClaimed = false;
    offerMatches = false;
    existingCompletion = false;
    profile.position = "Dentist";
    profile.birthday = "2000-05-04";
    profile.registered_domain = "dental.bio";
    ticketClaims = {
      email: immutableUser.email,
      username: profile.username,
      domain: "dental.bio",
      position: "Dentist",
      birthday: "04/05/2000",
      referral: "",
      offerCode: "",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      nonce: "registration-nonce",
    };
    verifyRegistrationTicket.mockClear();
    verifyOtp.mockClear();
    getUser.mockClear();
    updateUser.mockClear();
    rpc.mockClear();
    from.mockClear();
    profileUpdate.mockClear();
    createOrExtendStripeTrial.mockClear();
    extendPaidPeriodOrTrial.mockClear();
    sendTemplateEmail.mockClear();
    sendUserRegisterredEmail.mockClear();
    shouldDisableExternalProvidersForLocalE2E.mockClear();
    getUser.mockResolvedValue({ data: { user: immutableUser }, error: null });
    updateUser.mockResolvedValue({ error: null });
    createOrExtendStripeTrial.mockResolvedValue({
      ok: true,
      code: "SKIPPED_LOCAL_TEST",
      subscription: null,
      customerId: null,
    });
    extendPaidPeriodOrTrial.mockResolvedValue({
      ok: true,
      code: "SKIPPED_LOCAL_TEST",
    });
    sendTemplateEmail.mockResolvedValue(undefined);
    shouldDisableExternalProvidersForLocalE2E.mockReturnValue(true);
  });

  it("resumes with a matching authenticated session after the OTP is consumed", async () => {
    existingCompletion = true;
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(updateUser).toHaveBeenCalledWith({ password: validBody.password });
    expect(createOrExtendStripeTrial).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: immutableUser.id,
        operationKey: immutableUser.id,
      }),
    );
  });

  it("rejects a direct OTP attempt without a signed registration ticket", async () => {
    const { registrationTicket: _ticket, ...withoutTicket } = validBody;

    const response = await POST(request(withoutTicket));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "INVALID_REGISTRATION_TICKET",
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(createOrExtendStripeTrial).not.toHaveBeenCalled();
  });

  it("rejects a tampered or expired registration ticket", async () => {
    for (const registrationTicket of ["tampered-ticket", "expired-ticket"]) {
      const response = await POST(
        request({ ...validBody, registrationTicket }),
      );
      expect(response.status).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects self-referral from signed claims before authentication", async () => {
    ticketClaims = { ...ticketClaims, referral: ticketClaims.username };

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "INVALID_REFERRAL",
    });
    expect(getUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not accept spoofed forwarded localhost for another brand", async () => {
    ticketClaims = {
      ...ticketClaims,
      domain: "coach.bio",
      position: "Coach",
    };

    const response = await POST(
      request(validBody, { "x-forwarded-host": "localhost" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "INVALID_REGISTRATION_CONTEXT",
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("preserves explicit loopback multi-brand verification", async () => {
    ticketClaims = {
      ...ticketClaims,
      domain: "coach.bio",
      position: "Coach",
    };
    profile.position = "Coach";
    profile.registered_domain = "coach.bio";

    const response = await POST(request(validBody, { host: "127.0.0.1:3000" }));

    expect(response.status).toBe(200);
  });

  it("requires a fresh OTP when a matching session has no retry ledger", async () => {
    verifyOtp.mockResolvedValueOnce({ error: { message: "invalid otp" } });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(createOrExtendStripeTrial).not.toHaveBeenCalled();
  });

  it("verifies the OTP when no session exists and then requires matching identity", async () => {
    getUser
      .mockResolvedValueOnce({ data: { user: null }, error: null })
      .mockResolvedValueOnce({ data: { user: immutableUser }, error: null });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(verifyOtp).toHaveBeenCalledTimes(1);
  });

  it("rejects a stale authenticated session for a different account", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { ...immutableUser, email: "different@example.com" } },
      error: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses immutable ledger decisions and user-scoped provider keys", async () => {
    existingCompletion = true;
    ticketClaims = {
      ...ticketClaims,
      referral: "new-referrer",
      offerCode: "CHANGED",
    };
    completion = {
      ...completion,
      referrer_user_id: "33333333-3333-4333-8333-333333333333",
      offer_code: "LOCKED",
      base_trial_months: 6,
      referral_bonus_months: 1,
      total_trial_months: 7,
    };

    const response = await POST(
      request({ ...validBody, referral: "new-referrer", offerCode: "CHANGED" }),
    );

    expect(response.status).toBe(200);
    expect(createOrExtendStripeTrial).toHaveBeenCalledWith(
      expect.objectContaining({
        months: 7,
        operationKey: immutableUser.id,
      }),
    );
    expect(extendPaidPeriodOrTrial).toHaveBeenCalledWith(
      completion.referrer_user_id,
      1,
      { operationKey: immutableUser.id },
    );
  });

  it("does not repeat required side effects after their ledger steps complete", async () => {
    existingCompletion = true;
    terminalSteps = new Set([
      "password",
      "stripe",
      "profile",
      "referral_reward",
    ]);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(updateUser).not.toHaveBeenCalled();
    expect(createOrExtendStripeTrial).not.toHaveBeenCalled();
    expect(extendPaidPeriodOrTrial).not.toHaveBeenCalled();
    expect(profileUpdate).not.toHaveBeenCalled();
  });

  it("derives offer eligibility from the stored profile birthday", async () => {
    profile.position = "Student";
    profile.birthday = "2000-05-04";
    ticketClaims = {
      ...ticketClaims,
      position: "Student",
      birthday: "04/05/2000",
      offerCode: "STUDENT",
    };
    offerMatches = true;
    completion = {
      ...completion,
      offer_code: "STUDENT",
      base_trial_months: 6,
      total_trial_months: 6,
    };

    const response = await POST(
      request({
        ...validBody,
        birthday: "01/01/1980",
        position: "Student",
        offerCode: "STUDENT",
      }),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "initialize_registration_completion",
      expect.objectContaining({
        p_offer_code: "STUDENT",
        p_base_trial_months: 6,
      }),
    );
  });

  it("records provider failures and returns a controlled retryable result", async () => {
    createOrExtendStripeTrial.mockResolvedValueOnce({
      ok: false,
      code: "PROVIDER_ERROR",
      retryable: true,
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "STRIPE_RETRYABLE",
    });
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({
        p_step: "stripe",
        p_status: "failed",
        p_failure_code: "STRIPE_PROVIDER_ERROR",
      }),
    );
  });

  it("persists a safe free profile when external providers are locally skipped", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        registered_domain: "dental.bio",
        customer_id: null,
        subscription_id: null,
        subscription_status: "FREE",
      }),
    );
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({ p_step: "stripe", p_status: "skipped" }),
    );
  });

  it("does not fail completion when a ledgered notification fails", async () => {
    notificationStepsClaimed = true;
    shouldDisableExternalProvidersForLocalE2E.mockReturnValue(false);
    sendTemplateEmail.mockResolvedValueOnce(undefined);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({
        p_step: "welcome_email",
        p_status: "failed",
        p_failure_code: "WELCOME_EMAIL_FAILED",
      }),
    );
  });

  it("skips notification providers in local E2E mode", async () => {
    notificationStepsClaimed = true;

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendTemplateEmail).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({
        p_step: "welcome_email",
        p_status: "skipped",
      }),
    );
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({
        p_step: "referral_email",
        p_status: "skipped",
      }),
    );
  });

  it("treats an ineligible referrer reward as a completed skip", async () => {
    completion = {
      ...completion,
      referrer_user_id: "33333333-3333-4333-8333-333333333333",
      referral_bonus_months: 1,
      total_trial_months: 2,
    };
    extendPaidPeriodOrTrial.mockResolvedValueOnce({
      ok: false,
      code: "NOT_ELIGIBLE",
      retryable: false,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "finish_registration_completion_step",
      expect.objectContaining({
        p_step: "referral_reward",
        p_status: "skipped",
      }),
    );
  });
});

describe("registration verification helpers", () => {
  it("interprets birthdays as DD/MM/YYYY", () => {
    expect(calculateAge("04/05/2000", new Date(2026, 4, 3))).toBe(25);
    expect(calculateAge("04/05/2000", new Date(2026, 4, 4))).toBe(26);
    expect(calculateAge("2000-05-04", new Date(2026, 4, 4))).toBe(26);
  });

  it("keeps the registered domain with subscription fields", () => {
    expect(
      createUserUpdatePayload("dental.bio", {
        id: "sub_123",
        customer: "cus_123",
        items: { data: [{ price: { id: "price_123" } }] },
        current_period_end: 1_800_000_000,
        trial_end: 1_700_000_000,
        status: "trialing",
      }),
    ).toMatchObject({
      registered_domain: "dental.bio",
      customer_id: "cus_123",
      subscription_id: "sub_123",
      subscription_status: "PRO",
    });
  });
});
