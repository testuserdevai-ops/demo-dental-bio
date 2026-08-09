import { z } from "zod";
import {
  parseSocialMediaProfile,
  socialPlatforms,
  type SocialPlatform,
} from "@/utils/functions/socialMediaProfiles";

const optionalText = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid HTTP(S) URL");

export const profileInputSchema = z
  .object({
    title: optionalText(100),
    position: optionalText(100),
    gdcNo: optionalText(20),
    qualification: optionalText(100),
    aboutTitle: z.string().trim().min(1, "Profile title is required").max(100),
    aboutText: optionalText(500),
    phone: optionalText(20).regex(
      /^[+\d\s()-]*$/,
      "Invalid phone number format",
    ),
    contactEmail: z
      .string()
      .trim()
      .email("Invalid email address")
      .or(z.literal("")),
    website: optionalUrl,
    bookingLink: optionalUrl,
    bookingEnabled: z.boolean(),
  })
  .strict();

const socialShape = Object.fromEntries(
  [...socialPlatforms, "other"].map((platform) => [
    platform,
    z.string().trim().max(2048),
  ]),
) as Record<SocialPlatform | "other", z.ZodString>;

export const socialLinksInputSchema = z
  .object(socialShape)
  .strict()
  .superRefine((value, context) => {
    for (const platform of socialPlatforms) {
      const parsed = parseSocialMediaProfile(value[platform], platform);
      if (!parsed.valid)
        context.addIssue({
          code: "custom",
          path: [platform],
          message: parsed.message,
        });
    }
    if (value.other && !optionalUrl.safeParse(value.other).success)
      context.addIssue({
        code: "custom",
        path: ["other"],
        message: "Enter a valid HTTP(S) URL",
      });
  })
  .transform((value) => ({
    ...value,
    ...Object.fromEntries(
      socialPlatforms.map((platform) => {
        const parsed = parseSocialMediaProfile(value[platform], platform);
        return [platform, parsed.valid ? parsed.url : ""];
      }),
    ),
  }));

export type ProfileInput = z.input<typeof profileInputSchema>;
export type SocialLinksInput = z.input<typeof socialLinksInputSchema>;
