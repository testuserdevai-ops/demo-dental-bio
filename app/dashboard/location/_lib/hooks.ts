"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import * as action from "../actions";
import { fetchLocationAggregate } from "./api";
import { locationKeys } from "./keys";
import type { LocationAggregate } from "./queries";
import type * as input from "./schemas";
export function useLocationAggregate(seed: {
  scopeId: string;
  targetHint?: string;
  data: LocationAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: locationKeys.aggregate(seed.scopeId),
    queryFn: () => fetchLocationAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}
export function useLocationMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint?: string;
}) {
  const client = useQueryClient();
  const queryKey = locationKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (result.ok) {
      await client.invalidateQueries({ queryKey });
      await client.refetchQueries({ queryKey });
    }
  };
  const refreshUpdate = async <T>(result: ActionResult<T>) => {
    if (result.ok || result.code === "CONFLICT") {
      await client.invalidateQueries({ queryKey });
      await client.refetchQueries({ queryKey });
    }
  };
  return {
    saveTitle: useMutation({
      mutationFn: (v: input.LocationTitleInput) =>
        action.saveLocationTitle(targetHint, v),
      retry: false,
      onSuccess: refresh,
    }),
    createLocation: useMutation({
      mutationFn: (v: input.CreateLocationInput) =>
        action.createLocation(targetHint, v),
      retry: false,
      onSuccess: refresh,
    }),
    updateLocation: useMutation({
      mutationFn: (v: input.UpdateLocationInput) =>
        action.updateLocation(targetHint, v),
      retry: false,
      onSuccess: refreshUpdate,
      scope: { id: `location:${scopeId}` },
    }),
    deleteLocation: useMutation({
      mutationFn: (v: input.DeleteLocationInput) =>
        action.deleteLocation(targetHint, v),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
