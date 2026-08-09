import type { TreatmentAggregate } from "./queries";
import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";

export async function fetchTreatmentAggregate(
  targetHint: string | undefined,
): Promise<TreatmentAggregate> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/treatments?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/treatments",
    );
  } catch {
    throw new DashboardNetworkError();
  }

  const body = (await response.json()) as
    TreatmentAggregate | { error?: string };
  if (!response.ok) {
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load treatments",
    );
  }
  return body as TreatmentAggregate;
}
