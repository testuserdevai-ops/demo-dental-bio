import { DashboardNetworkError, DashboardQueryError } from "@/lib/query/errors";
import type { BlogAggregate } from "./queries";

export async function fetchBlogAggregate(
  targetHint?: string,
): Promise<BlogAggregate> {
  let response: Response;
  try {
    response = await fetch(
      targetHint
        ? `/api/blog-groups?targetUserId=${encodeURIComponent(targetHint)}`
        : "/api/blog-groups",
    );
  } catch {
    throw new DashboardNetworkError();
  }
  const body = (await response.json()) as BlogAggregate | { error?: string };
  if (!response.ok)
    throw new DashboardQueryError(
      response.status,
      "error" in body && body.error ? body.error : "Unable to load blogs",
    );
  return body as BlogAggregate;
}
