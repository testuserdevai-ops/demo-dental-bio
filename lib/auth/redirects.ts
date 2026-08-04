const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function safeInternalPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /%2f|%5c/i.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://dental.bio");
    return parsed.origin === "https://dental.bio"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
