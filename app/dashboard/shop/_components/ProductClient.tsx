"use client";

import { useProductAggregate, useProductMutations } from "../_lib/hooks";
import type { ProductAggregate } from "../_lib/queries";
import ProductManager from "./ProductManager";

export function ProductClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: ProductAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useProductAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useProductMutations({ scopeId, targetHint });
  return (
    <ProductManager
      products={query.data?.products ?? data.products}
      loading={query.isLoading}
      enabled={enabled}
      userId={scopeId}
      mutations={mutations}
    />
  );
}
