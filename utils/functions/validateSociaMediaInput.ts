import { platformBaseUrls } from "../global_constants";

export function validateSocialMediaInput(input: string, platform: Platform): ValidationResult {
  const usernamePattern: Record<Platform, RegExp> = {
    facebook: /^[a-zA-Z0-9._]{5,50}$/, // Facebook usernames (5–50 characters)
    twitter: /^[a-zA-Z0-9_]{1,15}$/, // Twitter usernames (1–15 characters)
    instagram: /^[a-zA-Z0-9._]{1,30}$/, // Instagram usernames (1–30 characters)
    tiktok: /^[a-zA-Z0-9._]{1,24}$/ // TikTok usernames (1–24 characters)
  };

  const urlPattern: Record<Platform, RegExp> = {
    facebook: /^https:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._]+$/,
    twitter: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+(\/.*)?$/,
    instagram: /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/,
    tiktok: /^https:\/\/(www\.)?tiktok\.com\/@?[a-zA-Z0-9._]+\/?$/
  };

  if (!input) {
    return { valid: false, message: "Input cannot be empty." };
  }

  const isUrl = input.startsWith("http");
  if (isUrl) {
    // Validate full URL
    if (urlPattern[platform].test(input)) {
      return { valid: true, message: "Valid URL.", url: input };
    } else {
      return { valid: false, message: `Invalid URL. Please ensure it starts with the correct platform link.` };
    }
  } else {
    // Validate username
    if (usernamePattern[platform].test(input)) {
      return { valid: true, message: "Valid username.", url: platformBaseUrls[platform] + input };
    } else {
      return { valid: false, message: `Invalid username. Please check the format and try again` };
    }
  }
}