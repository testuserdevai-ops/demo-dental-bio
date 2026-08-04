"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import * as action from "../actions";
import { fetchProductAggregate } from "./api";
import { productKeys } from "./keys";
import type { ProductAggregate } from "./queries";
import type * as input from "./schemas";
export function useProductAggregate(seed: {
  scopeId: string;
  targetHint?: string;
  data: ProductAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: productKeys.aggregate(seed.scopeId),
    queryFn: () => fetchProductAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
export function useProductMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint?: string;
}) {
  const client = useQueryClient();
  const queryKey = productKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (result.ok) {
      await client.invalidateQueries({ queryKey });
      await client.refetchQueries({ queryKey });
    }
  };
  return {
    createProduct: useMutation({
      mutationFn: (value: input.CreateProductInput) =>
        action.createProduct(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateProduct: useMutation({
      mutationFn: (value: input.UpdateProductInput) =>
        action.updateProduct(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteProduct: useMutation({
      mutationFn: (value: input.DeleteProductInput) =>
        action.deleteProduct(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderProducts: useMutation({
      mutationFn: (value: input.ReorderProductsInput) =>
        action.reorderProducts(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
