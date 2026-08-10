import "server-only";

import {
  lookupBlockedIp,
  upsertUserIpSignal,
} from "@/lib/security/security-signal-repository";

/**
 * Extracts the client IP from request headers.
 * Works with proxied (x-forwarded-for, x-real-ip) and direct connections.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; the first is the client
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}

/**
 * Checks if an IP address is in the blocked_ips table.
 * Uses an allowlisted server-only authority operation because these tables have
 * no public RLS policies.
 */
export async function isBlockedIp(
  ip: string | null | undefined,
): Promise<boolean> {
  if (!ip) return false;

  return lookupBlockedIp(ip);
}

/**
 * Records an IP address for a user (many-to-many).
 * One user can have multiple IPs, one IP can be used by multiple users.
 * Uses an allowlisted server-only authority operation for writes.
 */
export async function storeUserIp(
  userId: string,
  ip: string | null | undefined,
): Promise<void> {
  if (!ip) return;

  await upsertUserIpSignal(userId, ip, new Date().toISOString());
}
