import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import {
  birthdaySchema,
  loginSchema,
  usernameSchema,
} from "@/lib/auth/schemas";

const REGISTRATION_TICKET_TTL_MS = 45 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_TICKET_LENGTH = 4096;

const registrationTicketInputSchema = z.object({
  email: loginSchema.shape.email,
  username: usernameSchema,
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(253)
    .regex(/^[a-z0-9.-]+$/),
  position: z.string().trim().min(1).max(100),
  birthday: birthdaySchema,
  referral: z
    .union([usernameSchema, z.literal("")])
    .optional()
    .default(""),
  offerCode: z.string().trim().max(50).optional().default(""),
});

const registrationTicketClaimsSchema = registrationTicketInputSchema
  .extend({
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  })
  .strict();

export type RegistrationTicketInput = z.input<
  typeof registrationTicketInputSchema
>;
export type RegistrationTicketClaims = z.infer<
  typeof registrationTicketClaimsSchema
>;

function getTicketSecret(): string | null {
  return (
    process.env.REGISTRATION_TICKET_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

function signPayload(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createRegistrationTicket(
  input: RegistrationTicketInput,
): string | null {
  const secret = getTicketSecret();
  const parsed = registrationTicketInputSchema.safeParse(input);
  if (!secret || !parsed.success) return null;

  const issuedAt = Date.now();
  const claims: RegistrationTicketClaims = {
    email: parsed.data.email,
    username: parsed.data.username,
    domain: parsed.data.domain,
    position: parsed.data.position,
    birthday: parsed.data.birthday,
    referral: parsed.data.referral,
    offerCode: parsed.data.offerCode,
    issuedAt,
    expiresAt: issuedAt + REGISTRATION_TICKET_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = signPayload(payload, secret).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyRegistrationTicket(
  ticket: string,
): RegistrationTicketClaims | null {
  const secret = getTicketSecret();
  if (!secret || !ticket || ticket.length > MAX_TICKET_LENGTH) return null;

  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [payload, encodedSignature] = parts;
  if (!payload || !encodedSignature) return null;

  try {
    const actualSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = signPayload(payload, secret);
    if (
      actualSignature.toString("base64url") !== encodedSignature ||
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as unknown;
    const parsed = registrationTicketClaimsSchema.safeParse(decoded);
    if (!parsed.success) return null;

    const now = Date.now();
    const { issuedAt, expiresAt } = parsed.data;
    if (
      issuedAt > now + MAX_CLOCK_SKEW_MS ||
      expiresAt <= now ||
      expiresAt - issuedAt !== REGISTRATION_TICKET_TTL_MS
    ) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
