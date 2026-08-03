import supabaseAdmin from "@/utils/supabase/supabaseAdmin";

/**
 * Checks if the device fingerprint is in the blocked_fingerprints table.
 * Uses supabaseAdmin (service role) — these tables have no public RLS policies.
 */
export async function isBlockedFingerprint(
  fingerprint: string | null | undefined,
): Promise<boolean> {
  if (!fingerprint) return false;

  const { data } = await supabaseAdmin
    .from("blocked_fingerprints")
    .select("fingerprint")
    .eq("fingerprint", fingerprint)
    .single();

  return !!data;
}

/**
 * Records a device fingerprint for a user (many-to-many).
 * One user can have multiple devices, one device can be used by multiple users.
 * Uses supabaseAdmin (service role) to bypass RLS for writes.
 */
export async function storeDeviceFingerprint(
  userId: string,
  fingerprint: string | null | undefined,
): Promise<void> {
  if (!fingerprint) return;

  await supabaseAdmin
    .from("user_device_fingerprints")
    .upsert(
      { user_id: userId, fingerprint, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,fingerprint" },
    );
}
