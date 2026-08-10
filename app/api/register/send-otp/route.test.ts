import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

interface ProfileFixture {
  id: string;
  email: string;
  username: string;
  title: string;
  first_name: string;
  last_name: string;
  birthday: string;
  position: string;
  country: string;
  offer_code: string | null;
  registered_domain: string | null;
}

interface CompletionFixture {
  registered_domain: string;
  referrer_user_id: string | null;
  offer_code: string | null;
  completed_at: string | null;
}

const userId = "11111111-1111-4111-8111-111111111111";
const referrerId = "22222222-2222-4222-8222-222222222222";
const originalTicketSecret = process.env.REGISTRATION_TICKET_SECRET;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let profileByEmail: ProfileFixture | null;
let profileByUsername: ProfileFixture | null;
let referrerProfile: { username: string } | null;
let completion: CompletionFixture | null;
let emailConfirmedAt: string | null;
let otpSendError: { message: string } | null;
let otpSendCalls: number;

const signInWithOtp = mock(async () => {
  otpSendCalls += 1;
  return { error: otpSendError };
});

function maybeProfile(column: string, value: string) {
  if (column === "email") return profileByEmail;
  if (column === "username") return profileByUsername;
  if (column === "id" && value === referrerId) return referrerProfile;
  return null;
}

const repository = {
  findProfileByEmail: mock(async (email: string) =>
    maybeProfile("email", email),
  ),
  findProfileByUsername: mock(async (username: string) =>
    maybeProfile("username", username),
  ),
  findUsernameById: mock(
    async (id: string) => maybeProfile("id", id)?.username ?? null,
  ),
  getAuthUserById: mock(async () => ({
    id: userId,
    email: "owner@example.com",
    email_confirmed_at: emailConfirmedAt,
    user_metadata: { registered_domain: "dental.bio" },
  })),
  findCompletion: mock(async () => completion),
};

mock.module("../_lib/registration-authority-repository", () => ({
  registrationAuthorityRepository: repository,
}));
mock.module("@/utils/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp } }),
}));
mock.module("@/utils/blockedDomains", () => ({
  getBlockedDomain: async () => null,
}));
mock.module("@/utils/blockedFingerprints", () => ({
  isBlockedFingerprint: async () => false,
  storeDeviceFingerprint: async () => undefined,
}));
mock.module("@/utils/blockedIps", () => ({
  getClientIp: () => "127.0.0.1",
  isBlockedIp: async () => false,
  storeUserIp: async () => undefined,
}));

const sendOtpRouteModule = "./route.ts?registration-send-otp-test";
const { POST } = await import(sendOtpRouteModule);
const registrationTicketModule =
  "@/lib/auth/registration-ticket.ts?registration-send-ticket-test";
const registrationTicket = await import(registrationTicketModule);
const { createRegistrationTicket, verifyRegistrationTicket } =
  registrationTicket;

const validBody = {
  username: "new-owner",
  title: "Dr",
  email: "owner@example.com",
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
};

const profile: ProfileFixture = {
  id: userId,
  email: validBody.email,
  username: validBody.username,
  title: validBody.title,
  first_name: validBody.firstName,
  last_name: validBody.lastName,
  birthday: "2000-05-04",
  position: validBody.position,
  country: validBody.country,
  offer_code: validBody.offerCode || null,
  registered_domain: "dental.bio",
};

