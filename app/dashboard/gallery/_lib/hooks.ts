"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionResult } from "@/lib/forms/action-result";
import { fetchGalleryAggregate } from "./api";
import { galleryKeys } from "./keys";
import type { GalleryAggregate } from "./queries";
import * as action from "../actions";
import type * as input from "./schemas";

export function useGalleryAggregate(seed: {
  scopeId: string;
  targetHint: string | undefined;
  data: GalleryAggregate;
  updatedAt: number;
}) {
  return useQuery({
    queryKey: galleryKeys.aggregate(seed.scopeId),
    queryFn: () => fetchGalleryAggregate(seed.targetHint),
    initialData: seed.data,
    initialDataUpdatedAt: seed.updatedAt,
  });
}

export function useGalleryMutations({
  scopeId,
  targetHint,
}: {
  scopeId: string;
  targetHint: string | undefined;
}) {
  const client = useQueryClient();
  const queryKey = galleryKeys.aggregate(scopeId);
  const refresh = async <T>(result: ActionResult<T>) => {
    if (!result.ok) return;
    await client.invalidateQueries({ queryKey });
    await client.refetchQueries({ queryKey });
  };
  return {
    createDental: useMutation({
      mutationFn: (value: input.CreateDentalGalleryInput) =>
        action.createDentalGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateDental: useMutation({
      mutationFn: (value: input.UpdateDentalGalleryInput) =>
        action.updateDentalGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteDental: useMutation({
      mutationFn: (value: input.DeleteDentalGalleryInput) =>
        action.deleteDentalGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderDental: useMutation({
      mutationFn: (value: input.ReorderDentalGalleriesInput) =>
        action.reorderDentalGalleries(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    createGeneral: useMutation({
      mutationFn: (value: input.CreateGeneralGalleryInput) =>
        action.createGeneralGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    updateGeneral: useMutation({
      mutationFn: (value: input.UpdateGeneralGalleryInput) =>
        action.updateGeneralGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    deleteGeneral: useMutation({
      mutationFn: (value: input.DeleteGeneralGalleryInput) =>
        action.deleteGeneralGallery(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
    reorderGeneral: useMutation({
      mutationFn: (value: input.ReorderGeneralGalleriesInput) =>
        action.reorderGeneralGalleries(targetHint, value),
      retry: false,
      onSuccess: refresh,
    }),
  };
}
