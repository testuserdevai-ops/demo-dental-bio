import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { PublicRenderContext } from "./contract";
import { resolveRequestedAnalyticsRenderContext } from "./render-context";

export { resolveRequestedAnalyticsRenderContext } from "./render-context";

/** Resolve preview state from authoritative server-side identity. */
export async function resolveAnalyticsRenderContext(
  requestedContext: string | undefined,
  profileId: string,
): Promise<PublicRenderContext> {
  if (requestedContext !== "preview") {
    return resolveRequestedAnalyticsRenderContext(
      requestedContext,
      profileId,
      null,
    );
  }

  const authenticatedClient = await createClient();
  const { data: authData } = await authenticatedClient.auth.getUser();
  if (!authData.user) {
    return resolveRequestedAnalyticsRenderContext("preview", profileId, null);
  }

  const { data: viewer } = await authenticatedClient
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  return resolveRequestedAnalyticsRenderContext("preview", profileId, {
    id: authData.user.id,
    role: viewer?.role ?? null,
  });
}
