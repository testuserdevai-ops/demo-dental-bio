type UnknownRecord = Record<string, unknown>;

type PublicBlogQuery = {
  order(
    column: string,
    options?: { referencedTable: "blogs" },
  ): PublicBlogQuery;
};

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function numericOrderValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.MAX_SAFE_INTEGER;
}

function compareRankAndId(left: unknown, right: unknown) {
  const leftRecord = record(left);
  const rightRecord = record(right);
  const rankDifference =
    numericOrderValue(leftRecord?.rank) - numericOrderValue(rightRecord?.rank);
  if (rankDifference !== 0) return rankDifference;
  return numericOrderValue(leftRecord?.id) - numericOrderValue(rightRecord?.id);
}

/**
 * Applies the public blog inventory contract without mutating query results.
 * Invalid rows remain available to each selector's fail-closed validation.
 */
export function orderPublicBlogGroups<T>(groups: readonly T[]): T[] {
  return [...groups].sort(compareRankAndId).map((candidate) => {
    const group = record(candidate);
    if (!group || !Array.isArray(group.blogs)) return candidate;

    return {
      ...group,
      blogs: [...group.blogs].sort(compareRankAndId),
    } as T;
  });
}

export function orderPublicBlogQuery<T extends PublicBlogQuery>(query: T): T {
  return query
    .order("rank")
    .order("id")
    .order("rank", { referencedTable: "blogs" })
    .order("id", { referencedTable: "blogs" }) as T;
}
