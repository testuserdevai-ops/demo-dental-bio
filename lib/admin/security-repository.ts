import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type TableRow<Table extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][Table]["Row"];

export type Page = { page: number; limit: number };
export type PageResult<T> = { data: T[] | null; count: number | null };

export class AdminRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string | undefined = undefined,
  ) {
    super(message);
    this.name = "AdminRepositoryError";
  }
}

function requireData<T>({
  data,
  error,
}: {
  data: T;
  error: { message: string; code?: string } | null;
}): T {
  if (error) throw new AdminRepositoryError(error.message, error.code);
  return data;
}

function requirePage<T>({
  data,
  count,
  error,
}: {
  data: T[] | null;
  count: number | null;
  error: { message: string; code?: string } | null;
}): PageResult<T> {
  if (error) throw new AdminRepositoryError(error.message, error.code);
  return { data, count };
}

function pageRange({ page, limit }: Page) {
  const start = (page - 1) * limit;
  return { start, end: start + limit - 1 };
}

export async function listBlockedDomains(
  page: Page,
): Promise<PageResult<TableRow<"blocked_email_domains">>> {
  const { start, end } = pageRange(page);
  return requirePage(
    await supabaseAdmin
      .from("blocked_email_domains")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end),
  );
}

export async function addBlockedDomain(domain: string) {
  return requireData(
    await supabaseAdmin
      .from("blocked_email_domains")
      .insert({ domain })
      .select()
      .single(),
  );
}

export async function setBlockedDomainActive(id: number, isActive: boolean) {
  return requireData(
    await supabaseAdmin
      .from("blocked_email_domains")
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single(),
  );
}

export async function removeBlockedDomain(id: number) {
  requireData(
    await supabaseAdmin.from("blocked_email_domains").delete().eq("id", id),
  );
}

type AssociatedUser = Pick<
  TableRow<"users">,
  "email" | "username" | "first_name" | "last_name"
> | null;

export type BlockedFingerprint = TableRow<"blocked_fingerprints"> & {
  associated_users: AssociatedUser[];
};
export type BlockedIp = TableRow<"blocked_ips"> & {
  associated_users: AssociatedUser[];
};

type FingerprintLink = {
  fingerprint: string;
  users: AssociatedUser;
};
type IpLink = {
  ip_address: string;
  users: AssociatedUser;
};

export async function listBlockedFingerprints(
  page: Page,
): Promise<PageResult<BlockedFingerprint>> {
  const { start, end } = pageRange(page);
  const { data: blocked, count } = requirePage(
    await supabaseAdmin
      .from("blocked_fingerprints")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end),
  );
  const fingerprints = (blocked ?? []).map(({ fingerprint }) => fingerprint);
  const usersByFingerprint: Record<string, AssociatedUser[]> = {};

  if (fingerprints.length) {
    const linkedResult = await supabaseAdmin
      .from("user_device_fingerprints")
      .select("fingerprint, users(email, username, first_name, last_name)")
      .in("fingerprint", fingerprints);
    const links = requireData(
      linkedResult as unknown as {
        data: FingerprintLink[] | null;
        error: { message: string; code?: string } | null;
      },
    );
    for (const link of links ?? []) {
      (usersByFingerprint[link.fingerprint] ??= []).push(link.users);
    }
  }

  return {
    data: (blocked ?? []).map((row) => ({
      ...row,
      associated_users: usersByFingerprint[row.fingerprint] ?? [],
    })),
    count,
  };
}

export async function addBlockedFingerprint(input: {
  fingerprint: string;
  reason: string | null;
  blockedBy: string;
}) {
  return requireData(
    await supabaseAdmin
      .from("blocked_fingerprints")
      .insert({
        fingerprint: input.fingerprint,
        reason: input.reason,
        blocked_by: input.blockedBy,
      })
      .select()
      .single(),
  );
}

export async function removeBlockedFingerprint(fingerprint: string) {
  requireData(
    await supabaseAdmin
      .from("blocked_fingerprints")
      .delete()
      .eq("fingerprint", fingerprint),
  );
}

export async function listBlockedIps(
  page: Page,
): Promise<PageResult<BlockedIp>> {
  const { start, end } = pageRange(page);
  const { data: blocked, count } = requirePage(
    await supabaseAdmin
      .from("blocked_ips")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end),
  );
  const ipAddresses = (blocked ?? []).map(({ ip_address }) => ip_address);
  const usersByIp: Record<string, AssociatedUser[]> = {};

  if (ipAddresses.length) {
    const linkedResult = await supabaseAdmin
      .from("user_ips")
      .select("ip_address, users(email, username, first_name, last_name)")
      .in("ip_address", ipAddresses);
    const links = requireData(
      linkedResult as unknown as {
        data: IpLink[] | null;
        error: { message: string; code?: string } | null;
      },
    );
    for (const link of links ?? []) {
      (usersByIp[link.ip_address] ??= []).push(link.users);
    }
  }

  return {
    data: (blocked ?? []).map((row) => ({
      ...row,
      associated_users: usersByIp[row.ip_address] ?? [],
    })),
    count,
  };
}

