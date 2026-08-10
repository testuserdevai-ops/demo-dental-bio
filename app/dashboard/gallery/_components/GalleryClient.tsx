"use client";

import { useGalleryAggregate, useGalleryMutations } from "../_lib/hooks";
import type { GalleryAggregate } from "../_lib/queries";
import GalleryManager from "./GalleryManager";

export function GalleryClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint: string | undefined;
  data: GalleryAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useGalleryAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useGalleryMutations({ scopeId, targetHint });
  const aggregate = query.data ?? data;
  return (
    <GalleryManager
      dental={aggregate.dental}
      general={aggregate.general}
      loading={query.isLoading}
      enabled={enabled}
      userId={scopeId}
      mutations={mutations}
    />
  );
}
