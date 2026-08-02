export const socialPlatforms = ["twitter", "instagram", "facebook", "tiktok"] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export type SocialProfileConfig = {
  label: string;
  placeholder: string;
  helperText: string;
  baseUrl: string;
};

/**
 * Accepted formats are intentionally kept beside the parser so the dashboard
 * documentation cannot drift from the client/server validation rules.
 *
 * Every platform accepts an HTTPS profile URL, a username, or an @username.
 * Query strings, fragments, host casing, and trailing slashes on supported
 * profile URLs are normalized away. Facebook additionally accepts
 * profile.php?id=<numeric id> and legacy /pages/<name>/<numeric id> page URLs.
 */
export const socialProfileConfigs: Record<SocialPlatform, SocialProfileConfig> = {
  twitter: {
    label: "X profile (optional)",
    placeholder: "https://x.com/dentalbio",
    helperText: "Paste an x.com or twitter.com profile URL, or enter username / @username. Example: https://x.com/dentalbio",
    baseUrl: "https://x.com/",
  },
  instagram: {
    label: "Instagram profile (optional)",
    placeholder: "https://www.instagram.com/dentalbio",
    helperText: "Paste an Instagram profile URL, or enter username / @username. Example: https://www.instagram.com/dentalbio",
    baseUrl: "https://www.instagram.com/",
  },
  facebook: {
    label: "Facebook profile or page (optional)",
    placeholder: "https://www.facebook.com/dentalbio",
    helperText: "Paste a Facebook profile/page URL, or enter username / @username. Example: https://www.facebook.com/dentalbio",
    baseUrl: "https://www.facebook.com/",
  },
  tiktok: {
    label: "TikTok profile (optional)",
    placeholder: "https://www.tiktok.com/@dentalbio",
    helperText: "Paste a TikTok profile URL, or enter username / @username. Example: @dentalbio",
    baseUrl: "https://www.tiktok.com/@",
  },
};

export type SocialProfileParseResult =
  | { valid: true; url: string; username?: string; blank: boolean; message: string }
  | { valid: false; message: string };

const usernamePatterns: Record<SocialPlatform, RegExp> = {
  facebook: /^[a-zA-Z0-9.]{5,50}$/,
  twitter: /^[a-zA-Z0-9_]{1,15}$/,
  instagram: /^[a-zA-Z0-9._]{1,30}$/,
  tiktok: /^[a-zA-Z0-9._]{1,24}$/,
};

const supportedHosts: Record<SocialPlatform, Set<string>> = {
  twitter: new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com"]),
  instagram: new Set(["instagram.com", "www.instagram.com"]),
  facebook: new Set(["facebook.com", "www.facebook.com", "m.facebook.com"]),
  tiktok: new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]),
};

const reservedPaths: Partial<Record<SocialPlatform, Set<string>>> = {
  twitter: new Set(["compose", "explore", "home", "i", "intent", "messages", "search", "settings", "share"]),
  instagram: new Set(["accounts", "direct", "directory", "explore", "p", "reel", "reels", "stories"]),
  facebook: new Set(["events", "friends", "gaming", "groups", "help", "login", "marketplace", "messages", "pages", "reel", "share", "sharer", "stories", "watch"]),
};

function invalid(platform: SocialPlatform, detail: string): SocialProfileParseResult {
  return { valid: false, message: `${socialProfileConfigs[platform].label.replace(" (optional)", "")}: ${detail}` };
}

function normalizedUsername(input: string, platform: SocialPlatform): string | null {
  const username = input.startsWith("@") ? input.slice(1) : input;
  return usernamePatterns[platform].test(username) ? username : null;
}

