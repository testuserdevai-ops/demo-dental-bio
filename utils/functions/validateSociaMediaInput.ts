import { parseSocialMediaProfile, type SocialPlatform } from "./socialMediaProfiles";

/** @deprecated Prefer parseSocialMediaProfile for its explicit blank state. */
export function validateSocialMediaInput(input: string, platform: SocialPlatform): ValidationResult {
  const result = parseSocialMediaProfile(input, platform);
  return result.valid
    ? { valid: true, message: result.message, url: result.url }
    : { valid: false, message: result.message };
}
