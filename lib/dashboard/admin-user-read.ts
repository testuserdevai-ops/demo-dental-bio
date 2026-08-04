export type AdminReadActor = { id: string; role: string | null } | null;

export type AdminDashboardUser = {
  id: string;
  username: string;
  isVerified: boolean;
  role: string | null;
};

type AdminDashboardUserRecord = AdminDashboardUser & {
  session_id?: string | null;
};

type AdminReadErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID_TARGET" | "NOT_FOUND";

export class AdminDashboardUserReadError extends Error {
  constructor(public readonly code: AdminReadErrorCode) {
    super(code);
  }
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function readAdminDashboardUser(
  actor: AdminReadActor,
  targetUserId: string | null,
  lookup: (userId: string) => Promise<AdminDashboardUserRecord | null>,
): Promise<AdminDashboardUser> {
  if (!actor) throw new AdminDashboardUserReadError("UNAUTHENTICATED");
  if (actor.role !== "admin")
    throw new AdminDashboardUserReadError("FORBIDDEN");
  if (targetUserId !== null && !uuid.test(targetUserId)) {
    throw new AdminDashboardUserReadError("INVALID_TARGET");
  }

  const record = await lookup(targetUserId ?? actor.id);
  if (!record) throw new AdminDashboardUserReadError("NOT_FOUND");

  return {
    id: record.id,
    username: record.username,
    isVerified: record.isVerified,
    role: record.role,
  };
}
