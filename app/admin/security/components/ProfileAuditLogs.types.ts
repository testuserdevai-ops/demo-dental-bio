export interface UserStub {
  id: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface AuditLog {
  id: number;
  user_id: string;
  actor_id: string | null;
  actor_role: "self" | "admin" | "system" | null;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_keys: string[];
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  subject: UserStub | null;
  actor: UserStub | null;
}

export const OPERATION_STYLES: Record<string, { bg: string; text: string }> = {
  INSERT: { bg: "bg-emerald-100", text: "text-emerald-700" },
  UPDATE: { bg: "bg-amber-100", text: "text-amber-700" },
  DELETE: { bg: "bg-rose-100", text: "text-rose-700" },
};

export const formatUser = (user: UserStub | null) => {
  if (!user) return null;

  return (
    user.email ||
    user.username ||
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
    user.id
  );
};
