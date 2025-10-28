import { z } from "zod";

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

export const registerSchema = z.object({
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
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password too long" }),

  confirmPassword: z
    .string()
    .min(8, { message: "Confirm password is required" }),
});
