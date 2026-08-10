import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type SecurityEventType =
  "blocked_domain" | "blocked_fingerprint" | "blocked_ip" | "blocked_user";

export type SecurityLogDetails = { [key: string]: Json | undefined };

export interface SecurityLogEntry {
  event_type: SecurityEventType;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  ip_address?: string;
  user_agent?: string;
  fingerprint?: string;
  country?: string;
  location?: string;
  route?: string;
  details?: SecurityLogDetails;
}

export async function lookupBlockedIp(ipAddress: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("blocked_ips")
    .select("ip_address")
    .eq("ip_address", ipAddress)
    .single();

  return Boolean(data);
}

export async function lookupBlockedFingerprint(
  fingerprint: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("blocked_fingerprints")
    .select("fingerprint")
    .eq("fingerprint", fingerprint)
    .single();

  return Boolean(data);
}

export async function upsertUserIpSignal(
  userId: string,
  ipAddress: string,
  lastSeenAt: string,
): Promise<void> {
  await supabaseAdmin.from("user_ips").upsert(
    {
      user_id: userId,
      ip_address: ipAddress,
      last_seen_at: lastSeenAt,
    },
    { onConflict: "user_id,ip_address" },
  );
}

export async function upsertUserFingerprintSignal(
  userId: string,
  fingerprint: string,
  lastSeenAt: string,
): Promise<void> {
  await supabaseAdmin
    .from("user_device_fingerprints")
    .upsert(
      { user_id: userId, fingerprint, last_seen_at: lastSeenAt },
      { onConflict: "user_id,fingerprint" },
    );
}

export async function insertSecurityLogEntry(
  entry: SecurityLogEntry,
): Promise<void> {
  await supabaseAdmin.from("security_logs").insert(entry);
}
