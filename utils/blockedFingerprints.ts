import { createClient } from '@/utils/supabase/server';

/**
 * Checks if the device fingerprint is in the blocked_fingerprints table.
 * Returns true if blocked, false if allowed.
 */
export async function isBlockedFingerprint(fingerprint: string | null | undefined): Promise<boolean> {
    if (!fingerprint) return false;

    const supabase = createClient();
    const { data } = await supabase
        .from('blocked_fingerprints')
        .select('fingerprint')
        .eq('fingerprint', fingerprint)
        .single();

    return !!data;
}

/**
 * Records a device fingerprint for a user (many-to-many).
 * One user can have multiple devices, one device can be used by multiple users.
 * Uses upsert to update last_seen_at if the pair already exists.
 */
export async function storeDeviceFingerprint(userId: string, fingerprint: string | null | undefined): Promise<void> {
    if (!fingerprint) return;

    const supabase = createClient();
    await supabase
        .from('user_device_fingerprints')
        .upsert(
            { user_id: userId, fingerprint, last_seen_at: new Date().toISOString() },
            { onConflict: 'user_id,fingerprint' }
        );
}
