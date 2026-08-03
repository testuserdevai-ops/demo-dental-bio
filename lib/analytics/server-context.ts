import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { PublicRenderContext } from "./contract";

/** Resolve preview state from authoritative server-side identity. */
export async function resolveAnalyticsRenderContext(
  requestedContext: string | undefined,
  profileId: string,
): Promise<PublicRenderContext> {
  if (requestedContext !== "preview") return { kind: "public" };

  const authenticatedClient = await createClient();
  const { data: authData } = await authenticatedClient.auth.getUser();
  if (!authData.user) return { kind: "public" };
  if (authData.user.id === profileId) {
    return {
      kind: "preview",
      verification: "authenticated_profile_owner",
    };
  }

  const { data: viewer } = await authenticatedClient
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  return viewer?.role === "admin"
    ? { kind: "preview", verification: "authenticated_profile_owner" }
    : { kind: "public" };
}
