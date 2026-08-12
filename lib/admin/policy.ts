export type AdminCapability =
  | "console:admin"
  | "console:security"
  | "security:audit:read"
  | "security:users:read"
  | "security:read"
  | "security:manage"
  | "users:manage"
  | "marketing:manage"
  | "billing:read"
  | "reports:moderate"
  | "verification:manage";

export type AdminPolicyActor = {
  role: string | null;
  isBlocked: boolean;
};

const capabilityRoles = {
  "console:admin": ["admin"],
  "console:security": ["admin", "security_admin"],
  "security:audit:read": ["admin", "security_admin"],
  "security:users:read": ["admin", "security_admin"],
  "security:read": ["admin", "security_admin"],
  "security:manage": ["admin"],
  "users:manage": ["admin"],
  "marketing:manage": ["admin"],
  "billing:read": ["admin"],
  "reports:moderate": ["admin", "security_admin"],
  "verification:manage": ["admin"],
} as const satisfies Record<AdminCapability, readonly string[]>;

export function hasAdminCapability(
  actor: AdminPolicyActor,
  capability: AdminCapability,
): boolean {
  if (actor.isBlocked) return false;
  return capabilityRoles[capability].some((role) => role === actor.role);
}
