import { z } from "zod";

export const referralInviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(254, "Email address is too long"),
  })
  .strict();

export type ReferralInviteInput = z.infer<typeof referralInviteSchema>;