function pathSegments(url: URL): string[] | null {
  try {
    return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
}

function parseFacebookUrl(url: URL, segments: string[]): SocialProfileParseResult {
  if (segments.length === 1 && segments[0].toLowerCase() === "profile.php") {
    const id = url.searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return invalid("facebook", "profile.php URLs must contain a numeric id.");
    }
    return {
      valid: true,
      url: `https://www.facebook.com/profile.php?id=${id}`,
      blank: false,
      message: "Valid Facebook profile URL.",
    };
  }

  const facebookCollection = segments[0]?.toLowerCase();
  if (segments.length === 3 && (facebookCollection === "pages" || facebookCollection === "people")) {
    const [_, displayName, numericId] = segments;
    if (!/^[a-zA-Z0-9._-]+$/.test(displayName) || !/^\d+$/.test(numericId)) {
      return invalid("facebook", "use a valid Facebook profile or page URL.");
    }
    return {
      valid: true,
      url: `https://www.facebook.com/${facebookCollection}/${displayName}/${numericId}`,
      blank: false,
      message: `Valid Facebook ${facebookCollection === "people" ? "profile" : "page"} URL.`,
    };
  }

  if (segments.length !== 1) {
    return invalid("facebook", "use a public profile or page URL, not a post, group, or share URL.");
  }

  const username = segments[0];
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(username) || reservedPaths.facebook?.has(username.toLowerCase())) {
    return invalid("facebook", "use a valid public profile/page username or URL.");
  }

  return {
    valid: true,
    url: `${socialProfileConfigs.facebook.baseUrl}${username}`,
    username,
    blank: false,
    message: "Valid Facebook profile or page URL.",
  };
}

function parseProfileUrl(url: URL, platform: SocialPlatform): SocialProfileParseResult {
  if (url.protocol !== "https:") {
    return invalid(platform, "only secure https:// profile URLs are accepted.");
  }
  if (url.username || url.password || url.port) {
    return invalid(platform, "the profile URL must not contain credentials or a custom port.");
  }
  if (!supportedHosts[platform].has(url.hostname.toLowerCase())) {
    return invalid(platform, `use a supported ${socialProfileConfigs[platform].label.replace(" (optional)", "")} host.`);
  }

  const segments = pathSegments(url);
  if (!segments) return invalid(platform, "the URL contains malformed path characters.");
  if (platform === "facebook") return parseFacebookUrl(url, segments);
  if (segments.length !== 1) {
    return invalid(platform, "use the profile URL, not a post, video, or settings URL.");
  }

  let segment = segments[0];
  if (platform === "tiktok") {
    if (!segment.startsWith("@")) {
      return invalid(platform, "profile URLs must use /@username.");
    }
    segment = segment.slice(1);
  }

  const username = normalizedUsername(segment, platform);
  if (!username || reservedPaths[platform]?.has(username.toLowerCase())) {
    return invalid(platform, "use a valid public-profile username or URL.");
  }

  return {
    valid: true,
    url: `${socialProfileConfigs[platform].baseUrl}${username}`,
    username,
    blank: false,
    message: `Valid ${socialProfileConfigs[platform].label.replace(" (optional)", "")} URL.`,
  };
}

export function parseSocialMediaProfile(input: unknown, platform: SocialPlatform): SocialProfileParseResult {
  if (typeof input !== "string") return invalid(platform, "enter a profile URL or username.");

  const value = input.trim();
  if (!value) {
    return input.length === 0
      ? { valid: true, url: "", blank: true, message: "Optional field left blank." }
      : invalid(platform, "remove whitespace or leave the optional field completely blank.");
  }
  if (/\s/.test(value)) return invalid(platform, "spaces are not allowed in profile URLs or usernames.");

  const looksLikeUrl = value.includes("://") || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.toLowerCase().startsWith("www.");
  if (looksLikeUrl) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return invalid(platform, "enter a complete, well-formed https:// profile URL.");
    }
    return parseProfileUrl(url, platform);
  }

  if (value.includes("/") || /(?:x|twitter|instagram|facebook|tiktok)\.com/i.test(value)) {
    return invalid(platform, "enter a complete https:// profile URL or only the username.");
  }

  const username = normalizedUsername(value, platform);
  if (!username || reservedPaths[platform]?.has(username.toLowerCase())) {
    return invalid(platform, "enter a valid public-profile username.");
  }

  return {
    valid: true,
    url: `${socialProfileConfigs[platform].baseUrl}${username}`,
    username,
    blank: false,
    message: `Valid ${socialProfileConfigs[platform].label.replace(" (optional)", "")} username.`,
  };
}

export function getSafeSocialProfileUrl(input: unknown, platform: SocialPlatform): string | null {
  const result = parseSocialMediaProfile(input, platform);
  return result.valid && !result.blank ? result.url : null;
}
