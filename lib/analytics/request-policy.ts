import { analyticsEventSchema, type AnalyticsEvent } from "./contract";

const BOT_USER_AGENT =
  /(?:bot|crawler|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|preview)/i;

export type AnalyticsRequestDecision =
  | { accepted: true; event: AnalyticsEvent; requestIdentity: string }
  | {
      accepted: false;
      reason: "bot" | "consent" | "context" | "invalid" | "privacy_signal";
    };

function getRequestIdentity(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unavailable"
  );
}

export function evaluateAnalyticsRequest(
  value: unknown,
  headers: Headers,
): AnalyticsRequestDecision {
  const parsed = analyticsEventSchema.safeParse(value);
  if (!parsed.success) return { accepted: false, reason: "invalid" };

  if (parsed.data.renderContext.kind !== "public") {
    return { accepted: false, reason: "context" };
  }
  if (
    parsed.data.consent !== "granted" &&
    parsed.data.consent !== "not_required"
  ) {
    return { accepted: false, reason: "consent" };
  }
  if (
    parsed.data.consent === "not_required" &&
    (parsed.data.client?.anonymousVisitorId || parsed.data.client?.sessionId)
  ) {
    return { accepted: false, reason: "consent" };
  }
  if (headers.get("dnt") === "1" || headers.get("sec-gpc") === "1") {
    return { accepted: false, reason: "privacy_signal" };
  }

  const userAgent = headers.get("user-agent")?.trim();
  if (!userAgent || BOT_USER_AGENT.test(userAgent)) {
    return { accepted: false, reason: "bot" };
  }

  return {
    accepted: true,
    event: parsed.data,
    requestIdentity: getRequestIdentity(headers),
  };
}
