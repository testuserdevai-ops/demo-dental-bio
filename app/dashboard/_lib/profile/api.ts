import type { ProfileViewModel } from "./queries";
import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";

export async function fetchProfile(
  targetHint: string | undefined,
): Promise<ProfileViewModel> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/profile?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/profile",
    );
  } catch {
    throw new DashboardNetworkError();
  }
  const body = (await response.json()) as ProfileViewModel | { error?: string };
  if (!response.ok)
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load profile",
    );
  return body as ProfileViewModel;
}
