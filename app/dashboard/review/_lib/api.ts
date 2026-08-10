import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";
import type { ReviewAggregate } from "./queries";

export async function fetchReviewAggregate(
  targetHint: string | undefined,
): Promise<ReviewAggregate> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/reviews?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/reviews",
    );
  } catch {
    throw new DashboardNetworkError();
  }
  const body = (await response.json()) as ReviewAggregate | { error?: string };
  if (!response.ok)
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load reviews",
    );
  return body as ReviewAggregate;
}
