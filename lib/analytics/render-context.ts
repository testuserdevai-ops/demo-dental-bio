import type { PublicRenderContext } from "./contract";

type AuthenticatedViewer = Readonly<{
  id: string;
  role: string | null;
}>;

/**
 * Maps an explicitly requested analytics context to an authoritative render
 * state. Unknown requests are ordinary public traffic; preview and test modes
 * must supply server-verifiable identity before becoming reportable.
 */
export function resolveRequestedAnalyticsRenderContext(
  requestedContext: string | undefined,
  profileId: string,
  viewer: AuthenticatedViewer | null,
): PublicRenderContext {
  if (requestedContext === "test") {
    return { kind: "excluded", reason: "unverified_test" };
  }
  if (requestedContext !== "preview") return { kind: "public" };
  if (!viewer) return { kind: "excluded", reason: "unverified_preview" };
  if (viewer.id === profileId) {
    return {
      kind: "preview",
      verification: "authenticated_profile_owner",
    };
  }
  if (viewer.role === "admin") {
    return { kind: "admin_preview", verification: "authenticated_admin" };
  }
  return { kind: "excluded", reason: "unverified_preview" };
}
