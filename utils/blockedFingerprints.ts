import "server-only";

import {
  lookupBlockedFingerprint,
  upsertUserFingerprintSignal,
} from "@/lib/security/security-signal-repository";

/**
 * Checks if the device fingerprint is in the blocked_fingerprints table.
 * Uses an allowlisted server-only authority operation because these tables have
 * no public RLS policies.
 */
export async function isBlockedFingerprint(
  fingerprint: string | null | undefined,
): Promise<boolean> {
  if (!fingerprint) return false;

  return lookupBlockedFingerprint(fingerprint);
}

/**
 * Records a device fingerprint for a user (many-to-many).
 * One user can have multiple devices, one device can be used by multiple users.
 * Uses an allowlisted server-only authority operation for writes.
 */
export async function storeDeviceFingerprint(
  userId: string,
  fingerprint: string | null | undefined,
): Promise<void> {
  if (!fingerprint) return;

  await upsertUserFingerprintSignal(
    userId,
    fingerprint,
    new Date().toISOString(),
  );
}
