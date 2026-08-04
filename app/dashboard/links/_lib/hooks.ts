"use client";
import { useQuery } from "@tanstack/react-query";
import { linkKeys } from "./keys";
import { fetchLinkAggregate } from "./api";
import type { LinkAggregate } from "./queries";
export function useLinkAggregate(seed: {
  scopeId: string;
  targetHint: string | undefined;
  data: LinkAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: linkKeys.aggregate(seed.scopeId),
    queryFn: () => fetchLinkAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
