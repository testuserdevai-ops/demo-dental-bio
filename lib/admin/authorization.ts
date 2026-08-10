import "server-only";

import { hasAdminCapability, type AdminCapability } from "./policy";

export type { AdminCapability } from "./policy";

export type AdminActor = {
  id: string;
  role: string | null;
  isBlocked: boolean;
};

export type AuthorizedAdminActor = {
  id: string;
  role: "admin" | "security_admin";
};

export type AdminAuthorizationErrorCode =
  "UNAUTHENTICATED" | "BLOCKED" | "FORBIDDEN";

export class AdminAuthorizationError extends Error {
  constructor(public readonly code: AdminAuthorizationErrorCode) {
    super(code);
    this.name = "AdminAuthorizationError";
  }
}

export function authorizeAdminActor(
  actor: AdminActor | null,
  capability: AdminCapability,
): AuthorizedAdminActor {
  if (!actor) throw new AdminAuthorizationError("UNAUTHENTICATED");
  if (actor.isBlocked) throw new AdminAuthorizationError("BLOCKED");

  if (!hasAdminCapability(actor, capability)) {
    throw new AdminAuthorizationError("FORBIDDEN");
  }

  return {
    id: actor.id,
    role: actor.role as AuthorizedAdminActor["role"],
  };
}
