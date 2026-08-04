"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  createTreatment,
  deleteTreatment,
  reorderTreatments,
  updateTreatment,
} from "../actions";
import type { ActionResult } from "@/lib/forms/action-result";
import type { TreatmentAggregate } from "./queries";
import { treatmentKeys } from "./keys";
import { fetchTreatmentAggregate } from "./api";
import type {
  CreateTreatmentInput,
  DeleteTreatmentInput,
  ReorderTreatmentsInput,
  UpdateTreatmentInput,
} from "./schemas";

export function useTreatmentAggregate(seed: {
  scopeId: string;
  data: TreatmentAggregate;
  updatedAt: number;
}): UseQueryResult<TreatmentAggregate> {
  return useQuery({
    queryKey: treatmentKeys.aggregate(seed.scopeId),
    queryFn: () => fetchTreatmentAggregate(seed.scopeId),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}

type TreatmentMutationContext = { previous?: TreatmentAggregate };

function useAggregateRefresh(scopeId: string) {
  const queryClient = useQueryClient();
  const queryKey = treatmentKeys.aggregate(scopeId);
  return async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.refetchQueries({ queryKey });
  };
}

export function useTreatmentMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint: string | undefined;
}) {
  const queryClient = useQueryClient();
  const queryKey = treatmentKeys.aggregate(scopeId);
  const refresh = useAggregateRefresh(scopeId);
  const refreshOnSuccess = <T>(result: ActionResult<T>) => {
    if (result.ok) return refresh();
    return Promise.resolve();
  };

  const create = useMutation({
    mutationFn: (input: CreateTreatmentInput) =>
      createTreatment(targetHint, input),
    retry: false,
    onSuccess: refreshOnSuccess,
  });
  const update = useMutation({
    mutationFn: (input: UpdateTreatmentInput) =>
      updateTreatment(targetHint, input),
    retry: false,
    onSuccess: refreshOnSuccess,
  });
  const remove = useMutation({
    mutationFn: (input: DeleteTreatmentInput) =>
      deleteTreatment(targetHint, input),
    retry: false,
    onSuccess: refreshOnSuccess,
  });
  const reorder = useMutation<
    ActionResult<void>,
    Error,
    ReorderTreatmentsInput,
    TreatmentMutationContext
  >({
    mutationFn: (input) => reorderTreatments(targetHint, input),
    retry: false,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      return {
        previous: queryClient.getQueryData<TreatmentAggregate>(queryKey),
      };
    },
    onError: async (_error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
      await refresh();
    },
    onSuccess: async (result, _input, context) => {
      if (result.ok) return refresh();
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
      await refresh();
    },
  });

  return { create, update, remove, reorder };
}
