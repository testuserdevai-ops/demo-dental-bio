"use client";

import { useLocationAggregate, useLocationMutations } from "../_lib/hooks";
import type { LocationAggregate } from "../_lib/queries";
import LocationManager from "./LocationManager";

export function LocationClient({
  scopeId,
  targetHint,
  data,
  updatedAt,
  enabled,
}: {
  scopeId: string;
  targetHint?: string;
  data: LocationAggregate;
  updatedAt: number;
  enabled: boolean;
}) {
  const query = useLocationAggregate({ scopeId, targetHint, data, updatedAt });
  const mutations = useLocationMutations({ scopeId, targetHint });
  return (
    <LocationManager
      data={query.data ?? data}
      enabled={enabled}
      loading={query.isLoading}
      mutations={mutations}
    />
  );
}
