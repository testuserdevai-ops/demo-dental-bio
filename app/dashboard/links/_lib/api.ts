import type { LinkAggregate } from "./queries";
export async function fetchLinkAggregate(
  targetHint: string | undefined,
): Promise<LinkAggregate> {
  const response = await fetch(
    targetHint
      ? `/api/links?targetUserId=${encodeURIComponent(targetHint)}`
      : "/api/links",
  );
  if (!response.ok) throw new Error("Unable to load links");
  return response.json();
}
