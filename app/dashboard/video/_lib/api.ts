import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";
import type { VideoAggregate } from "./queries";
export async function fetchVideoAggregate(
  targetHint?: string,
): Promise<VideoAggregate> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/videos?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/videos",
    );
  } catch {
    throw new DashboardNetworkError();
  }
  const body = (await response.json()) as VideoAggregate | { error?: string };
  if (!response.ok)
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load videos",
    );
  return body as VideoAggregate;
}
