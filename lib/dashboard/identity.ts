import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import type {
  DashboardShellViewModel,
  DashboardScope,
  ResolvedDashboardIdentity,
} from "./types";

type DashboardIdentityUser = {
  id: string;
  username: string;
  role: string | null;
  subscriptionStatus: string | null;
  isVerified: boolean | null;
  useDentalBrand: boolean | null;
};

type DashboardDentistry = {
  dentistryId: string;
};

export type DashboardIdentityDependencies = {
  getAuthenticatedUser(): Promise<{ id: string } | null>;
  getUserById(id: string): Promise<DashboardIdentityUser | null>;
  getDentistryByUserId(userId: string): Promise<DashboardDentistry | null>;
};

export type DashboardIdentityErrorCode =
  | "UNAUTHENTICATED"
  | "ACTOR_NOT_FOUND"
  | "INVALID_TARGET"
  | "FORBIDDEN"
  | "TARGET_NOT_FOUND"
  | "DENTISTRY_NOT_FOUND"
  | "IDENTITY_LOOKUP_FAILED";

export class DashboardAuthError extends Error {
  constructor(public readonly code: DashboardIdentityErrorCode) {
    super(code);
    this.name = "DashboardAuthError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function getAuthenticatedUser(): Promise<{ id: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !isUuid(data.user.id)) return null;

  return { id: data.user.id };
}

async function getUserById(
  userId: string,
): Promise<DashboardIdentityUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, username, role, subscription_status, isVerified, use_dental_brand",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new DashboardAuthError("IDENTITY_LOOKUP_FAILED");
  if (!data) return null;

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    subscriptionStatus: data.subscription_status,
    isVerified: data.isVerified,
    useDentalBrand: data.use_dental_brand,
  };
}

async function getDentistryByUserId(
  userId: string,
): Promise<DashboardDentistry | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dentistries")
    .select("dentistry_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new DashboardAuthError("IDENTITY_LOOKUP_FAILED");
  if (!data) return null;

  return { dentistryId: data.dentistry_id };
}

const productionDependencies: DashboardIdentityDependencies = {
  getAuthenticatedUser,
  getUserById,
  getDentistryByUserId,
};

function toResolvedDashboardIdentity(
  effectiveUser: DashboardIdentityUser,
  dentistry: DashboardDentistry,
): ResolvedDashboardIdentity {
  const scope: DashboardScope = {
    effectiveUserId: effectiveUser.id,
    dentistryId: dentistry.dentistryId,
    username: effectiveUser.username,
  };
  const shell: DashboardShellViewModel = {
    subscriptionStatus: effectiveUser.subscriptionStatus,
    isVerified: effectiveUser.isVerified ?? false,
    useDentalBrand: effectiveUser.useDentalBrand ?? false,
  };

  return { scope, shell };
}

async function authorizeTarget(
  actor: DashboardIdentityUser,
  targetUserId: string | null | undefined,
  dependencies: DashboardIdentityDependencies,
): Promise<string> {
  if (targetUserId === null || targetUserId === undefined) return actor.id;
  if (!isUuid(targetUserId)) throw new DashboardAuthError("INVALID_TARGET");
  if (actor.role !== "admin") throw new DashboardAuthError("FORBIDDEN");

  const target = await dependencies.getUserById(targetUserId);
  if (!target) throw new DashboardAuthError("TARGET_NOT_FOUND");

  return target.id;
}

export async function resolveDashboardIdentity(
  targetUserId: string | null | undefined = null,
  dependencies: DashboardIdentityDependencies = productionDependencies,
): Promise<ResolvedDashboardIdentity> {
  const actor = await dependencies.getAuthenticatedUser();
  if (!actor || !isUuid(actor.id)) {
    throw new DashboardAuthError("UNAUTHENTICATED");
  }

  const actorRow = await dependencies.getUserById(actor.id);
  if (!actorRow) throw new DashboardAuthError("ACTOR_NOT_FOUND");

  const effectiveUserId = await authorizeTarget(
    actorRow,
    targetUserId,
    dependencies,
  );
  const [effectiveUser, dentistry] = await Promise.all([
    dependencies.getUserById(effectiveUserId),
    dependencies.getDentistryByUserId(effectiveUserId),
  ]);

  if (!effectiveUser) throw new DashboardAuthError("TARGET_NOT_FOUND");
  if (!dentistry) throw new DashboardAuthError("DENTISTRY_NOT_FOUND");

  return toResolvedDashboardIdentity(effectiveUser, dentistry);
}
