"use client";

import { useBlogAggregate, useBlogMutations } from "../_lib/hooks";
import type { BlogAggregate } from "../_lib/queries";
import BlogManager from "./BlogManager";

export function BlogClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: BlogAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useBlogAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useBlogMutations({ scopeId, targetHint });
  return (
    <BlogManager
      groups={query.data?.groups ?? data.groups}
      loading={query.isLoading}
      enabled={enabled}
      userId={scopeId}
      mutations={mutations}
    />
  );
}
