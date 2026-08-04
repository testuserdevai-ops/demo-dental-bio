import { z } from "zod";

export const verificationSessionResponseSchema = z
  .object({
    verification: z.object({
      id: z.string().min(1),
      url: z
        .string()
        .url()
        .refine((value) => value.startsWith("https://"), {
          message: "Verification URL must use HTTPS",
        }),
    }),
    redirectOrigin: z.string().url(),
  })
  .superRefine((value, context) => {
    if (new URL(value.verification.url).origin !== value.redirectOrigin) {
      context.addIssue({
        code: "custom",
        path: ["verification", "url"],
        message: "Verification URL does not match the configured provider",
      });
    }
  });

export type VerificationSessionResponse = z.infer<
  typeof verificationSessionResponseSchema
>;

export const adminVerificationUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().nullable(),
  isVerified: z.boolean(),
  role: z.string(),
});

export type AdminVerificationUser = z.infer<typeof adminVerificationUserSchema>;
