import { z } from "zod";

import { getBirthdayBounds } from "./birthday-policy";

const nameSchema = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(50, "Must be 50 characters or less")
  .regex(/^[\p{L}\p{M}\s'-]+$/u, "Contains invalid characters");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be 30 characters or less")
  .regex(
    /^[a-z0-9._-]+$/,
    "Username can only contain letters, numbers, dots, underscores, or hyphens",
  );

export const claimSchema = z.object({ username: usernameSchema });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  deviceFingerprint: z.string().trim().max(512).optional().default(""),
});

export const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(100, "Must be 100 characters or less")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

function isValidBirthday(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isAdult(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const { adultCutoff } = getBirthdayBounds();
  return new Date(year, month - 1, day) <= adultCutoff;
}

export const birthdaySchema = z
  .string()
  .trim()
  .refine(isValidBirthday, "Enter a valid date in DD/MM/YYYY format")
  .refine(isAdult, "You must be at least 18 years old");

export const registrationSchema = z
  .object({
    username: usernameSchema,
    title: z.string().trim().max(20, "Title is too long").default(""),
    email: loginSchema.shape.email,
    firstName: nameSchema,
    lastName: nameSchema,
    birthday: birthdaySchema,
    position: z.string().trim().min(1, "Position is required").max(100),
    country: z.string().trim().min(2, "Country is required").max(100),
    selectedDomain: z.string().trim().toLowerCase().min(1),
    referral: z.string().trim().max(100).optional().default(""),
    offerCode: z.string().trim().max(50).optional().default(""),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  email: loginSchema.shape.email,
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const recoveryRequestSchema = z.object({
  email: loginSchema.shape.email,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ClaimInput = z.infer<typeof claimSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type RecoveryRequestInput = z.infer<typeof recoveryRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
