import supabaseAdmin from "@/utils/supabase/supabaseAdmin";

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
 * Uses supabaseAdmin (service role) — these tables have no public RLS policies.
 */
export async function isBlockedIp(
  ip: string | null | undefined,
): Promise<boolean> {
  if (!ip) return false;

  const { data } = await supabaseAdmin
    .from("blocked_ips")
    .select("ip_address")
    .eq("ip_address", ip)
    .single();

  return !!data;
}

/**
 * Records an IP address for a user (many-to-many).
 * One user can have multiple IPs, one IP can be used by multiple users.
 * Uses supabaseAdmin (service role) to bypass RLS for writes.
 */
export async function storeUserIp(
  userId: string,
  ip: string | null | undefined,
): Promise<void> {
  if (!ip) return;

  await supabaseAdmin.from("user_ips").upsert(
    {
      user_id: userId,
      ip_address: ip,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,ip_address" },
  );
}
