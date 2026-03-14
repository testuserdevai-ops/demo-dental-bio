export function extractUsername(url: string, platform: Platform): string | null {
  const usernamePattern: Record<Platform, RegExp> = {
    facebook: /(?:https?:\/\/(?:www\.)?facebook\.com\/)([a-zA-Z0-9._]+)/,
    twitter: /(?:https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/)([a-zA-Z0-9_]+)/,
    instagram: /(?:https?:\/\/(?:www\.)?instagram\.com\/)([a-zA-Z0-9._]+)\/?/,
    tiktok: /(?:https?:\/\/(?:www\.)?tiktok\.com\/@?)([a-zA-Z0-9._]+)\/?/
  };

  const match = url.match(usernamePattern[platform]);
  return match ? match[1] : null;  // Return the captured username or null if not found
}