import { z } from "zod";

/**
 * Validates a URL string against a common URL pattern.
 * Moved from utils/functions/functions.ts for centralization.
 */
export function isValidUrlRegex(url: string): boolean {
  const pattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
  return pattern.test(url);
}

export const registerUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username must be 20 characters or less" })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: "Username can only contain letters, numbers, underscores, or hyphens",
    }),
})

export const registerSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Title is required" })
      .max(20, { message: "Title too long" })
      .optional()
      .default(""),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email({ message: "Invalid email address" }),

    firstName: z
      .string()
      .trim()
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name too long" })
      .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in first name" }),

    lastName: z
      .string()
      .trim()
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name too long" })
      .regex(/^[\p{L}\p{M}\s'-]+$/u, { message: "Invalid characters in last name" }),

    position: z
      .string()
      .trim()
      .min(1, { message: "Position is required" })
      .max(100, { message: "Position too long" })
      .optional()
      .default(""),

    country: z
      .string()
      .trim()
      .min(2, { message: "Country name too short" })
      .max(100, { message: "Country name too long" }),

    offerCode: z
      .string()
      .trim()
      .max(50, { message: "Offer code too long" })
      .optional()
      .default(""),

    password: z
      .string()
      .min(8, { message: "Must be at least 8 characters" })
      .max(100, { message: "Password too long" })
      .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character" }),

    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordRules = [
  {
    id: "minLength",
    label: "At least 8 characters",
    validate: (pw: string) => pw.length >= 8,
  },
  {
    id: "hasUpper",
    label: "Contains an uppercase letter",
    validate: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    id: "hasLower",
    label: "Contains a lowercase letter",
    validate: (pw: string) => /[a-z]/.test(pw),
  },
  {
    id: "hasNumber",
    label: "Contains a number",
    validate: (pw: string) => /[0-9]/.test(pw),
  },
  {
    id: "hasSpecial",
    label: "Contains a special character",
    validate: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
];
