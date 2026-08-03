import {
  parseSocialMediaProfile,
  type SocialPlatform,
} from "./socialMediaProfiles";

export function extractUsername(
  value: string,
  platform: SocialPlatform,
): string | null {
  const result = parseSocialMediaProfile(value, platform);
  return result.valid ? (result.username ?? null) : null;
}
