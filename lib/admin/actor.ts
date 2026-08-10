import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import {
  AdminAuthorizationError,
  authorizeAdminActor,
  type AdminActor,
  type AuthorizedAdminActor,
} from "./authorization";
import type { AdminCapability } from "./policy";

export type AdminActorDependencies = {
  getAuthenticatedUser(): Promise<{ id: string } | null>;
  getActorById(id: string): Promise<AdminActor | null>;
};

export async function getAdminActorFromDependencies(
  dependencies: AdminActorDependencies,
): Promise<AdminActor | null> {
  const authenticated = await dependencies.getAuthenticatedUser();
  if (!authenticated) return null;
  return dependencies.getActorById(authenticated.id);
}

const productionDependencies: AdminActorDependencies = {
  async getAuthenticatedUser() {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id };
  },
  async getActorById(id) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, role, is_blocked")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return { id: data.id, role: data.role, isBlocked: data.is_blocked };
  },
};

export const getAuthenticatedAdminActor = cache(
  async (): Promise<AdminActor | null> =>
    getAdminActorFromDependencies(productionDependencies),
);

export async function requireAdminPageCapability(
  capability: AdminCapability,
): Promise<AuthorizedAdminActor> {
  const actor = await getAuthenticatedAdminActor();

  try {
    return authorizeAdminActor(actor, capability);
  } catch (error) {
    if (
      error instanceof AdminAuthorizationError &&
      error.code === "UNAUTHENTICATED"
    ) {
      return redirect("/login");
    }
    return redirect("/dashboard");
  }
}