export async function addBlockedIp(input: {
  ipAddress: string;
  reason: string | null;
  blockedBy: string;
}) {
  return requireData(
    await supabaseAdmin
      .from("blocked_ips")
      .insert({
        ip_address: input.ipAddress,
        reason: input.reason,
        blocked_by: input.blockedBy,
      })
      .select()
      .single(),
  );
}

export async function removeBlockedIp(ipAddress: string) {
  requireData(
    await supabaseAdmin
      .from("blocked_ips")
      .delete()
      .eq("ip_address", ipAddress),
  );
}

export type BlockedUser = Pick<
  TableRow<"users">,
  | "id"
  | "email"
  | "username"
  | "first_name"
  | "last_name"
  | "is_blocked"
  | "blocked_reason"
  | "blocked_at"
  | "blocked_by"
>;

export async function listBlockedUsers(
  page: Page,
): Promise<PageResult<BlockedUser>> {
  const { start, end } = pageRange(page);
  return requirePage(
    await supabaseAdmin
      .from("users")
      .select(
        "id, email, username, first_name, last_name, is_blocked, blocked_reason, blocked_at, blocked_by",
        { count: "exact" },
      )
      .eq("is_blocked", true)
      .order("blocked_at", { ascending: false })
      .range(start, end),
  );
}

export async function blockUser(input: {
  userId: string;
  reason: string | null;
  blockedBy: string;
  blockedAt: string;
}) {
  return requireData(
    await supabaseAdmin
      .from("users")
      .update({
        is_blocked: true,
        blocked_reason: input.reason,
        blocked_at: input.blockedAt,
        blocked_by: input.blockedBy,
      })
      .eq("id", input.userId)
      .select("id, email, username, is_blocked, blocked_reason, blocked_at")
      .single(),
  );
}

export async function unblockUser(userId: string) {
  return requireData(
    await supabaseAdmin
      .from("users")
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        blocked_by: null,
      })
      .eq("id", userId)
      .select("id, email, username, is_blocked, blocked_reason, blocked_at")
      .single(),
  );
}

export type SecurityLogFilters = {
  eventType?: string;
  email?: string;
  ip?: string;
};

