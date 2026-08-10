"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import { fetchReviewAggregate } from "./api";
import { reviewKeys } from "./keys";
import type { ReviewAggregate } from "./queries";
import * as action from "../actions";
import type * as input from "./schemas";

export function useReviewAggregate(seed: {
  scopeId: string;
  targetHint: string | undefined;
  data: ReviewAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: reviewKeys.aggregate(seed.scopeId),
    queryFn: () => fetchReviewAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
export function useReviewMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint: string | undefined;
}) {
  const client = useQueryClient();
  const queryKey = reviewKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (!result.ok) return;
    await client.invalidateQueries({ queryKey });
    await client.refetchQueries({ queryKey });
  };
  return {
    create: useMutation({
      mutationFn: (value: input.CreateReviewInput) =>
        action.createReview(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (value: input.UpdateReviewInput) =>
        action.updateReview(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (value: input.DeleteReviewInput) =>
        action.deleteReview(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorder: useMutation({
      mutationFn: (value: input.ReorderReviewsInput) =>
        action.reorderReviews(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    externalPage: useMutation({
      mutationFn: (value: input.ExternalReviewPageInput) =>
        action.saveExternalReviewPage(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
