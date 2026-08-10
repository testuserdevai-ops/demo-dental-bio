import { z } from "zod";
import { settingsSchema } from "@/lib/validation";

export const settingsTitles = [
  "Dr",
  "Mr",
  "Mrs",
  "Miss",
  "Ms",
  "Prof",
  "Mx",
  "M",
  "Pr",
  "N/A",
] as const;

function isValidPastDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date <= new Date()
  );
}

export const dashboardSettingsSchema = settingsSchema.extend({
  title: z.enum(settingsTitles),
  // Existing accounts may have usernames created before the current 20-char
  // registration limit. The action applies that tighter rule only on change.
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(64, "Username is too long")
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Username can only contain letters, numbers, underscores, or hyphens",
    }),
  birthday: z
    .string()
    .refine(isValidPastDate, "Enter a valid birthday that is not in the future")
    .or(z.literal("")),
});

export type DashboardSettingsInput = z.input<typeof dashboardSettingsSchema>;
