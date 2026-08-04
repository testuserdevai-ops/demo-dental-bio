import { afterEach, describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

const originalTicketSecret = process.env.REGISTRATION_TICKET_SECRET;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalDateNow = Date.now;

const ticketModulePath = "./registration-ticket.ts?registration-ticket-test";
const { createRegistrationTicket, verifyRegistrationTicket } = await import(
  ticketModulePath
);

const input = {
  email: "  Owner@Example.COM ",
  username: "  New-Owner ",
  domain: "DENTAL.BIO",
  position: "Dentist",
  birthday: "04/05/2000",
  referral: "referrer",
  offerCode: "STUDENT",
};

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
  Date.now = originalDateNow;
});

describe("registration tickets", () => {
  it("returns normalized, bounded claims from a valid signed ticket", () => {
    process.env.REGISTRATION_TICKET_SECRET = "ticket-secret";
    Date.now = () => Date.UTC(2026, 7, 3, 20, 0, 0);

    const ticket = createRegistrationTicket(input);

    expect(ticket).not.toBeNull();
    expect(verifyRegistrationTicket(ticket!)).toEqual({
      email: "owner@example.com",
      username: "new-owner",
      domain: "dental.bio",
      position: "Dentist",
      birthday: "04/05/2000",
      referral: "referrer",
      offerCode: "STUDENT",
      issuedAt: 1785787200000,
      expiresAt: 1785789900000,
      nonce: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
    });
  });

  it("does not serialize passwords, device signals, roles, or billing fields", () => {
    process.env.REGISTRATION_TICKET_SECRET = "ticket-secret";
    const ticket = createRegistrationTicket({
      ...input,
      password: "Password!1",
      deviceFingerprint: "fingerprint",
      location: "Cairo",
      role: "admin",
      subscription: "premium",
      stripeCustomerId: "cus_secret",
    } as typeof input);

    const [encodedPayload] = ticket!.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("deviceFingerprint");
    expect(payload).not.toHaveProperty("location");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("subscription");
    expect(payload).not.toHaveProperty("stripeCustomerId");
  });

  it("rejects payload and signature tampering", () => {
    process.env.REGISTRATION_TICKET_SECRET = "ticket-secret";
    const ticket = createRegistrationTicket(input)!;
    const [payload, signature] = ticket.split(".");

    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${signature}`;
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const finalIndex = alphabet.indexOf(signature.at(-1)!);
    const nonCanonicalFinalIndex = (finalIndex & ~3) | ((finalIndex + 1) & 3);
    const tamperedSignature = `${payload}.${signature.slice(0, -1)}${alphabet[nonCanonicalFinalIndex]}`;

    expect(verifyRegistrationTicket(tamperedPayload)).toBeNull();
    expect(verifyRegistrationTicket(tamperedSignature)).toBeNull();
  });

  it("rejects an expired ticket", () => {
    process.env.REGISTRATION_TICKET_SECRET = "ticket-secret";
    const issuedAt = Date.UTC(2026, 7, 3, 20, 0, 0);
    Date.now = () => issuedAt;
    const ticket = createRegistrationTicket(input)!;

    Date.now = () => issuedAt + 45 * 60 * 1000 + 1;

    expect(verifyRegistrationTicket(ticket)).toBeNull();
  });

  it("rejects a ticket signed by a different secret", () => {
    process.env.REGISTRATION_TICKET_SECRET = "first-secret";
    const ticket = createRegistrationTicket(input)!;

    process.env.REGISTRATION_TICKET_SECRET = "second-secret";

    expect(verifyRegistrationTicket(ticket)).toBeNull();
  });

  it("fails closed when neither server-only secret is configured", () => {
    delete process.env.REGISTRATION_TICKET_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(createRegistrationTicket(input)).toBeNull();
    expect(verifyRegistrationTicket("payload.signature")).toBeNull();
  });

  it("falls back to the service-role secret without exposing it", () => {
    delete process.env.REGISTRATION_TICKET_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";

    const ticket = createRegistrationTicket(input);

    expect(ticket).not.toContain("service-role-secret");
    expect(verifyRegistrationTicket(ticket!)).toMatchObject({
      email: "owner@example.com",
      username: "new-owner",
    });
  });
});
