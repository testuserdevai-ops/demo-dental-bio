import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";
import type { GalleryAggregate } from "./queries";

export async function fetchGalleryAggregate(
  targetHint: string | undefined,
): Promise<GalleryAggregate> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/galleries?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/galleries",
    );
  } catch {
    throw new DashboardNetworkError();
  }
  const body = (await response.json()) as GalleryAggregate | { error?: string };
  if (!response.ok)
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load galleries",
    );
  return body as GalleryAggregate;
}