export async function listSecurityLogs(
  page: Page,
  filters: SecurityLogFilters,
): Promise<PageResult<TableRow<"security_logs">>> {
  const { start, end } = pageRange(page);
  let query = supabaseAdmin
    .from("security_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.email) query = query.ilike("email", `%${filters.email}%`);
  if (filters.ip) query = query.ilike("ip_address", `%${filters.ip}%`);
  return requirePage(await query.range(start, end));
}

export type ProfileAuditFilters = {
  tableName?: string;
  operation?: string;
  actorRole?: string;
  email?: string;
};
type AuditUser = Pick<
  TableRow<"users">,
  "id" | "email" | "username" | "first_name" | "last_name"
>;
export type ProfileAuditEntry = TableRow<"profile_audit_log"> & {
  subject: AuditUser | null;
  actor: AuditUser | null;
};

export async function listProfileAuditLog(
  page: Page,
  filters: ProfileAuditFilters,
): Promise<PageResult<ProfileAuditEntry>> {
  const { start, end } = pageRange(page);
  let query = supabaseAdmin
    .from("profile_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.tableName) query = query.eq("table_name", filters.tableName);
  if (filters.operation) query = query.eq("operation", filters.operation);
  if (filters.actorRole) query = query.eq("actor_role", filters.actorRole);
  if (filters.email) query = query.ilike("subject_email", `%${filters.email}%`);

  const { data: rows, count } = requirePage(await query.range(start, end));
  const ids = Array.from(
    new Set(
      (rows ?? [])
        .flatMap((row) => [row.user_id, row.actor_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const users = ids.length
    ? requireData(
        await supabaseAdmin
          .from("users")
          .select("id, email, username, first_name, last_name")
          .in("id", ids),
      )
    : [];
  const usersById = new Map((users ?? []).map((user) => [user.id, user]));

  return {
    data: (rows ?? []).map((row) => ({
      ...row,
      subject: usersById.get(row.user_id) ?? null,
      actor: row.actor_id ? (usersById.get(row.actor_id) ?? null) : null,
    })),
    count,
  };
}

export type UserListFilters = {
  email?: string;
  username?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  country?: string;
  isVerified?: boolean;
  subscriptionStatus?: string;
};

export type UserListOrder = {
  search?: string;
  sort: "identity" | "plan" | "verification" | "registered";
  direction: "asc" | "desc";
};

export function userSearchExpression(search: string) {
  const escaped = search
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '\\"');
  const value = `"%${escaped}%"`;
  return ["email", "first_name", "middle_name", "last_name", "username"]
    .map((column) => `${column}.ilike.${value}`)
    .join(",");
}

export const securityUserSelect =
  "id, username, email, first_name, last_name, is_blocked, user_device_fingerprints(fingerprint, last_seen_at), user_ips(ip_address, last_seen_at)" as const;
export const adminUserSelect =
  "id, title, first_name, last_name, email, username, position, country, created_at, subscription_status, current_period_end, trial_end, isVerified, dentistries(dentistry_id)" as const;
export const adminUserExportSelect =
  "id, title, first_name, last_name, email, username, position, country, created_at, subscription_status, current_period_end, trial_end, isVerified" as const;

export async function listSecurityUsers(
  page: Page,
  filters: UserListFilters,
  order: UserListOrder = { sort: "registered", direction: "desc" },
) {
  const { start, end } = pageRange(page);
  let query = supabaseAdmin
    .from("users")
    .select(securityUserSelect, { count: "exact" })
    .eq("is_blocked", false);
  if (order.search) query = query.or(userSearchExpression(order.search));
  if (filters.isVerified !== undefined) {
    query = query.eq("isVerified", filters.isVerified);
  }
  if (filters.subscriptionStatus === "trialing") {
    query = query.gt("trial_end", new Date().toISOString());
  } else if (filters.subscriptionStatus === "FREE") {
    query = query.or("subscription_status.is.null,subscription_status.eq.");
  } else if (filters.subscriptionStatus) {
    query = query.eq("subscription_status", filters.subscriptionStatus);
  }
  for (const [column, value] of [
    ["email", filters.email],
    ["username", filters.username],
    ["first_name", filters.firstName],
    ["middle_name", filters.middleName],
    ["last_name", filters.lastName],
    ["country", filters.country],
  ] as const) {
    if (value) query = query.ilike(column, `%${value}%`);
  }
  query = query
    .order(
      order.sort === "identity"
        ? "last_name"
        : order.sort === "plan"
          ? "subscription_status"
          : order.sort === "verification"
            ? "isVerified"
            : "created_at",
      { ascending: order.direction === "asc", nullsFirst: false },
    )
    .order("id", { ascending: true });
  return requirePage(await query.range(start, end));
}

export async function listAdminUsers(
  page: Page,
  filters: UserListFilters,
  order: UserListOrder = { sort: "registered", direction: "desc" },
) {
  const { start, end } = pageRange(page);
  let query = supabaseAdmin
    .from("users")
    .select(adminUserSelect, { count: "exact" })
    .eq("is_blocked", false);
  if (order.search) query = query.or(userSearchExpression(order.search));
  if (filters.isVerified !== undefined) {
    query = query.eq("isVerified", filters.isVerified);
  }
  if (filters.subscriptionStatus === "trialing") {
    query = query.gt("trial_end", new Date().toISOString());
  } else if (filters.subscriptionStatus === "FREE") {
    query = query.or("subscription_status.is.null,subscription_status.eq.");
  } else if (filters.subscriptionStatus) {
    query = query.eq("subscription_status", filters.subscriptionStatus);
  }
  for (const [column, value] of [
    ["email", filters.email],
    ["username", filters.username],
    ["first_name", filters.firstName],
    ["middle_name", filters.middleName],
    ["last_name", filters.lastName],
    ["country", filters.country],
  ] as const) {
    if (value) query = query.ilike(column, `%${value}%`);
  }
  if (order.sort === "identity") {
    query = query
      .order("last_name", {
        ascending: order.direction === "asc",
        nullsFirst: false,
      })
      .order("first_name", {
        ascending: order.direction === "asc",
        nullsFirst: false,
      });
  } else {
    query = query.order(
      order.sort === "plan"
        ? "subscription_status"
        : order.sort === "verification"
          ? "isVerified"
          : "created_at",
      { ascending: order.direction === "asc", nullsFirst: false },
    );
  }
  query = query.order("id", { ascending: true });
  return requirePage(await query.range(start, end));
}

export async function listUsersForAdmin() {
  return requireData(
    await supabaseAdmin.from("users").select(adminUserExportSelect),
  );
}
