import "server-only";

import { isIP } from "node:net";
import { z } from "zod";

const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(25);
const referenceLimitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(10_000)
  .default(25);
const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(160).optional(),
);
const ipAddressSchema = z
  .string()
  .trim()
  .min(3)
  .max(45)
  .refine((value) => isIP(value) !== 0, "Invalid IP address");

export const pageQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});
export const referencePageQuerySchema = z.object({
  page: pageSchema,
  limit: referenceLimitSchema,
});

export const blockedDomainCreateSchema = z
  .object({
    domain: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(253)
      .regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/),
  })
  .strict();
export const blockedDomainUpdateSchema = z
  .object({ id: z.number().int().positive(), is_active: z.boolean() })
  .strict();
export const idSchema = z.object({ id: z.number().int().positive() }).strict();

export const blockedFingerprintCreateSchema = z
  .object({
    fingerprint: z.string().trim().min(1).max(512),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();
export const fingerprintSchema = z
  .object({ fingerprint: z.string().trim().min(1).max(512) })
  .strict();

export const blockedIpCreateSchema = z
  .object({
    ip_address: ipAddressSchema,
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();
export const ipSchema = z.object({ ip_address: ipAddressSchema }).strict();

export const blockUserSchema = z
  .object({
    user_id: z.string().uuid(),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .strict();
export const userIdSchema = z.object({ user_id: z.string().uuid() }).strict();
export const verificationUpdateSchema = z
  .object({ targetUserId: z.string().uuid(), isVerified: z.boolean() })
  .strict();

export const securityLogQuerySchema = pageQuerySchema.extend({
  event_type: optionalText,
  email: z.string().trim().email().max(320).optional(),
  ip: ipAddressSchema.optional(),
});

export const profileAuditQuerySchema = pageQuerySchema.extend({
  table_name: optionalText,
  operation: optionalText,
  actor_role: optionalText,
  email: z.string().trim().email().max(320).optional(),
});

const incomeDateRangeFields = z.object({
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
});

export const incomeQuerySchema = incomeDateRangeFields
  .strict()
  .refine(
    ({ startDate, endDate }) =>
      (startDate === undefined) === (endDate === undefined),
    "Provide both start and end dates",
  )
  .refine(
    ({ startDate, endDate }) =>
      startDate === undefined || endDate === undefined || startDate <= endDate,
    "Start date must not be after end date",
  );

export const securityUsersRequestSchema = z
  .object({
    page: pageSchema,
    limit: limitSchema,
    search: optionalText,
    sort: z
      .enum(["identity", "plan", "verification", "registered"])
      .default("registered"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    filters: z
      .object({
        email: optionalText,
        username: optionalText,
        first_name: optionalText,
        middle_name: optionalText,
        last_name: optionalText,
        country: optionalText,
        isVerified: z
          .union([z.boolean(), z.literal("true"), z.literal("false")])
          .optional(),
        subscription_status: optionalText,
      })
      .strict()
      .default({}),
  })
  .strict();