function request(
  body: unknown,
  host = "dental.bio",
  extraHeaders: Record<string, string> = {},
) {
  return new Request(`https://${host}/api/register/send-otp`, {
    method: "POST",
    headers: { "content-type": "application/json", host, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.REGISTRATION_TICKET_SECRET = "registration-route-test-secret";
  profileByEmail = null;
  profileByUsername = null;
  referrerProfile = null;
  completion = null;
  emailConfirmedAt = null;
  otpSendError = null;
  otpSendCalls = 0;
  signInWithOtp.mockClear();
  repository.findProfileByEmail.mockClear();
  repository.findProfileByUsername.mockClear();
  repository.findUsernameById.mockClear();
  repository.getAuthUserById.mockClear();
  repository.findCompletion.mockClear();
});

afterEach(() => {
  if (originalTicketSecret === undefined) {
    delete process.env.REGISTRATION_TICKET_SECRET;
  } else {
    process.env.REGISTRATION_TICKET_SECRET = originalTicketSecret;
  }
  if (originalServiceRoleKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  }
});

describe("POST /api/register/send-otp", () => {
  it("returns shared field errors before calling authentication for malformed input", async () => {
    const response = await POST(request({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { email: expect.any(Array) },
    });
  });

  it("rejects a client-selected brand that does not match the request host", async () => {
    const response = await POST(
      request({ ...validBody, selectedDomain: "coach.bio" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_DOMAIN",
      formError: "This registration link is not valid for this domain.",
    });
  });

  it("does not treat a spoofed forwarded localhost as a local multi-brand request", async () => {
    const response = await POST(
      request(
        { ...validBody, selectedDomain: "coach.bio", position: "Coach" },
        "dental.bio",
        { "x-forwarded-host": "localhost" },
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "INVALID_DOMAIN",
    });
    expect(otpSendCalls).toBe(0);
  });

  it("preserves explicit loopback multi-brand registration", async () => {
    const response = await POST(
      request(
        { ...validBody, selectedDomain: "coach.bio", position: "Coach" },
        "127.0.0.1:3000",
      ),
    );
    const result = await response.json();

    expect(result).toMatchObject({ ok: true });
    expect(response.status).toBe(200);
    expect(otpSendCalls).toBe(1);
  });

  it("rejects a referral value outside the controlled username contract", async () => {
    const response = await POST(
      request({ ...validBody, referral: "../../admin?role=admin" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_REFERRAL",
      fieldErrors: { referral: ["This referral link is not valid."] },
    });
  });

  it("rejects self-referral before sending an OTP", async () => {
    const response = await POST(
      request({ ...validBody, referral: validBody.username }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "INVALID_REFERRAL",
      fieldErrors: { referral: ["You cannot refer your own account."] },
    });
    expect(otpSendCalls).toBe(0);
  });

  it("returns a signed ticket only after sending an OTP for a new account", async () => {
    const response = await POST(request(validBody));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(otpSendCalls).toBe(1);
    expect(result.ok).toBe(true);
    expect(typeof result.data.ticket).toBe("string");
    expect(verifyRegistrationTicket(result.data.ticket)).toMatchObject({
      email: validBody.email,
      username: validBody.username,
      domain: validBody.selectedDomain,
      position: validBody.position,
      birthday: validBody.birthday,
      referral: validBody.referral,
      offerCode: validBody.offerCode,
    });
    expect(repository.findProfileByEmail).toHaveBeenCalledWith(validBody.email);
    expect(repository.findProfileByUsername).toHaveBeenCalledWith(
      validBody.username,
    );
  });

  it("rejects a completed existing account generically without sending an OTP", async () => {
    profileByEmail = profile;
    profileByUsername = profile;
    emailConfirmedAt = "2026-08-03T20:00:00.000Z";
    completion = {
      registered_domain: "dental.bio",
      referrer_user_id: null,
      offer_code: null,
      completed_at: "2026-08-03T20:05:00.000Z",
    };

    const response = await POST(request(validBody));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "OTP_SEND_FAILED",
      formError:
        "We could not send a verification code. Please check your email and try again.",
    });
    expect(otpSendCalls).toBe(0);
  });

  it("resends for a matching unconfirmed account and issues a fresh ticket", async () => {
    profileByEmail = profile;
    profileByUsername = profile;
    emailConfirmedAt = null;

    const response = await POST(request(validBody));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(otpSendCalls).toBe(1);
    expect(verifyRegistrationTicket(result.data.ticket)).toMatchObject({
      email: profile.email,
      username: profile.username,
      domain: "dental.bio",
      position: profile.position,
      birthday: validBody.birthday,
      offerCode: "",
    });
  });

  it("requires the prior signed ticket when the OTP provider confirms new users immediately", async () => {
    profileByEmail = profile;
    profileByUsername = profile;
    emailConfirmedAt = "2026-08-03T20:00:00.000Z";

    const withoutTicket = await POST(request(validBody));
    expect(withoutTicket.status).toBe(400);
    expect(otpSendCalls).toBe(0);

    const priorTicket = createRegistrationTicket({
      email: validBody.email,
      username: validBody.username,
      domain: validBody.selectedDomain,
      position: validBody.position,
      birthday: validBody.birthday,
      referral: validBody.referral,
      offerCode: validBody.offerCode,
    });
    const response = await POST(
      request({ ...validBody, registrationTicket: priorTicket }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(otpSendCalls).toBe(1);
    expect(verifyRegistrationTicket(result.data.ticket)).toMatchObject({
      email: validBody.email,
      username: validBody.username,
      domain: validBody.selectedDomain,
    });
  });

  it("uses immutable ledger decisions when retrying an incomplete confirmed registration", async () => {
    profileByEmail = profile;
    profileByUsername = profile;
    referrerProfile = { username: "locked-referrer" };
    emailConfirmedAt = "2026-08-03T20:00:00.000Z";
    completion = {
      registered_domain: "dental.bio",
      referrer_user_id: referrerId,
      offer_code: "LOCKED",
      completed_at: null,
    };

    const response = await POST(
      request({ ...validBody, referral: "new-referrer", offerCode: "NEW" }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(otpSendCalls).toBe(1);
    expect(verifyRegistrationTicket(result.data.ticket)).toMatchObject({
      email: profile.email,
      username: profile.username,
      domain: completion.registered_domain,
      position: profile.position,
      birthday: validBody.birthday,
      referral: "locked-referrer",
      offerCode: "LOCKED",
    });
  });

  it("fails closed before sending an OTP when no ticket secret is configured", async () => {
    delete process.env.REGISTRATION_TICKET_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await POST(request(validBody));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: "REGISTRATION_UNAVAILABLE",
      formError: "Registration is temporarily unavailable. Please try again.",
    });
    expect(otpSendCalls).toBe(0);
  });

  it("returns the existing account check failure when a repository operation fails", async () => {
    repository.findProfileByEmail.mockRejectedValueOnce(new Error("db"));

    const response = await POST(request(validBody));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "ACCOUNT_CHECK_FAILED",
    });
  });
});
