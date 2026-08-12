import { z } from "zod";

export const SUPPORTED_CUSTOM_GOAL_EVENTS = [
  "link_click",
  "product_click",
  "treatment_cta_click",
  "service_cta_click",
] as const;

export const saveConversionGoalSchema = z
  .object({
    goalId: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(80),
    eventType: z.enum([
      "booking_click",
      "phone_click",
      "email_click",
      "directions_click",
      "enquiry_submit",
      ...SUPPORTED_CUSTOM_GOAL_EVENTS,
    ]),
    entityUuid: z.string().uuid().nullable(),
    entityBigint: z.number().int().positive().nullable(),
    isPrimary: z.boolean(),
    attributionWindowDays: z.union([
      z.literal(7),
      z.literal(30),
      z.literal(60),
      z.literal(90),
    ]),
    enabled: z.boolean(),
    valueMinor: z.number().int().nonnegative().nullable(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/)
      .nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.valueMinor === null) !== (value.currency === null)) {
      context.addIssue({
        code: "custom",
        path: ["valueMinor"],
        message: "Enter both a value and currency or leave both empty",
      });
    }
    if (
      value.goalId === null &&
      value.eventType === "product_click" &&
      value.entityBigint === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["entityBigint"],
        message: "Select a product",
      });
    }
    if (
      value.goalId === null &&
      value.eventType !== "product_click" &&
      value.entityUuid === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["entityUuid"],
        message: "Select a supported profile item",
      });
    }
  });

export type SaveConversionGoalInput = z.infer<typeof saveConversionGoalSchema>;
