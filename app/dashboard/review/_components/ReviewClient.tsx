"use client";

import { useReviewAggregate, useReviewMutations } from "../_lib/hooks";
import type { ReviewAggregate } from "../_lib/queries";
import ReviewManager from "./ReviewManager";

export function ReviewClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint: string | undefined;
  data: ReviewAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useReviewAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useReviewMutations({ scopeId, targetHint });
  const aggregate = query.data ?? data;
  return (
    <ReviewManager
      reviews={aggregate.reviews}
      externalPage={aggregate.externalPage}
      loading={query.isLoading}
      enabled={enabled}
      userId={scopeId}
      mutations={mutations}
    />
  );
}
