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
    createExternalPage: useMutation({
      mutationFn: (value: input.CreateExternalReviewPageInput) =>
        action.createExternalReviewPage(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateExternalPage: useMutation({
      mutationFn: (value: input.UpdateExternalReviewPageInput) =>
        action.updateExternalReviewPage(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteExternalPage: useMutation({
      mutationFn: (value: input.DeleteExternalReviewPageInput) =>
        action.deleteExternalReviewPage(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderExternalPages: useMutation({
      mutationFn: (value: input.ReorderExternalReviewPagesInput) =>
        action.reorderExternalReviewPages(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
