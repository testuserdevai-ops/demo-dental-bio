import "server-only";

import {
  insertSecurityLogEntry,
  type SecurityLogEntry,
} from "@/lib/security/security-signal-repository";

export type {
  SecurityEventType,
  SecurityLogDetails,
  SecurityLogEntry,
} from "@/lib/security/security-signal-repository";

/**
 * Logs a security event to the security_logs table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
  try {
    await insertSecurityLogEntry(entry);
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Helper to extract common request metadata for logging.
 */
export function getRequestMeta(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return {
    ip_address: forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || undefined,
    user_agent: request.headers.get("user-agent") || undefined,
  };
}
